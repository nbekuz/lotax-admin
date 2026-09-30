export interface StaffPasswordResetRoom {
  id: string
  target_admin_id: string
  target_email?: string | null
  target_display_name?: string | null
  target_role?: string | null
  status: string
  last_message_at?: string | null
  last_message_preview?: string | null
  created_at: string
  closed_at?: string | null
  created?: boolean
}

export interface StaffPasswordResetRoomListResponse {
  items: StaffPasswordResetRoom[]
  total: number
  page: number
  page_size: number
}

export interface StaffPasswordResetMessage {
  id: string
  room_id: string
  sender_type: string
  sender_admin_id?: string | null
  sender_name?: string | null
  sender_email?: string | null
  sender_role?: string | null
  body: string
  created_at: string
}

export interface StaffPasswordResetMessageListResponse {
  items: StaffPasswordResetMessage[]
  total: number
  page: number
  page_size: number
}

export interface AdminGhostSessionResponse {
  access_token: string
  token_type?: string
  expires_in: number
  admin_id: string
  email: string
  role: string
  purpose?: string
}
