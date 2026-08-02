import { http } from './http'
import type {
  AdminListItem,
  AdminListResponse,
  OrganizationCreatePayload,
  OrganizationListResponse,
  OrganizationResponse,
  OrganizationSubscriptionPayload,
  OrganizationUpdatePayload,
  OrgDirectorCreatePayload,
  ParkCreatePayload,
  ParkListResponse,
  ParkResponse,
  ParkUpdatePayload,
  PlatformSettingsResponse,
  PlatformSettingsUpdatePayload,
} from '@/types/api'

export interface OrganizationsQuery {
  page?: number
  page_size?: number
  subscription_active?: boolean | null
}

export const superAdminApi = {
  listOrganizations(params: OrganizationsQuery = {}) {
    return http.get<OrganizationListResponse>('/super-admin/organizations', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
        subscription_active:
          params.subscription_active === null ||
          params.subscription_active === undefined
            ? undefined
            : params.subscription_active,
      },
    })
  },

  createOrganization(payload: OrganizationCreatePayload) {
    return http.post<OrganizationResponse>(
      '/super-admin/organizations',
      payload,
    )
  },

  getOrganization(orgId: string) {
    return http.get<OrganizationResponse>(
      `/super-admin/organizations/${orgId}`,
    )
  },

  updateOrganization(orgId: string, payload: OrganizationUpdatePayload) {
    return http.patch<OrganizationResponse>(
      `/super-admin/organizations/${orgId}`,
      payload,
    )
  },

  setOrganizationSubscription(
    orgId: string,
    payload: OrganizationSubscriptionPayload,
  ) {
    return http.patch<OrganizationResponse>(
      `/super-admin/organizations/${orgId}/subscription`,
      payload,
    )
  },

  listOrganizationParks(
    orgId: string,
    params: { page?: number; page_size?: number } = {},
  ) {
    return http.get<ParkListResponse>(
      `/super-admin/organizations/${orgId}/parks`,
      {
        params: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
        },
      },
    )
  },

  createPark(orgId: string, payload: ParkCreatePayload) {
    return http.post<ParkResponse>(
      `/super-admin/organizations/${orgId}/parks`,
      payload,
    )
  },

  updatePark(parkId: string, payload: ParkUpdatePayload) {
    return http.patch<ParkResponse>(`/super-admin/parks/${parkId}`, payload)
  },

  createDirector(orgId: string, payload: OrgDirectorCreatePayload) {
    return http.post<AdminListItem>(
      `/super-admin/organizations/${orgId}/directors`,
      payload,
    )
  },

  listOrganizationStaff(
    orgId: string,
    params: { page?: number; page_size?: number } = {},
  ) {
    return http.get<AdminListResponse>(
      `/super-admin/organizations/${orgId}/staff`,
      {
        params: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
        },
      },
    )
  },

  getSettings() {
    return http.get<PlatformSettingsResponse>('/super-admin/settings')
  },

  updateSettings(payload: PlatformSettingsUpdatePayload) {
    return http.put<PlatformSettingsResponse>('/super-admin/settings', payload)
  },
}
