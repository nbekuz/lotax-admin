import { http } from './http'
import type {
  ParkGroupCreatePayload,
  ParkGroupItem,
  ParkGroupListResponse,
  ParkGroupUpdatePayload,
} from '@/types/api'

export const adminParkGroupsApi = {
  list() {
    return http.get<ParkGroupListResponse>('/admin/park-groups')
  },

  create(payload: ParkGroupCreatePayload) {
    return http.post<ParkGroupItem>('/admin/park-groups', payload)
  },

  update(groupId: string, payload: ParkGroupUpdatePayload) {
    return http.patch<ParkGroupItem>(`/admin/park-groups/${groupId}`, payload)
  },

  remove(groupId: string) {
    return http.delete(`/admin/park-groups/${groupId}`)
  },
}
