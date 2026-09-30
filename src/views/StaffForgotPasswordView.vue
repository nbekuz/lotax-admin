<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import BrandMark from '@/components/BrandMark.vue'
import ThemeMenuButton from '@/components/ThemeMenuButton.vue'
import { API_BASE_URL } from '@/config'
import {
  staffGhostToken,
  staffPasswordResetApi,
} from '@/api/staffPasswordReset'
import { formatChatTime, groupMessagesByDate } from '@/utils/chatDate'
import { extractErrorMessage } from '@/utils/labels'
import type { StaffPasswordResetMessage } from '@/types/staffPasswordReset'

const router = useRouter()
const email = ref('')
const loading = ref(false)
const sending = ref(false)
const roomId = ref<string | null>(sessionStorage.getItem('lotax_staff_ghost_room'))
const adminId = ref<string | null>(sessionStorage.getItem('lotax_staff_ghost_admin'))
const messages = ref<StaffPasswordResetMessage[]>([])
const groupedMessages = computed(() => groupMessagesByDate(messages.value))
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
  if (disposed || pollTimer != null || !roomId.value) return
  void loadMessages()
  pollTimer = setInterval(() => {
    void loadMessages()
  }, 2000)
}

function senderLabel(item: StaffPasswordResetMessage) {
  const name = item.sender_name?.trim() || 'Сотрудник'
  const role = item.sender_role?.trim()
  return role ? `${name} · ${role}` : name
}

async function loadMessages() {
  if (!roomId.value || !staffGhostToken.get()) return
  try {
    const { data } = await staffPasswordResetApi.ghostMessages(roomId.value)
    const incoming = data.items ?? []
    const known = new Set(incoming.map((item) => item.id))
    const pending = messages.value.filter((item) => !known.has(item.id))
    messages.value = pending.length ? [...incoming, ...pending] : incoming
  } catch {
    /* next poll retries; a failed GET must not clear the tape */
  }
}

function connectWs() {
  const token = staffGhostToken.get()
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
        void loadMessages()
        return
      }
      const room = payload.room_id || payload.conversation_id
      if (!room || room !== roomId.value) return
      if (name === 'staff_password_reset_message' || name === 'staff_password_reset_closed') {
        void loadMessages()
      }
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

async function start() {
  if (!email.value.trim()) {
    message.warning('Введите email')
    return
  }
  loading.value = true
  try {
    const { data } = await staffPasswordResetApi.openSession(email.value.trim())
    staffGhostToken.set(data.access_token)
    adminId.value = data.admin_id
    sessionStorage.setItem('lotax_staff_ghost_admin', data.admin_id)
    const room = await staffPasswordResetApi.openRoom()
    roomId.value = room.data.id
    sessionStorage.setItem('lotax_staff_ghost_room', room.data.id)
    await loadMessages()
    connectWs()
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось открыть чат'))
  } finally {
    loading.value = false
  }
}

async function send(body: string) {
  if (!roomId.value) return
  sending.value = true
  try {
    const { data } = await staffPasswordResetApi.ghostSend(roomId.value, body)
    if (!messages.value.some((item) => item.id === data.id)) {
      messages.value = [...messages.value, data]
    }
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  if (!roomId.value || !staffGhostToken.get()) return
  void staffPasswordResetApi
    .ghostMessages(roomId.value)
    .then(({ data }) => {
      messages.value = data.items ?? []
      connectWs()
    })
    .catch(() => {
      roomId.value = null
    })
})

onUnmounted(() => {
  disposed = true
  stopPolling()
  const current = socket
  socket = null
  current?.close()
})
</script>

<template>
  <div class="forgot-page">
    <div class="forgot-top">
      <button type="button" class="forgot-back" @click="router.push('/login')">
        ← Ко входу
      </button>
      <ThemeMenuButton />
    </div>

    <BrandMark :size="56" layout="stack">
      <p class="mt-2 text-[14px] text-ink-muted">Восстановление пароля</p>
    </BrandMark>

    <div v-if="!roomId" class="lotax-card p-5">
      <p class="mb-4 text-[14px] text-ink-muted">
        Напишите super-admin. Пароль ставит только он — в чате видно, кто ответил.
      </p>
      <a-input
        v-model:value="email"
        size="large"
        type="email"
        placeholder="email@example.com"
        @press-enter="start"
      />
      <a-button
        type="primary"
        class="lotax-btn-primary !mt-3 !h-11"
        block
        :loading="loading"
        @click="start"
      >
        Открыть чат
      </a-button>
    </div>

    <div v-else class="forgot-chat lotax-card">
      <div class="forgot-chat__messages">
        <template v-for="group in groupedMessages" :key="group.key">
          <div class="chat-day">{{ group.label }}</div>
          <div
            v-for="item in group.items"
            :key="item.id"
            class="forgot-bubble"
            :class="item.sender_admin_id === adminId ? 'forgot-bubble--mine' : 'forgot-bubble--theirs'"
          >
            <p class="forgot-bubble__who">{{ senderLabel(item) }}</p>
            <p class="forgot-bubble__body">{{ item.body }}</p>
            <p class="forgot-bubble__time">{{ formatChatTime(item.created_at) }}</p>
          </div>
        </template>
        <p v-if="!messages.length" class="text-[14px] text-ink-muted">Напишите, что забыли пароль.</p>
      </div>
      <ChatComposer :sending="sending" @send="send" />
    </div>
  </div>
</template>

<style scoped>
.forgot-page {
  display: flex;
  width: 100%;
  max-width: 32rem;
  min-height: 100dvh;
  margin: 0 auto;
  flex-direction: column;
  gap: 16px;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
}

.forgot-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.forgot-back {
  border: 0;
  background: transparent;
  padding: 8px 0;
  color: var(--lotax-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  appearance: none;
}

.forgot-chat {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.forgot-chat__messages {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 16px;
}

.chat-day {
  margin: 2px auto 2px;
  width: fit-content;
  border-radius: 999px;
  background: var(--lotax-chip);
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--lotax-text-secondary);
}

.forgot-bubble {
  max-width: 85%;
  border-radius: 16px;
  padding: 8px 12px;
  overflow-wrap: anywhere;
}

.forgot-bubble--mine {
  margin-left: auto;
  background: var(--lotax-primary-soft);
}

.forgot-bubble--theirs {
  margin-right: auto;
  background: var(--lotax-chip);
}

.forgot-bubble__who {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--lotax-text-secondary);
}

.forgot-bubble__body {
  margin: 2px 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 14px;
  line-height: 1.4;
  color: var(--lotax-text);
}

.forgot-bubble__time {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--lotax-text-secondary);
}
</style>
