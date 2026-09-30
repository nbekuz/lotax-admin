<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { KeyOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import SetStaffPasswordModal from '@/components/SetStaffPasswordModal.vue'
import PageHeader from '@/components/PageHeader.vue'
import { API_BASE_URL } from '@/config'
import { useAuthStore } from '@/stores/auth'
import { useStaffPasswordResetStore } from '@/stores/staffPasswordReset'
import { tokenStorage } from '@/utils/tokenStorage'
import { extractErrorMessage, roleLabel } from '@/utils/labels'
import type { AdminRole } from '@/types/api'
import type { StaffPasswordResetMessage } from '@/types/staffPasswordReset'

const auth = useAuthStore()
const store = useStaffPasswordResetStore()
const sending = ref(false)
const passwordOpen = ref(false)
let socket: WebSocket | null = null

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

function isMine(item: StaffPasswordResetMessage) {
  return item.sender_admin_id === auth.admin?.id
}

function connectWs() {
  const token = tokenStorage.getAccess()
  if (!token) return
  const url = `${API_BASE_URL.replace(/^http/, 'ws')}/chat/ws?token=${encodeURIComponent(token)}`
  socket?.close()
  socket = new WebSocket(url)
  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(String(event.data)) as { type?: string; event?: string; room_id?: string }
      store.handleStreamEvent(payload)
    } catch {
      /* ignore */
    }
  }
}

async function bootstrap() {
  try {
    await store.fetchRooms()
    if (store.rooms[0] && !store.activeRoomId) {
      await store.selectRoom(store.rooms[0].id)
    }
    connectWs()
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
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

onMounted(bootstrap)
onUnmounted(() => socket?.close())
</script>

<template>
  <div class="flex flex-col gap-4">
    <PageHeader
      title="Пароли сотрудников"
      subtitle="Чат «забыл пароль». Пароль ставит только супер-админ. В сообщении видно, кто написал."
    >
      <template #actions>
        <a-button class="lotax-btn-secondary" @click="bootstrap">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
      </template>
    </PageHeader>

    <div class="grid min-h-[520px] gap-3 lg:grid-cols-[280px_1fr]">
      <div class="lotax-card !p-2">
        <button
          v-for="room in store.rooms"
          :key="room.id"
          type="button"
          class="w-full rounded-xl px-3 py-2 text-left"
          :class="store.activeRoomId === room.id ? 'bg-brand-soft' : ''"
          @click="store.selectRoom(room.id)"
        >
          <p class="truncate text-[14px] font-semibold text-ink">
            {{ room.target_display_name || room.target_email || 'Сотрудник' }}
          </p>
          <p class="truncate text-[12px] text-ink-muted">
            {{ roleLabel[room.target_role as AdminRole] || room.target_role || '' }}
            · {{ room.last_message_preview || 'Нет сообщений' }}
          </p>
        </button>
        <p v-if="!store.rooms.length" class="p-3 text-[13px] text-ink-muted">Открытых запросов нет</p>
      </div>

      <div class="lotax-card flex min-h-[420px] flex-col !p-0">
        <div v-if="store.activeRoom" class="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <p class="font-semibold text-ink">{{ roomTitle }}</p>
            <p class="text-[12px] text-ink-muted">{{ store.activeRoom.target_email }}</p>
          </div>
          <div class="flex gap-2">
            <a-button class="lotax-btn-secondary" @click="passwordOpen = true">
              <template #icon><KeyOutlined /></template>
              Пароль
            </a-button>
            <a-button v-if="store.activeRoom.status !== 'closed'" @click="closeRoom">Закрыть</a-button>
          </div>
        </div>
        <div class="flex-1 space-y-3 overflow-y-auto p-4">
          <div
            v-for="item in store.messages"
            :key="item.id"
            class="max-w-[80%] rounded-2xl px-3 py-2"
            :class="isMine(item) ? 'ml-auto bg-brand-soft' : 'bg-chip'"
          >
            <p class="text-[12px] font-semibold text-ink-muted">{{ senderLabel(item) }}</p>
            <p class="whitespace-pre-wrap text-[14px] text-ink">{{ item.body }}</p>
            <p class="mt-1 text-[11px] text-ink-muted">{{ dayjs(item.created_at).format('DD.MM HH:mm') }}</p>
          </div>
          <p v-if="store.activeRoom && !store.messages.length" class="text-[14px] text-ink-muted">
            Сообщений пока нет
          </p>
          <p v-if="!store.activeRoom" class="text-[14px] text-ink-muted">Выберите запрос слева</p>
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
      @saved="store.fetchRooms()"
    />
  </div>
</template>
