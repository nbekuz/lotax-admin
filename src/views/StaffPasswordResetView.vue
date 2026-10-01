<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  CloseCircleOutlined,
  KeyOutlined,
  LockOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import ChatMessageList from '@/components/chat/ChatMessageList.vue'
import SetStaffPasswordModal from '@/components/SetStaffPasswordModal.vue'
import { API_BASE_URL } from '@/config'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useAuthStore } from '@/stores/auth'
import { useStaffPasswordResetStore } from '@/stores/staffPasswordReset'
import { tokenStorage } from '@/utils/tokenStorage'
import { formatChatListTime } from '@/utils/chatDate'
import { extractErrorMessage, roleLabel } from '@/utils/labels'
import type { AdminRole } from '@/types/api'
import type { ChatMessage } from '@/types/chat'
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
  const roleText = role ? roleLabel[role as AdminRole] || role : ''
  return roleText ? `${name} · ${roleText}` : name
}

function roomName(room: StaffPasswordResetRoom) {
  return room.target_display_name?.trim() || room.target_email || 'Сотрудник'
}

function roomRole(room: StaffPasswordResetRoom) {
  return roleLabel[room.target_role as AdminRole] || room.target_role || ''
}

function isMine(item: StaffPasswordResetMessage) {
  return item.sender_admin_id === auth.admin?.id
}

const threadMessages = computed<ChatMessage[]>(() =>
  store.messages.map((item) => ({
    id: item.id,
    conversation_id: item.room_id,
    body: item.body,
    created_at: item.created_at,
    sender_admin_id: item.sender_admin_id ?? '',
    sender_type: isMine(item) ? 'initiator' : 'receiver',
    sender_name: senderLabel(item),
    is_mine: isMine(item),
  })),
)

const roomSubtitle = computed(() => {
  const room = store.activeRoom
  if (!room) return ''
  if (room.status === 'closed') return 'Комната закрыта'
  const written = store.messages.find((item) => !isMine(item))?.body?.trim()
  return written || 'Заявка на смену пароля'
})

const filterOptions = [
  { value: 'open', label: 'Открытые' },
  { value: 'closed', label: 'Закрытые' },
  { value: 'all', label: 'Все' },
] as const

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

