import { http } from './http'

export interface DriverSupportConversation {
  id: string
  driver_id: string
  driver_display_name: string | null
  organization_id: string
  park_id: string
  last_message_at: string | null
  last_message_preview: string | null
  unread_count: number
  created_at: string
}

export interface DriverSupportMessage {
  id: string
  conversation_id: string
  body: string
  created_at: string
  sender_role: string
  sender_name: string | null
  is_mine?: boolean
}

export interface DriverSupportMessagePage {
  items: DriverSupportMessage[]
  has_more: boolean
}

export interface DriverSupportNotice {
  conversation_id: string
  title: string
  body_preview: string
  unread_count: number
  last_message_at: string | null
}

export interface DriverSupportNotifications {
  items: DriverSupportNotice[]
  total_unread: number
}

function asList<T>(data: T[] | { items?: T[] } | undefined): T[] {
  if (Array.isArray(data)) return data
  return data?.items ?? []
}

export const driverSupportApi = {
  async inbox() {
    const { data } = await http.get<DriverSupportConversation[] | { items: DriverSupportConversation[] }>(
      '/driver-support/inbox',
    )
    return asList(data)
  },

  async messages(conversationId: string, beforeId?: string) {
    const { data } = await http.get<DriverSupportMessagePage>(
      `/driver-support/inbox/${conversationId}/messages`,
      {
        params: {
          limit: 50,
          ...(beforeId ? { before_id: beforeId } : {}),
        },
      },
    )
    return {
      items: data.items ?? [],
      has_more: data.has_more === true,
    }
  },

  async send(conversationId: string, body: string) {
    const { data } = await http.post<DriverSupportMessage>(
      `/driver-support/inbox/${conversationId}/messages`,
      { body },
    )
    return data
  },

  async messageDriver(driverId: string, body: string) {
    const { data } = await http.post<DriverSupportMessage>(
      `/driver-support/drivers/${driverId}/messages`,
      { body },
    )
    return data
  },

  markRead(conversationId: string) {
    return http.post(`/driver-support/inbox/${conversationId}/read`)
  },

  async notifications() {
    const { data } = await http.get<DriverSupportNotifications>(
      '/driver-support/director/notifications',
    )
    return {
      items: data.items ?? [],
      total_unread: data.total_unread ?? 0,
    }
  },
}
