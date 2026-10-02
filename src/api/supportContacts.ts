import { http } from './http'

export type SupportContactType =
  | 'telegram'
  | 'max'
  | 'facebook'
  | 'whatsapp'
  | 'instagram'
  | 'vk'
  | 'viber'
  | 'phone'
  | 'email'
  | 'website'

export interface SupportContactItem {
  id: string
  contact_type: SupportContactType
  label: string | null
  value: string
  url: string | null
  sort_order: number
  is_active: boolean
  director_id: string
  director_name: string
  organization_id: string
  created_at: string
  updated_at: string
}

export interface SupportContactListResponse {
  items: SupportContactItem[]
  total: number
}

export interface SupportContactPayload {
  contact_type: SupportContactType
  value: string
  label?: string | null
  sort_order?: number
  is_active?: boolean
  organization_id?: string | null
}

export const supportContactsApi = {
  list(organizationId?: string) {
    return http.get<SupportContactListResponse>('/support-contacts', {
      params: organizationId ? { organization_id: organizationId } : undefined,
    })
  },
  create(payload: SupportContactPayload) {
    return http.post<SupportContactItem>('/support-contacts', payload)
  },
  update(contactId: string, payload: Partial<SupportContactPayload>) {
    return http.patch<SupportContactItem>(`/support-contacts/${contactId}`, payload)
  },
  remove(contactId: string) {
    return http.delete(`/support-contacts/${contactId}`)
  },
}
