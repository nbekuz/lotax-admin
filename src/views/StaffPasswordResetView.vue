<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { KeyOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import SetStaffPasswordModal from '@/components/SetStaffPasswordModal.vue'
import PageHeader from '@/components/PageHeader.vue'
import { API_BASE_URL } from '@/config'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useAuthStore } from '@/stores/auth'
import { useStaffPasswordResetStore } from '@/stores/staffPasswordReset'
import { tokenStorage } from '@/utils/tokenStorage'
import { extractErrorMessage, roleLabel } from '@/utils/labels'
import type { AdminRole } from '@/types/api'
import type { StaffPasswordResetMessage, StaffPasswordResetRoom } from '@/types/staffPasswordReset'

const auth = useAuthStore()
const route = useRoute()
const { isMobile } = useBreakpoint()
const store = useStaffPasswordResetStore()
const sending = ref(false)
const passwordOpen = ref(false)
let socket: WebSocket | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let disposed = false

function stopPolling() {
  if (pollTimer != null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startPolling() {
  if (disposed || pollTimer != null) return
  void store.pollSnapshot()
  pollTimer = setInterval(() => {
    void store.pollSnapshot()
  }, 2000)
}

const roomTitle = computed(() => {
  const room = store.activeRoom
  if (!room) return 'Чат'
  return room.target_display_name?.trim() || room.target_email || 'Сотрудник'
})

function senderLabel(item: StaffPasswordResetMessage) {
  const name = item.sender_name?.trim() || 'Сотрудник'
  const role = item.sender_role?.trim()
  return role ? `${name} · ${role}` : name
}

function roomName(room: StaffPasswordResetRoom) {
  return room.target_display_name?.trim() || room.target_email || 'Сотрудник'
}

function roomRole(room: StaffPasswordResetRoom) {
  return roleLabel[room.target_role as AdminRole] || room.target_role || ''
}

function roomStatusText(status: string) {
  if (status === 'open' || status === 'active') return 'Активен'
  if (status === 'closed') return 'Закрыт'
  return status
}

function roomStatusClass(status: string) {
  if (status === 'open' || status === 'active') return 'lotax-badge--success'
  if (status === 'closed') return 'lotax-badge--muted'
  return 'lotax-badge--warning'
}

function isMine(item: StaffPasswordResetMessage) {
  return item.sender_admin_id === auth.admin?.id
}

const showList = computed(() => !isMobile.value || !store.activeRoomId)
const showThread = computed(() => !isMobile.value || Boolean(store.activeRoomId))

function backToList() {
  store.activeRoomId = null
  store.messages = []
}

function connectWs() {
  const token = tokenStorage.getAccess()
  startPolling()
  if (!token) return
  const url = `${API_BASE_URL.replace(/^http/, 'ws')}/chat/ws?token=${encodeURIComponent(token)}`
  const previous = socket
  socket = null
  previous?.close()
  const next = new WebSocket(url)
  socket = next
  next.onmessage = (event) => {
    if (socket !== next) return
    try {
      const payload = JSON.parse(String(event.data)) as {
        type?: string
        event?: string
        room_id?: string
        conversation_id?: string
      }
      const name = payload.type ?? payload.event
      if (name === 'ping') return
      if (name === 'connected') {
        stopPolling()
        void store.pollSnapshot()
        return
      }
      store.handleStreamEvent(payload)
    } catch {
      /* ignore */
    }
  }
  next.onerror = () => {
    if (socket !== next) return
    startPolling()
  }
  next.onclose = () => {
    if (disposed || socket !== next) return
    startPolling()
  }
}

async function bootstrap() {
  try {
    await store.fetchRooms()
    const requested = route.query.room
    if (typeof requested === 'string' && requested) {
      await store.selectRoom(requested)
    } else if (!isMobile.value && store.rooms[0] && !store.activeRoomId) {
      await store.selectRoom(store.rooms[0].id)
    }
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    connectWs()
  }
}

async function onPasswordSaved(roomId: string) {
  await store.fetchRooms()
  if (roomId) await store.selectRoom(roomId)
}

async function send(body: string) {
  sending.value = true
  try {
    await store.sendMessage(body)
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    sending.value = false
  }
}

async function closeRoom() {
  try {
    await store.closeActive()
    message.success('Комната закрыта')
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

watch(
  () => route.query.room,
  (room) => {
    if (typeof room === 'string' && room && room !== store.activeRoomId) {
      void store.selectRoom(room)
    }
  },
)

onMounted(bootstrap)
onUnmounted(() => {
  disposed = true
  stopPolling()
  const current = socket
  socket = null
  current?.close()
})
</script>

<template>
  <div class="staff-page flex h-full min-h-0 flex-col">
    <PageHeader v-if="!isMobile" class="staff-page-head shrink-0" title="Пароли сотрудников">
      <template #actions>
        <a-button class="lotax-btn-secondary" @click="bootstrap">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
      </template>
    </PageHeader>

    <div class="staff-layout">
      <div v-if="showList" class="staff-list lotax-card">
        <button
          v-for="room in store.rooms"
          :key="room.id"
          type="button"
          class="staff-room"
          :class="{ 'is-active': store.activeRoomId === room.id }"
          @click="store.selectRoom(room.id)"
        >
          <span class="staff-room__name">{{ roomName(room) }}</span>
          <span class="staff-room__meta">
            {{ roomRole(room) }}
            · {{ room.last_message_preview || 'Нет сообщений' }}
          </span>
          <span class="staff-room__role">{{ roomRole(room) || 'Сотрудник' }}</span>
          <span v-if="room.last_message_preview" class="staff-room__preview">
            {{ room.last_message_preview }}
          </span>
          <span class="lotax-badge staff-room__status" :class="roomStatusClass(room.status)">
            {{ roomStatusText(room.status) }}
          </span>
        </button>
        <p v-if="!store.rooms.length" class="staff-list__empty">Открытых запросов нет</p>
      </div>

      <div v-if="showThread" class="staff-thread lotax-card">
        <div v-if="store.activeRoom" class="staff-thread__head">
          <div class="staff-thread__identity">
            <button
              v-if="isMobile"
              type="button"
              class="staff-back"
              aria-label="Назад"
              @click="backToList"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div class="min-w-0">
              <p class="staff-thread__title">{{ roomTitle }}</p>
              <p class="staff-thread__email">{{ store.activeRoom.target_email }}</p>
            </div>
          </div>
          <div class="staff-thread__actions">
            <a-button class="lotax-btn-secondary" @click="passwordOpen = true">
              <template #icon><KeyOutlined /></template>
              Пароль
            </a-button>
            <a-button v-if="store.activeRoom.status !== 'closed'" @click="closeRoom">Закрыть</a-button>
          </div>
        </div>
        <div class="staff-thread__messages">
          <div
            v-for="item in store.messages"
            :key="item.id"
            class="staff-msg"
            :class="isMine(item) ? 'staff-msg--mine' : 'staff-msg--theirs'"
          >
            <p class="staff-msg__who">{{ senderLabel(item) }}</p>
            <p class="staff-msg__body">{{ item.body }}</p>
            <p class="staff-msg__time">{{ dayjs(item.created_at).format('DD.MM HH:mm') }}</p>
          </div>
          <p v-if="store.activeRoom && !store.messages.length" class="staff-thread__hint">
            Сообщений пока нет
          </p>
          <p v-if="!store.activeRoom" class="staff-thread__hint">
            <span class="staff-hint-desktop">Выберите запрос слева</span>
            <span class="staff-hint-mobile">Выберите запрос</span>
          </p>
        </div>
        <ChatComposer
          v-if="store.activeRoom && store.activeRoom.status !== 'closed'"
          :sending="sending"
          @send="send"
        />
      </div>
    </div>

    <SetStaffPasswordModal
      v-model:open="passwordOpen"
      :admin-id="store.activeRoom?.target_admin_id ?? null"
      :label="roomTitle"
      @saved="onPasswordSaved"
    />
  </div>
</template>

<style scoped>
.staff-page {
  gap: 12px;
}

.staff-layout {
  display: flex;
  min-height: 0;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

.staff-list {
  flex: 0 1 auto;
  width: 100%;
  max-height: 38%;
  overflow: auto;
  padding: 8px;
}

.staff-list__empty {
  margin: 0;
  padding: 12px;
  font-size: 13px;
  color: var(--lotax-text-secondary);
}

.staff-room {
  display: flex;
  width: 100%;
  min-height: 44px;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin: 0 0 8px;
  padding: 16px;
  border: 0;
  border-radius: 12px;
  background: var(--lotax-hover);
  text-align: left;
  cursor: pointer;
  appearance: none;
}

.staff-room:last-child {
  margin-bottom: 0;
}

.staff-room.is-active {
  background: var(--lotax-primary-soft);
}

.staff-room__name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--lotax-text);
}

.staff-room__meta {
  display: none;
}

.staff-room__role,
.staff-room__preview {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1.3;
  color: var(--lotax-text-secondary);
}

.staff-room__preview {
  font-size: 12px;
}

.staff-room__status {
  margin-top: 4px;
}

.staff-thread {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.staff-thread__head {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  border-bottom: 1px solid var(--lotax-border);
  padding: 12px 16px;
}

.staff-thread__identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
}

.staff-back {
  display: inline-flex;
  height: 36px;
  width: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--lotax-text);
  cursor: pointer;
}

.staff-thread__title {
  margin: 0;
  overflow-wrap: anywhere;
  font-weight: 600;
  color: var(--lotax-text);
}

.staff-thread__email {
  margin: 2px 0 0;
  overflow-wrap: anywhere;
  font-size: 12px;
  color: var(--lotax-text-secondary);
}

.staff-thread__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.staff-thread__actions :deep(.ant-btn) {
  min-height: 44px;
}

.staff-thread__messages {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 12px;
}

.staff-msg {
  max-width: 85%;
  border-radius: 16px;
  padding: 8px 12px;
  overflow-wrap: anywhere;
}

.staff-msg--mine {
  margin-left: auto;
  background: var(--lotax-primary-soft);
}

.staff-msg--theirs {
  margin-right: auto;
  background: var(--lotax-chip);
}

.staff-msg__who {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--lotax-text-secondary);
}

.staff-msg__body {
  margin: 2px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 14px;
  line-height: 1.4;
  color: var(--lotax-text);
}

.staff-msg__time {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--lotax-text-secondary);
}

