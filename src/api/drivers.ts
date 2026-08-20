import { http } from './http'
import type {
  AdjustPointsPayload,
  AdjustTierPayload,
  BalanceUpdatePayload,
  DriverListItem,
  DriverListResponse,
  DriverPersonalData,
  DriverRideListResponse,
  DriverStatus,
  DriverTier,
  ManualDriverCreatePayload,
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