async function onFilterChange(status: 'open' | 'closed' | 'all') {
  try {
    await store.setStatusFilter(status)
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function confirmCloseRoom() {
  Modal.confirm({
    title: 'Закрыть комнату?',
    content: 'Сотрудник больше не сможет писать в эту заявку. Новый запрос откроет новую комнату.',
    okText: 'Закрыть',
    cancelText: 'Отмена',
    okButtonProps: { danger: true },
    centered: true,
    async onOk() {
      try {
        await store.closeActive()
        message.success('Комната закрыта')
      } catch (e) {
        message.error(extractErrorMessage(e, 'Не удалось закрыть комнату'))
        throw e
      }
    },
  })
}

watch(
  () => route.query.room,
  (room) => {
    if (typeof room === 'string' && room && room !== store.activeRoomId) {
      void store.selectRoom(room)
    }
  },
)

onMounted(() => {
  store.setViewing(true)
  void bootstrap()
})
onUnmounted(() => {
  store.setViewing(false)
  disposed = true
  stopPolling()
  const current = socket
  socket = null
  current?.close()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-2">
    <div class="lotax-card flex min-h-0 flex-1 overflow-hidden !p-0 !shadow-sm">
      <div
        v-if="showList"
        class="h-full min-h-0 border-r border-line"
        :class="isMobile ? 'w-full' : 'w-[340px] shrink-0 xl:w-[380px]'"
      >
        <div class="flex h-full min-h-0 flex-col bg-surface-card">
          <div class="flex min-h-[64px] items-center gap-2 border-b border-line px-4 py-3">
            <div class="min-w-0 flex-1">
              <div class="text-[17px] font-semibold tracking-tight text-ink">Заявки</div>
            </div>
            <a-tooltip v-if="!isMobile" title="Обновить">
              <a-button type="text" class="!h-9 !w-9" @click="bootstrap">
                <template #icon><ReloadOutlined /></template>
              </a-button>
            </a-tooltip>
          </div>

          <div class="border-b border-line px-3 py-2">
            <a-segmented
              :value="store.statusFilter"
              block
              :options="[...filterOptions]"
              @change="(v: string | number) => onFilterChange(String(v) as 'open' | 'closed' | 'all')"
            />
          </div>

          <div
            v-if="store.loadingRooms && !store.rooms.length"
            class="flex flex-1 items-center justify-center"
          >
            <a-spin />
          </div>
          <div
            v-else-if="!store.rooms.length"
            class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
          >
            <div class="text-[15px] font-medium text-ink">Нет заявок</div>
            <p class="text-[13px] leading-relaxed text-ink-muted">
              Когда сотрудник напишет, что забыл пароль, текст заявки появится здесь
            </p>
          </div>
          <div v-else class="pr-sidebar__list min-h-0 flex-1 overflow-y-auto">
            <button
              v-for="room in store.rooms"
              :key="room.id"
              type="button"
              class="pr-sidebar__item"
              :class="{ 'pr-sidebar__item--active': store.activeRoomId === room.id }"
              @click="store.selectRoom(room.id)"
            >
              <div class="pr-sidebar__avatar">
                <LockOutlined class="text-[22px]" />
              </div>
              <div class="pr-sidebar__content">
                <div class="pr-sidebar__top">
                  <span class="pr-sidebar__name">{{ roomName(room) }}</span>
                  <span v-if="room.last_message_at || room.created_at" class="pr-sidebar__time">
                    {{ formatChatListTime(room.last_message_at || room.created_at) }}
                  </span>
                </div>
                <div class="pr-sidebar__bottom">
                  <span
                    class="pr-sidebar__preview"
                    :class="{ 'pr-sidebar__preview--empty': !room.last_message_preview?.trim() }"
                  >
                    {{ room.last_message_preview?.trim() || 'Нет сообщений' }}
                  </span>
                </div>
                <div class="pr-sidebar__role">{{ roomRole(room) }}</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showThread"
        class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface"
      >
        <div
          v-if="store.activeRoom"
          class="flex min-h-[64px] shrink-0 items-center gap-3 border-b border-line bg-surface-card px-4 py-3"
        >
          <a-button
            v-if="isMobile"
            type="text"
            class="!h-9 !w-9 !px-0"
            aria-label="Назад"
            @click="backToList"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </a-button>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <UserOutlined />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[16px] font-semibold text-ink">{{ roomTitle }}</div>
            <div class="truncate text-[13px] text-ink-muted">{{ roomSubtitle }}</div>
          </div>
          <div class="flex shrink-0 flex-wrap items-center gap-2">
            <a-button type="primary" size="small" @click="passwordOpen = true">
              <template #icon><KeyOutlined /></template>
              Задать пароль
            </a-button>
            <a-button
              v-if="store.activeRoom.status !== 'closed'"
              size="small"
              danger
              @click="confirmCloseRoom"
            >
              <template #icon><CloseCircleOutlined /></template>
              Закрыть комнату
            </a-button>
          </div>
        </div>

        <div
          v-else
          class="flex flex-1 items-center justify-center px-6 text-center text-[15px] text-ink-muted"
        >
          Выберите заявку слева
        </div>

        <template v-if="store.activeRoom">
          <ChatMessageList
            :messages="threadMessages"
            :loading="store.loadingMessages"
            :has-more="false"
          />
          <ChatComposer
            :sending="sending"
            :disabled="store.activeRoom.status === 'closed'"
            @send="send"
          />
        </template>
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
.pr-sidebar__list {
  padding: 8px;
}

.pr-sidebar__item {
  appearance: none;
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  margin: 0 0 4px;
  padding: 10px 12px;
  border: none;
  border-radius: 14px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 120ms ease;
  -webkit-tap-highlight-color: transparent;
}

.pr-sidebar__item:last-child {
  margin-bottom: 0;
}

.pr-sidebar__item:hover {
  background: rgba(17, 17, 17, 0.04);
}

.pr-sidebar__item--active,
.pr-sidebar__item--active:hover {
  background: var(--lotax-primary-soft);
}

.pr-sidebar__item:focus {
  outline: none;
  box-shadow: none;
}

.pr-sidebar__item:focus-visible {
  outline: 2px solid var(--lotax-primary);
  outline-offset: 0;
}

.pr-sidebar__avatar {
  display: flex;
  height: 48px;
  width: 48px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--lotax-primary-soft);
  color: var(--lotax-primary);
}

.pr-sidebar__content {
  min-width: 0;
  flex: 1;
  padding: 1px 0;
}

.pr-sidebar__top,
.pr-sidebar__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pr-sidebar__bottom {
  margin-top: 4px;
}

.pr-sidebar__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--lotax-text);
}

.pr-sidebar__time {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1.2;
  color: var(--lotax-text-tertiary);
}

.pr-sidebar__preview {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  line-height: 1.25;
  color: var(--lotax-text-secondary);
}

.pr-sidebar__preview--empty {
  font-style: italic;
  color: var(--lotax-text-tertiary);
}

.pr-sidebar__role {
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 1.2;
  color: var(--lotax-text-tertiary);
}
</style>
