export type AdminRole = 'director' | 'admin' | 'manager'
export type AdminStatus = 'active' | 'blocked' | 'inactive'
export type DriverStatus = 'active' | 'blocked' | 'pending'
export type DriverTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface AdminProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: AdminRole
  status: AdminStatus
  created_at: string
}

export interface DriverListItem {
  id: string
  yandex_driver_id?: string | null
  yandex_park_id?: string | null
  display_name?: string | null
  first_name_masked?: string | null
  last_name_masked?: string | null
  phone_masked?: string | null
  balance_system_points: number
  balance_park_points: number
  tier: DriverTier
  status: DriverStatus
  referral_code?: string | null
  created_at: string
}

export interface DriverListResponse {
  items: DriverListItem[]
  total: number
  page: number
  page_size: number
}

export interface DriverPersonalData {
  id: string
  first_name?: string | null
  last_name?: string | null
  middle_name?: string | null
  phone?: string | null
  display_name?: string | null
  tier: DriverTier
  status: DriverStatus
}

export interface SyncTaskResponse {
  message: string
  task_id: string
}

export interface AdminLoginPayload {
  email: string
  password: string
}

export interface BalanceUpdatePayload {
  balance_system_points?: number | null
  balance_park_points?: number | null
}

export interface StatusUpdatePayload {
  status: DriverStatus
}
