export type PasswordResetRoomStatus = 'open' | 'closed'
export type PasswordResetSenderType = 'ghost' | 'admin'
export type PasswordResetRoomsFilter = PasswordResetRoomStatus | 'all'

export interface PasswordResetRoom {
  id: string
  driver_id: string
  park_id: string
  organization_id: string
  status: PasswordResetRoomStatus
  created?: boolean
  driver_display_name?: string | null
  last_message_at?: string | null
  last_message_preview?: string | null
  created_at: string
  closed_at?: string | null
}

export interface PasswordResetMessage {
  id: string
  room_id: string
  sender_type: PasswordResetSenderType
  sender_admin_id?: string | null
  body: string
  created_at: string
}

export interface PasswordResetRoomListResponse {
  items: PasswordResetRoom[]
  total: number
  page: number
  page_size: number
}

export interface PasswordResetMessageListResponse {
  items: PasswordResetMessage[]
  total: number
  page?: number
  page_size?: number
  has_more?: boolean
}

export interface PasswordResetStreamPayload {
  room_id?: string
  driver_id?: string
  park_id?: string
  driver_display_name?: string | null
  body_preview?: string | null
  room?: PasswordResetRoom
  message?: PasswordResetMessage
}
