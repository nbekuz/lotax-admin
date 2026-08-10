import { http } from './http'
import type {
  OrganizationListResponse,
  OrganizationSwitchRequest,
  OrgMeResponse,
  ParkListResponse,
  ParkResponse,
  PushNotifyPayload,
  PushNotifyResponse,
  YandexSettingsResponse,
  YandexSettingsUpdatePayload,
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

  listMyOrganizations(params: { page?: number; page_size?: number } = {}) {
    return http.get<OrganizationListResponse>('/org/organizations', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 50,
      },
    })
  },

  switchOrganization(payload: OrganizationSwitchRequest) {
    return http.post<OrgMeResponse>('/org/switch', payload)
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

  getYandexSettings(parkId: string) {
    return http.get<YandexSettingsResponse>(
      `/org/parks/${parkId}/yandex-settings`,
    )
  },

  updateYandexSettings(parkId: string, payload: YandexSettingsUpdatePayload) {
    return http.patch<YandexSettingsResponse>(
      `/org/parks/${parkId}/yandex-settings`,
      payload,
    )
  },

  pushNotify(payload: PushNotifyPayload) {
    return http.post<PushNotifyResponse>('/admin/push/notify', payload)
  },
}
