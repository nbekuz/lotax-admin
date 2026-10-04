import { defineStore } from 'pinia'
import { API_BASE_URL } from '@/config'
import {
  driverSupportApi,
  type DriverSupportConversation,
  type DriverSupportMessage,
} from '@/api/driverSupport'
import { tokenStorage } from '@/utils/tokenStorage'

function mine(message: DriverSupportMessage): boolean {
  if (typeof message.is_mine === 'boolean') return message.is_mine
  return message.sender_role === 'director'
}

function normalize(message: DriverSupportMessage): DriverSupportMessage {
  return { ...message, is_mine: mine(message) }
}

function byTime(a: DriverSupportMessage, b: DriverSupportMessage) {
  return a.created_at.localeCompare(b.created_at)
}

function mergeMessages(current: DriverSupportMessage[], incoming: DriverSupportMessage[]) {
  const map = new Map<string, DriverSupportMessage>()
  for (const item of [...current, ...incoming]) {
    if (!item.id) continue
    map.set(item.id, normalize(item))
  }
  return [...map.values()].sort(byTime)
}

export const useDriverSupportStore = defineStore('driverSupport', {
  state: () => ({
    inbox: [] as DriverSupportConversation[],
    messages: [] as DriverSupportMessage[],
    activeId: null as string | null,
    hasMore: false,
    totalUnread: 0,
    loadingInbox: false,
    loadingMessages: false,
    sending: false,
    socketOpen: false,
    socket: null as WebSocket | null,
    pollTimer: null as ReturnType<typeof setInterval> | null,
    disposed: false,
  }),

  getters: {
    active(state): DriverSupportConversation | null {
      if (!state.activeId) return null
      return state.inbox.find((item) => item.id === state.activeId) ?? null
    },
  },

  actions: {
    async fetchInbox() {
      this.loadingInbox = true
      try {
        const items = await driverSupportApi.inbox()
        this.inbox = [...items].sort((a, b) =>
          (b.last_message_at || b.created_at).localeCompare(a.last_message_at || a.created_at),
        )
      } finally {
        this.loadingInbox = false
      }
    },

    async fetchNotifications() {
      const data = await driverSupportApi.notifications()
      this.totalUnread = data.total_unread
    },

    async loadMessages(conversationId: string, beforeId?: string) {
      if (!beforeId) this.loadingMessages = true
      try {
        const page = await driverSupportApi.messages(conversationId, beforeId)
        const incoming = page.items.map(normalize)
        this.messages = beforeId
          ? mergeMessages(incoming, this.messages)
          : mergeMessages(
              this.messages.filter((item) => item.conversation_id === conversationId),
              incoming,
            )
        this.hasMore = page.has_more
      } finally {
        this.loadingMessages = false
      }
    },

    async select(conversationId: string) {
      this.activeId = conversationId
      this.messages = []
      this.hasMore = false
      await this.loadMessages(conversationId)
      await driverSupportApi.markRead(conversationId).catch(() => undefined)
      const row = this.inbox.find((item) => item.id === conversationId)
      if (row) row.unread_count = 0
      await this.fetchNotifications().catch(() => undefined)
    },

    async send(body: string) {
      const id = this.activeId
      const text = body.trim()
      if (!id || !text || this.sending) return
      this.sending = true
      try {
        const message = normalize(await driverSupportApi.send(id, text))
        this.messages = mergeMessages(this.messages, [message])
        const row = this.inbox.find((item) => item.id === id)
        if (row) {
          row.last_message_preview = text
          row.last_message_at = message.created_at
        }
      } finally {
        this.sending = false
      }
    },

    remember(message: DriverSupportMessage) {
      const item = normalize(message)
      if (item.conversation_id === this.activeId) {
        this.messages = mergeMessages(this.messages, [item])
        if (!item.is_mine) {
          void driverSupportApi.markRead(item.conversation_id).catch(() => undefined)
        }
      }
      const row = this.inbox.find((entry) => entry.id === item.conversation_id)
      if (row) {
        row.last_message_preview = item.body
        row.last_message_at = item.created_at
        if (item.conversation_id !== this.activeId && !item.is_mine) {
          row.unread_count += 1
        }
      } else {
        void this.fetchInbox().catch(() => undefined)
      }
      if (!item.is_mine) void this.fetchNotifications().catch(() => undefined)
    },

    startRealtime() {
      this.disposed = false
      this.connectWs()
      if (!this.pollTimer) {
        this.pollTimer = setInterval(() => {
          if (this.socketOpen) return
          void this.fetchNotifications().catch(() => undefined)
          void this.fetchInbox().catch(() => undefined)
          if (this.activeId) void this.loadMessages(this.activeId).catch(() => undefined)
        }, 3000)
      }
    },

    connectWs() {
      if (this.disposed || this.socket) return
      const token = tokenStorage.getAccess()
      if (!token) return
      const url = `${API_BASE_URL.replace(/^http/, 'ws')}/driver-support/ws?token=${encodeURIComponent(token)}`
      const socket = new WebSocket(url)
      this.socket = socket
      socket.onopen = () => {
        this.socketOpen = true
      }
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as {
            event?: string
            type?: string
            conversation_id?: string
            message?: DriverSupportMessage
          }
          const name = `${payload.event || payload.type || ''}`.toLowerCase()
          if (name === 'ping' || name === 'connected') return
          if (name === 'read') {
            void this.fetchNotifications().catch(() => undefined)
            void this.fetchInbox().catch(() => undefined)
            return
          }
          if (name === 'message' && payload.message) {
            this.remember({
              ...payload.message,
              conversation_id: payload.message.conversation_id || payload.conversation_id || '',
            })
          }
        } catch {
          /* ignore malformed frames */
        }
      }
      socket.onerror = () => {
        this.socketOpen = false
      }
      socket.onclose = () => {
        this.socketOpen = false
        if (this.socket === socket) this.socket = null
        if (!this.disposed) {
          window.setTimeout(() => this.connectWs(), 3000)
        }
      }
    },

    reset() {
      this.disposed = true
      this.pollTimer && clearInterval(this.pollTimer)
      this.pollTimer = null
      this.socket?.close()
      this.socket = null
      this.socketOpen = false
      this.inbox = []
      this.messages = []
      this.activeId = null
      this.totalUnread = 0
    },
  },
})
