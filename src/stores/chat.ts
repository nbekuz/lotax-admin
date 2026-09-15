import { defineStore } from 'pinia'
import { chatApi } from '@/api/chat'
import { createChatStream } from '@/composables/useChatStream'
import type {
  ChatConversation,
  ChatMessage,
  ChatNotificationItem,
} from '@/types/chat'
import type { AdminRole } from '@/types/api'

interface ChatState {
  conversations: ChatConversation[]
  activeConversationId: string | null
  messages: ChatMessage[]
  messagesHasMore: boolean
  notifications: ChatNotificationItem[]
  totalUnread: number
  loadingConversations: boolean
  loadingMessages: boolean
  sending: boolean
  streamCloser: { close: () => void } | null
  pollTimer: ReturnType<typeof setInterval> | null
}

function sortConversations(items: ChatConversation[]) {
  return [...items].sort((a, b) => {
    const aTime = a.last_message_at ?? a.created_at
    const bTime = b.last_message_at ?? b.created_at
    return bTime.localeCompare(aTime)
  })
}

export function conversationTitle(
  conversation: ChatConversation,
  role: AdminRole | null,
): string {
  if (conversation.conversation_type === 'support') {
    if (role === 'director') return 'Поддержка LOTAX'
    if (conversation.initiator) {
      return `${conversation.initiator.first_name} ${conversation.initiator.last_name}`.trim()
    }
    return 'Обращение директора'
  }

  if (role === 'manager') {
    if (conversation.initiator) {
      return `${conversation.initiator.first_name} ${conversation.initiator.last_name}`.trim()
    }
    return 'Чат с директором'
  }

  if (conversation.receiver) {
    return `${conversation.receiver.first_name} ${conversation.receiver.last_name}`.trim()
  }
  return 'Чат с менеджером'
}

