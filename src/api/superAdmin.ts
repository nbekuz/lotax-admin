import { http } from './http'
import type {
  AdminListResponse,
  ParkCreatePayload,
  ParkDirectorCreatePayload,
  ParkListResponse,
  ParkResponse,
  ParkSubscriptionPayload,
  ParkUpdatePayload,
  PlatformSettingsResponse,
  PlatformSettingsUpdatePayload,
  AdminListItem,
} from '@/types/api'

export interface ParksQuery {
  page?: number
  page_size?: number
  subscription_active?: boolean | null
}

export const superAdminApi = {
  listParks(params: ParksQuery = {}) {
    return http.get<ParkListResponse>('/super-admin/parks', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
        subscription_active:
          params.subscription_active === null || params.subscription_active === undefined
            ? undefined
            : params.subscription_active,
      },
    })
  },

  createPark(payload: ParkCreatePayload) {
    return http.post<ParkResponse>('/super-admin/parks', payload)
  },

  getPark(parkId: string) {
    return http.get<ParkResponse>(`/super-admin/parks/${parkId}`)
  },

  updatePark(parkId: string, payload: ParkUpdatePayload) {
    return http.patch<ParkResponse>(`/super-admin/parks/${parkId}`, payload)
  },

  setSubscription(parkId: string, payload: ParkSubscriptionPayload) {
    return http.patch<ParkResponse>(
      `/super-admin/parks/${parkId}/subscription`,
      payload,
    )
  },

  createDirector(parkId: string, payload: ParkDirectorCreatePayload) {
    return http.post<AdminListItem>(
      `/super-admin/parks/${parkId}/directors`,
      payload,
    )
  },

  listParkStaff(
    parkId: string,
    params: { page?: number; page_size?: number } = {},
  ) {
    return http.get<AdminListResponse>(`/super-admin/parks/${parkId}/staff`, {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
      },
    })
  },

  getSettings() {
    return http.get<PlatformSettingsResponse>('/super-admin/settings')
  },

  updateSettings(payload: PlatformSettingsUpdatePayload) {
    return http.put<PlatformSettingsResponse>('/super-admin/settings', payload)
  },
}
