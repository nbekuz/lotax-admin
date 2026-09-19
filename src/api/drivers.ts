import { http } from './http'
import type {
  AdjustPointsPayload,
  AdjustTierPayload,
  BalanceUpdatePayload,
  DriverListItem,
  DriverListResponse,
  DriverPersonalData,
  DriverPointsHistoryResponse,
  DriverRideListResponse,
  DriverRidesHistoryResponse,
  DriverStatus,
  DriverTaskHistoryResponse,
  DriverTier,
  DriverTierHistoryResponse,
  DriverBulkStatusPayload,
  DriverLaunchResetPayload,
  ManualDriverCreatePayload,
  MessageResponse,
  StatusUpdatePayload,
  SyncTaskResponse,
} from '@/types/api'

export interface DriversQuery {
  page?: number
  page_size?: number
  q?: string | null
  status?: DriverStatus | null
  tier?: DriverTier | null
  park_id?: string | null
}

export const driversApi = {
  list(params: DriversQuery = {}) {
    return http.get<DriverListResponse>('/drivers', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
        q: params.q?.trim() || undefined,
        status: params.status || undefined,
        tier: params.tier || undefined,
        park_id: params.park_id || undefined,
      },
    })
  },
  getById(driverId: string) {
    return http.get<DriverListItem>(`/drivers/${driverId}`)
  },
  personalData(driverId: string) {
    return http.get<DriverPersonalData>(`/drivers/${driverId}/personal-data`)
  },
  rides(driverId: string, params: { page?: number; page_size?: number } = {}) {
    return http.get<DriverRideListResponse>(`/drivers/${driverId}/rides`, {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
      },
    })
  },
  updateBalance(driverId: string, payload: BalanceUpdatePayload) {
    return http.patch<DriverListItem>(`/drivers/${driverId}/balance`, payload)
  },
  updateStatus(driverId: string, payload: StatusUpdatePayload) {
    return http.patch<DriverListItem>(`/drivers/${driverId}/status`, payload)
  },
  setPassword(driverId: string, payload: { password: string }) {
    return http.patch<MessageResponse>(`/drivers/${driverId}/password`, payload)
  },
  createManual(payload: ManualDriverCreatePayload) {
    return http.post<DriverListItem>('/admin/drivers', payload)
  },
  adjustPoints(driverId: string, payload: AdjustPointsPayload) {
    return http.post<DriverListItem>(
      `/admin/drivers/${driverId}/adjust-points`,
      payload,
    )
  },
  adjustTier(driverId: string, payload: AdjustTierPayload) {
    return http.post<DriverListItem>(
      `/admin/drivers/${driverId}/adjust-tier`,
      payload,
    )
  },
  bulkStatus(payload: DriverBulkStatusPayload) {
    return http.post<SyncTaskResponse>('/drivers/bulk-status', payload)
  },
  launchReset(payload: DriverLaunchResetPayload) {
    return http.post<SyncTaskResponse>('/drivers/launch-reset', payload)
  },

  // ── History tabs (B1) ──────────────────────────────────────────────────────
  pointsHistory(
    driverId: string,
    params: {
      points_type?: string | null
      operation?: string | null
      period?: string | null
      page?: number
      page_size?: number
    } = {},
  ) {
    return http.get<DriverPointsHistoryResponse>(
      `/admin/drivers/${driverId}/points-history`,
      {
        params: {
          points_type: params.points_type || undefined,
          operation: params.operation || undefined,
          period: params.period || undefined,
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
        },
      },
    )
  },

  ridesHistory(
    driverId: string,
    params: { period?: string | null; page?: number; page_size?: number } = {},
  ) {
    return http.get<DriverRidesHistoryResponse>(
      `/admin/drivers/${driverId}/rides-history`,
      {
        params: {
          period: params.period || undefined,
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
        },
      },
    )
  },

  tasksHistory(
    driverId: string,
    params: { status?: string | null; page?: number; page_size?: number } = {},
  ) {
    return http.get<DriverTaskHistoryResponse>(
      `/admin/drivers/${driverId}/tasks-history`,
      {
        params: {
          status: params.status || undefined,
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
        },
      },
    )
  },

  tierHistory(
    driverId: string,
    params: { page?: number; page_size?: number } = {},
  ) {
    return http.get<DriverTierHistoryResponse>(
      `/admin/drivers/${driverId}/tier-history`,
      {
        params: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
        },
      },
    )
  },

  /** Director-only: download Excel of all points history (responseType: blob). */
  exportPoints(driverId: string) {
    return http.get(`/admin/drivers/${driverId}/export/points`, {
      params: { points_type: 'all' },
      responseType: 'blob',
    })
  },
}

export const syncApi = {
  drivers(parkId?: string | null) {
    return http.post<SyncTaskResponse>('/sync/drivers', null, {
      params: parkId ? { park_id: parkId } : undefined,
    })
  },
  rides(parkId?: string | null) {
    return http.post<SyncTaskResponse>('/sync/rides', null, {
      params: parkId ? { park_id: parkId } : undefined,
    })
  },
}
