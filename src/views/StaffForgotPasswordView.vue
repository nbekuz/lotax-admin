<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import BrandMark from '@/components/BrandMark.vue'
import { API_BASE_URL } from '@/config'
import {
  staffGhostToken,
  staffPasswordResetApi,
} from '@/api/staffPasswordReset'
import { extractErrorMessage } from '@/utils/labels'
import type { StaffPasswordResetMessage } from '@/types/staffPasswordReset'

const router = useRouter()
const email = ref('')
const loading = ref(false)
const sending = ref(false)
const roomId = ref<string | null>(sessionStorage.getItem('lotax_staff_ghost_room'))
const adminId = ref<string | null>(sessionStorage.getItem('lotax_staff_ghost_admin'))
const messages = ref<StaffPasswordResetMessage[]>([])
let socket: WebSocket | null = null

function senderLabel(item: StaffPasswordResetMessage) {
  const name = item.sender_name?.trim() || 'Сотрудник'
  const role = item.sender_role?.trim()
  return role ? `${name} · ${role}` : name
}

async function loadMessages() {
  if (!roomId.value || !staffGhostToken.get()) return
  const { data } = await staffPasswordResetApi.ghostMessages(roomId.value)
  messages.value = data.items ?? []
}

function connectWs() {
  const token = staffGhostToken.get()
  if (!token) return
  const url = `${API_BASE_URL.replace(/^http/, 'ws')}/chat/ws?token=${encodeURIComponent(token)}`
  socket?.close()
  socket = new WebSocket(url)
  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(String(event.data)) as {
        type?: string
        event?: string
        room_id?: string
      }
      const name = payload.type ?? payload.event
      if (name === 'staff_password_reset_message' && payload.room_id === roomId.value) {
        void loadMessages()
      }
    } catch {
      /* ignore */
    }
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
  if (roomId.value && staffGhostToken.get()) {
    void loadMessages().then(connectWs).catch(() => {
      roomId.value = null
    })
  }
})

onUnmounted(() => {
  socket?.close()
})
</script>

<template>
  <div class="mx-auto flex min-h-full w-full max-w-lg flex-col gap-4 p-4 md:py-10">
    <button type="button" class="w-fit text-[14px] text-brand" @click="router.push('/login')">
      ← Ко входу
    </button>
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

    <div v-else class="lotax-card flex min-h-[420px] flex-col !p-0">
      <div class="flex-1 space-y-3 overflow-y-auto p-4">
        <div
          v-for="item in messages"
          :key="item.id"
          class="max-w-[85%] rounded-2xl px-3 py-2"
          :class="item.sender_admin_id === adminId ? 'ml-auto bg-brand-soft' : 'bg-slate-100'"
        >
          <p class="text-[12px] font-semibold text-ink-muted">{{ senderLabel(item) }}</p>
          <p class="whitespace-pre-wrap text-[14px] text-ink">{{ item.body }}</p>
          <p class="mt-1 text-[11px] text-ink-muted">{{ dayjs(item.created_at).format('DD.MM HH:mm') }}</p>
        </div>
        <p v-if="!messages.length" class="text-[14px] text-ink-muted">Напишите, что забыли пароль.</p>
      </div>
      <ChatComposer :sending="sending" @send="send" />
    </div>
  </div>
</template>
