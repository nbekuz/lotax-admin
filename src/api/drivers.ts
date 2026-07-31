import { http } from './http'
import type {
  BalanceUpdatePayload,
  DriverListItem,
  DriverListResponse,
  DriverPersonalData,
  DriverStatus,
  StatusUpdatePayload,
  SyncTaskResponse,
} from '@/types/api'

export interface DriversQuery {
  page?: number
  page_size?: number
  status?: DriverStatus | null
}

export const driversApi = {
  list(params: DriversQuery = {}) {
    return http.get<DriverListResponse>('/drivers', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
        status: params.status || undefined,
      },
    })
  },
  getById(driverId: string) {
    return http.get<DriverListItem>(`/drivers/${driverId}`)
  },
  personalData(driverId: string) {
    return http.get<DriverPersonalData>(`/drivers/${driverId}/personal-data`)
  },
  updateBalance(driverId: string, payload: BalanceUpdatePayload) {
    return http.patch<DriverListItem>(`/drivers/${driverId}/balance`, payload)
  },
  updateStatus(driverId: string, payload: StatusUpdatePayload) {
    return http.patch<DriverListItem>(`/drivers/${driverId}/status`, payload)
  },
}

export const syncApi = {
  drivers() {
    return http.post<SyncTaskResponse>('/sync/drivers')
  },
  rides() {
    return http.post<SyncTaskResponse>('/sync/rides')
  },
}
