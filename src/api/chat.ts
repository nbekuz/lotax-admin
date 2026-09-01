import { http } from './http'
import type {
  ChatConversation,
  ChatMessagesResponse,
  ChatMessage,
  ChatNotificationsResponse,
  StaffChatPayload,
} from '@/types/chat'
import type { MessageResponse } from '@/types/api'

export interface ChatMessagesQuery {
  limit?: number
  before_id?: string
  after_id?: string
}

export const chatApi = {
  openSupport() {
    return http.post<ChatConversation>('/chat/support')
  },

  openStaff(payload: StaffChatPayload = {}) {
    return http.post<ChatConversation>('/chat/staff', payload)
  },

  listConversations() {
    return http.get<ChatConversation[]>('/chat/conversations')
  },

  getConversation(conversationId: string) {
    return http.get<ChatConversation>(`/chat/conversations/${conversationId}`)
  },

  listMessages(conversationId: string, params: ChatMessagesQuery = {}) {
    return http.get<ChatMessagesResponse>(
      `/chat/conversations/${conversationId}/messages`,
      {
        params: {
          limit: params.limit ?? 50,
          before_id: params.before_id,
          after_id: params.after_id,
        },
      },
    )
  },

  sendMessage(conversationId: string, body: string) {
    return http.post<ChatMessage>(
      `/chat/conversations/${conversationId}/messages`,
      { body },
    )
  },

  markRead(conversationId: string) {
    return http.post<MessageResponse>(
      `/chat/conversations/${conversationId}/read`,
    )
  },

  notifications() {
    return http.get<ChatNotificationsResponse>('/chat/notifications')
  },
}