export function conversationSubtitle(
  conversation: ChatConversation,
  role: AdminRole | null,
): string {
  if (conversation.conversation_type === 'support') {
    return role === 'super_admin' ? 'Поддержка LOTAX' : 'Помощь'
  }
  return role === 'manager' ? 'Чат с директором' : 'Чат с менеджером'
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    conversations: [],
    activeConversationId: null,
    messages: [],
    messagesHasMore: false,
    notifications: [],
    totalUnread: 0,
    loadingConversations: false,
    loadingMessages: false,
    sending: false,
    streamCloser: null,
    pollTimer: null,
  }),

  getters: {
    activeConversation(state): ChatConversation | null {
      if (!state.activeConversationId) return null
      return (
        state.conversations.find((c) => c.id === state.activeConversationId) ??
        null
      )
    },
    lastMessageId(state): string | null {
      if (!state.messages.length) return null
      return state.messages[state.messages.length - 1]?.id ?? null
    },
  },

  actions: {
  async fetchConversations() {
      this.loadingConversations = true
      try {
        const { data } = await chatApi.listConversations()
        const items = Array.isArray(data)
          ? data
          : ((data as { items?: ChatConversation[] }).items ?? [])
        this.conversations = sortConversations(items)
      } finally {
        this.loadingConversations = false
      }
    },

    async fetchNotifications() {
      const { data } = await chatApi.notifications()
      this.notifications = data.items ?? []
      this.totalUnread = data.total_unread ?? 0
    },

    async openSupport(): Promise<ChatConversation> {
      const { data } = await chatApi.openSupport()
      this.upsertConversation(data)
      this.activeConversationId = data.id
      await this.loadMessages(data.id)
      return data
    },

    async openStaff(managerId?: string): Promise<ChatConversation> {
      const payload = managerId ? { manager_id: managerId } : {}
      const { data } = await chatApi.openStaff(payload)
      this.upsertConversation(data)
      this.activeConversationId = data.id
      await this.loadMessages(data.id)
      return data
    },

    upsertConversation(conversation: ChatConversation) {
      const idx = this.conversations.findIndex((c) => c.id === conversation.id)
      if (idx >= 0) {
        this.conversations[idx] = conversation
      } else {
        this.conversations.push(conversation)
      }
      this.conversations = sortConversations(this.conversations)
    },

    async selectConversation(conversationId: string) {
      this.activeConversationId = conversationId
      await this.loadMessages(conversationId)
      await this.markRead(conversationId)
    },

    async loadMessages(conversationId: string) {
      this.loadingMessages = true
      try {
        const { data } = await chatApi.listMessages(conversationId, { limit: 50 })
        this.messages = data.items ?? []
        this.messagesHasMore = data.has_more ?? false
      } finally {
        this.loadingMessages = false
      }
    },

    async loadOlderMessages() {
      const conversationId = this.activeConversationId
      if (!conversationId || !this.messages.length || !this.messagesHasMore) {
        return
      }

      const beforeId = this.messages[0]?.id
      if (!beforeId) return

      const { data } = await chatApi.listMessages(conversationId, {
        limit: 50,
        before_id: beforeId,
      })

      const existing = new Set(this.messages.map((m) => m.id))
      const older = (data.items ?? []).filter((m) => !existing.has(m.id))
      this.messages = [...older, ...this.messages]
      this.messagesHasMore = data.has_more ?? false
    },

    async pollNewMessages() {
      const conversationId = this.activeConversationId
      if (!conversationId || !this.lastMessageId) return

      const { data } = await chatApi.listMessages(conversationId, {
        limit: 50,
        after_id: this.lastMessageId,
      })

      const existing = new Set(this.messages.map((m) => m.id))
      const fresh = (data.items ?? []).filter((m) => !existing.has(m.id))
      if (fresh.length) {
        this.messages = [...this.messages, ...fresh]
      }
    },

    async sendMessage(body: string) {
      const conversationId = this.activeConversationId
      if (!conversationId) return

      const trimmed = body.trim()
      if (!trimmed) return

      this.sending = true
      try {
        const { data } = await chatApi.sendMessage(conversationId, trimmed)
        const exists = this.messages.some((m) => m.id === data.id)
        if (!exists) {
          this.messages = [...this.messages, data]
        }
        this.touchConversation(conversationId, data.body, data.created_at)
      } finally {
        this.sending = false
      }
    },

    async markRead(conversationId: string) {
      await chatApi.markRead(conversationId)
      const conv = this.conversations.find((c) => c.id === conversationId)
      if (conv) conv.unread_count = 0
      await this.fetchNotifications()
    },

    touchConversation(
      conversationId: string,
      preview: string,
      at: string,
    ) {
      const conv = this.conversations.find((c) => c.id === conversationId)
      if (conv) {
        conv.last_message_preview = preview
        conv.last_message_at = at
        this.conversations = sortConversations(this.conversations)
      }
    },

    handleStreamEvent(event: {
      event: string
      type?: string
      conversation_id?: string
      message?: ChatMessage
      room_id?: string
      driver_id?: string
      park_id?: string
      driver_display_name?: string | null
      body_preview?: string | null
    }) {
      const name = event.type ?? event.event

      if (
        name === 'password_reset_opened' ||
        name === 'password_reset_message' ||
        name === 'password_reset_closed'
      ) {
        void import('@/stores/passwordReset').then(({ usePasswordResetStore }) => {
          usePasswordResetStore().handleStreamEvent(event as import('@/types/chat').ChatStreamEvent)
        })
        return
      }

      if (name === 'message' && event.message) {
        const msg = event.message
        this.touchConversation(msg.conversation_id, msg.body, msg.created_at)

        if (msg.conversation_id === this.activeConversationId) {
          const exists = this.messages.some((m) => m.id === msg.id)
          if (!exists) {
            this.messages = [...this.messages, msg]
          }
          if (!msg.is_mine) {
            void this.markRead(msg.conversation_id)
          }
        } else {
          const conv = this.conversations.find((c) => c.id === msg.conversation_id)
          if (conv) conv.unread_count += 1
          void this.fetchNotifications()
        }
      }

      if (name === 'read') {
        void this.fetchNotifications()
      }
    },

    startRealtime() {
      this.stopRealtime()
      this.streamCloser = createChatStream((event) => this.handleStreamEvent(event))
      this.pollTimer = setInterval(() => {
        void this.pollNewMessages()
        void this.fetchNotifications()
      }, 15000)
    },

    stopRealtime() {
      this.streamCloser?.close()
      this.streamCloser = null
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },

    reset() {
      this.stopRealtime()
      this.conversations = []
      this.activeConversationId = null
      this.messages = []
      this.messagesHasMore = false
      this.notifications = []
      this.totalUnread = 0
    },
  },
})
