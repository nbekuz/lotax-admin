import { http } from './http'
import { toFormData } from '@/utils/formData'
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
  PlatformAdminCreatePayload,
  PlatformSettingsResponse,
  PlatformSettingsUpdatePayload,
  RewardAdminCreatePayload,
  RewardAdminItem,
  RewardAdminListResponse,
  RewardAdminUpdatePayload,
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

  listRewards(params: { page?: number; page_size?: number } = {}) {
    return http.get<RewardAdminListResponse>('/super-admin/rewards', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 50,
      },
    })
  },

  createReward(
    payload: RewardAdminCreatePayload & { image?: File | null },
  ) {
    const { image, ...rest } = payload
    return http.post<RewardAdminItem>(
      '/super-admin/rewards',
      toFormData({
        title: rest.title,
        type: rest.type,
        points_type: rest.points_type ?? 'system',
        points_cost: rest.points_cost,
        description: rest.description,
        stock_total: rest.stock_total,
        min_tier: rest.min_tier,
        sort_order: rest.sort_order,
        is_active: rest.is_active,
        image: image ?? undefined,
      }),
    )
  },

  updateReward(
    rewardId: string,
    payload: RewardAdminUpdatePayload & {
      image?: File | null
      clear_image?: boolean
    },
  ) {
    const { image, clear_image, ...rest } = payload
    return http.patch<RewardAdminItem>(
      `/super-admin/rewards/${rewardId}`,
      toFormData({
        title: rest.title,
        description: rest.description,
        points_cost: rest.points_cost,
        stock_total: rest.stock_total,
        min_tier: rest.min_tier,
        sort_order: rest.sort_order,
        is_active: rest.is_active,
        clear_image,
        image: image ?? undefined,
      }),
    )
  },

  listDirectors(params: { page?: number; page_size?: number } = {}) {
    return http.get<AdminListResponse>('/super-admin/directors', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
      },
    })
  },

  listPlatformAdmins(params: { page?: number; page_size?: number } = {}) {
    return http.get<AdminListResponse>('/super-admin/platform-admins', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
      },
    })
  },

  createPlatformAdmin(payload: PlatformAdminCreatePayload) {
    return http.post<AdminListItem>('/super-admin/platform-admins', {
      ...payload,
      role: 'admin',
    })
  },
}
