import { http } from './http'
import type {
  AdminCreatePayload,
  AdminListItem,
  AdminListResponse,
  AdminUpdatePayload,
  StaffAssignableRole,
} from '@/types/api'

export interface AdminsQuery {
  page?: number
  page_size?: number
  role?: StaffAssignableRole | null
}

function normalizeListResponse(
  data: AdminListResponse | AdminListItem[],
): AdminListResponse {
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      page_size: data.length || 20,
    }
  }
  return {
    items: data.items ?? [],
    total: data.total ?? data.items?.length ?? 0,
    page: data.page ?? 1,
    page_size: data.page_size ?? 20,
  }
}

export const adminsApi = {
  async list(params: AdminsQuery = {}) {
    const { data } = await http.get<AdminListResponse | AdminListItem[]>('/admins', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
        role: params.role || undefined,
      },
    })
    return normalizeListResponse(data)
  },

  async listManagers(params: Omit<AdminsQuery, 'role'> = {}) {
    const { data } = await http.get<AdminListResponse | AdminListItem[]>(
      '/admins/managers',
      {
        params: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
        },
      },
    )
    return normalizeListResponse(data)
  },

  getById(adminId: string) {
    return http.get<AdminListItem>(`/admins/${adminId}`)
  },

  create(payload: AdminCreatePayload) {
    return http.post<AdminListItem>('/admins', payload)
  },

  update(adminId: string, payload: AdminUpdatePayload) {
    return http.patch<AdminListItem>(`/admins/${adminId}`, payload)
  },
}
