import { http } from './http'
import type {
  AdjustPointsPayload,
  AdjustTierPayload,
  BalanceUpdatePayload,
  DriverListItem,
  DriverListResponse,
  DriverPersonalData,
  DriverPointsAccrualsResponse,
  DriverPointsHistoryResponse,
  DriverRideListResponse,
  DriverRidesHistoryResponse,
  DriverStatus,
  DriverTaskHistoryResponse,
  DriverTier,
  DriverTierHistoryResponse,
  DriverBulkStatusPayload,
  DriverLaunchResetPayload,
  HistoryPeriodQuery,
  ManualDriverCreatePayload,
  MessageResponse,
  StatusUpdatePayload,
  SyncTaskResponse,
  YandexCursorPage,
  YandexLiveEarningsItem,
  YandexLiveOrderItem,
  YandexLiveStatementItem,
} from '@/types/api'

export interface DriversQuery {
  page?: number
  page_size?: number
  q?: string | null
  status?: DriverStatus | null
  tier?: DriverTier | null
  park_id?: string | null
}

export interface DriverHistoryQuery extends HistoryPeriodQuery {
  points_type?: string | null
  operation?: string | null
  status?: string | null
}

export interface YandexLiveQuery {
  period?: string | null
  date_from?: string | null
  date_to?: string | null
  cursor?: string | null
  limit?: number
}

function periodParams(params: HistoryPeriodQuery = {}) {
  const useRange = Boolean(params.date_from && params.date_to)
  return {
    // date_from/date_to take precedence over period
    period: useRange ? undefined : params.period || undefined,
    date_from: useRange ? params.date_from || undefined : undefined,
    date_to: useRange ? params.date_to || undefined : undefined,
    page: params.page ?? 1,
    page_size: params.page_size ?? 20,
  }
}

function yandexParams(params: YandexLiveQuery = {}) {
  const useRange = Boolean(params.date_from && params.date_to)
  return {
    period: useRange ? undefined : params.period || undefined,
    date_from: useRange ? params.date_from || undefined : undefined,
    date_to: useRange ? params.date_to || undefined : undefined,
    cursor: params.cursor || undefined,
    limit: params.limit ?? 50,
  }
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
  pointsHistory(driverId: string, params: DriverHistoryQuery = {}) {
    return http.get<DriverPointsHistoryResponse>(
      `/admin/drivers/${driverId}/points-history`,
      {
        params: {
          ...periodParams(params),
          points_type: params.points_type || undefined,
          operation: params.operation || undefined,
        },
      },
    )
  },

  pointsAccruals(driverId: string, params: DriverHistoryQuery = {}) {
    return http.get<DriverPointsAccrualsResponse>(
      `/admin/drivers/${driverId}/points-accruals`,
      {
        params: {
          ...periodParams(params),
          points_type: params.points_type || undefined,
        },
      },
    )
  },

  ridesHistory(driverId: string, params: HistoryPeriodQuery = {}) {
    return http.get<DriverRidesHistoryResponse>(
      `/admin/drivers/${driverId}/rides-history`,
      { params: periodParams(params) },
    )
  },

  tasksHistory(driverId: string, params: DriverHistoryQuery = {}) {
    return http.get<DriverTaskHistoryResponse>(
      `/admin/drivers/${driverId}/tasks-history`,
      {
        params: {
          ...periodParams(params),
          status: params.status || undefined,
        },
      },
    )
  },

  tierHistory(driverId: string, params: HistoryPeriodQuery = {}) {
    return http.get<DriverTierHistoryResponse>(
      `/admin/drivers/${driverId}/tier-history`,
      { params: periodParams(params) },
    )
  },

  // ── Yandex live ────────────────────────────────────────────────────────────
  yandexOrders(driverId: string, params: YandexLiveQuery = {}) {
    return http.get<YandexCursorPage<YandexLiveOrderItem>>(
      `/admin/drivers/${driverId}/yandex/orders`,
      { params: yandexParams(params) },
    )
  },

  yandexStatement(driverId: string, params: YandexLiveQuery = {}) {
    return http.get<YandexCursorPage<YandexLiveStatementItem>>(
      `/admin/drivers/${driverId}/yandex/statement`,
      { params: yandexParams(params) },
    )
  },

  yandexEarnings(driverId: string, params: YandexLiveQuery = {}) {
    return http.get<YandexCursorPage<YandexLiveEarningsItem>>(
      `/admin/drivers/${driverId}/yandex/earnings`,
      { params: yandexParams(params) },
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