.staff-thread__hint {
  margin: 0;
  font-size: 14px;
  color: var(--lotax-text-secondary);
}

.staff-hint-desktop {
  display: none;
}

@media (max-width: 375px) {
  .staff-thread__actions {
    flex-direction: column;
  }

  .staff-thread__actions :deep(.ant-btn) {
    width: 100%;
  }
}

@media (max-width: 767px) {
  .staff-list,
  .staff-thread {
    flex: 1 1 auto;
    max-height: none;
    min-height: 0;
    height: 100%;
  }

  .staff-page-head {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .staff-page-head :deep(.ant-btn) {
    min-height: 44px;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .staff-layout {
    flex-direction: row;
    align-items: stretch;
  }

  .staff-list {
    width: 220px;
    flex: none;
    max-height: none;
    align-self: stretch;
  }
}

@media (min-width: 1024px) {
  .staff-layout {
    flex-direction: row;
    align-items: stretch;
  }

  .staff-list {
    width: 280px;
    flex: none;
    max-height: none;
    align-self: stretch;
    padding: 8px;
  }

  .staff-room {
    gap: 0;
    margin: 0;
    padding: 8px 12px;
    border-radius: 12px;
    background: transparent;
  }

  .staff-room.is-active {
    background: var(--lotax-primary-soft);
  }

  .staff-room__name {
    font-size: 14px;
    line-height: 1.25;
  }

  .staff-room__meta {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    line-height: 1.3;
    color: var(--lotax-text-secondary);
  }

  .staff-room__role,
  .staff-room__preview,
  .staff-room__status {
    display: none;
  }

  .staff-thread__head {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 16px;
  }

  .staff-thread__actions {
    flex-wrap: nowrap;
  }

  .staff-thread__actions :deep(.ant-btn) {
    min-height: 0;
    width: auto;
  }

  .staff-thread__messages {
    gap: 12px;
    padding: 16px;
  }

  .staff-msg {
    max-width: 80%;
    padding: 8px 12px;
  }

  .staff-hint-desktop {
    display: inline;
  }

  .staff-hint-mobile {
    display: none;
  }
}
</style>

