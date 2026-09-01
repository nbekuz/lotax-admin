import type { AdminRole } from '@/types/api'

export type ChatConversationType = 'support' | 'staff'
export type ChatParticipantRole = 'initiator' | 'receiver'
export type ChatSenderType = 'initiator' | 'receiver'
export type ChatStreamEventType = 'ping' | 'message' | 'read'

export interface ChatParticipant {
  id: string
  first_name: string
  last_name: string
  role: AdminRole
  email: string
}

export interface ChatConversation {
  id: string
  conversation_type: ChatConversationType
  organization_id: string
  initiator: ChatParticipant | null
  receiver: ChatParticipant | null
  unread_count: number
  last_message_preview: string | null
  last_message_at: string | null
  created_at: string
  my_role: ChatParticipantRole
}

export interface ChatMessage {
  id: string
  conversation_id: string
  body: string
  created_at: string
  sender_admin_id: string
  sender_type: ChatSenderType
  sender_name: string
  is_mine: boolean
}

export interface ChatMessagesResponse {
  items: ChatMessage[]
  total: number
  has_more: boolean
}

export interface ChatNotificationItem {
  conversation_id: string
  conversation_type: ChatConversationType
  unread_count: number
  last_message_preview: string | null
  last_message_at: string | null
  peer_name: string
}

export interface ChatNotificationsResponse {
  items: ChatNotificationItem[]
  total_unread: number
}

export interface ChatStreamEvent {
  event: ChatStreamEventType
  conversation_id?: string
  message?: ChatMessage
}

export interface StaffChatPayload {
  manager_id?: string
}
