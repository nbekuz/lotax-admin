import { http } from './http'
import type {
  OrgMeResponse,
  ParkListResponse,
  ParkResponse,
} from '@/types/api'

export interface OrgParksQuery {
  page?: number
  page_size?: number
}

/** ЛК organization APIs — director / admin / manager. */
export const orgApi = {
  me() {
    return http.get<OrgMeResponse>('/org/me')
  },

  listParks(params: OrgParksQuery = {}) {
    return http.get<ParkListResponse>('/org/parks', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
      },
    })
  },

  getPark(parkId: string) {
    return http.get<ParkResponse>(`/org/parks/${parkId}`)
  },
}
