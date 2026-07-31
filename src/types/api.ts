export type AdminRole = 'director' | 'admin' | 'manager' | 'super_admin'
export type AdminStatus = 'active' | 'blocked' | 'inactive'
export type DriverStatus = 'active' | 'blocked' | 'pending'
export type DriverTier = 'bronze' | 'silver' | 'gold' | 'platinum'
/** Roles that can be assigned via Staff CRUD (never director via HTTP). */
export type StaffAssignableRole = 'admin' | 'manager'

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  role?: AdminRole
  email?: string
}

export interface AdminProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: AdminRole
  status: AdminStatus
  park_id?: string | null
  created_at: string
}

/** Staff list/detail item — same shape as AdminProfile for park admins. */
export type AdminListItem = AdminProfile

export interface AdminListResponse {
  items: AdminListItem[]
  total: number
  page: number
  page_size: number
}

export interface AdminCreatePayload {
  email: string
  password: string
  first_name: string
  last_name: string
  role: StaffAssignableRole
}

export interface AdminUpdatePayload {
  first_name?: string | null
  last_name?: string | null
  password?: string | null
  status?: AdminStatus | null
  role?: StaffAssignableRole | null
}

/* ── Super Admin / Parks ── */

export interface ParkResponse {
  id: string
  name: string
  legal_name?: string | null
  yandex_park_id?: string | null
  yandex_client_id?: string | null
  has_yandex_api_key?: boolean
  subscription_active: boolean
  is_active: boolean
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface ParkListResponse {
  items: ParkResponse[]
  total: number
  page: number
  page_size: number
}

export interface ParkCreatePayload {
  name: string
  legal_name?: string | null
  yandex_park_id?: string | null
  yandex_client_id?: string | null
  yandex_api_key?: string | null
  subscription_active?: boolean
  notes?: string | null
}

export interface ParkUpdatePayload {
  name?: string | null
  legal_name?: string | null
  yandex_park_id?: string | null
  yandex_client_id?: string | null
  yandex_api_key?: string | null
  is_active?: boolean | null
  notes?: string | null
}

export interface ParkSubscriptionPayload {
  subscription_active: boolean
}

export interface ParkDirectorCreatePayload {
  email: string
  password: string
  first_name: string
  last_name: string
}

export interface PlatformSettingItem {
  key: string
  value: string
  description?: string | null
}

export interface PlatformSettingsResponse {
  items: PlatformSettingItem[]
}

export interface PlatformSettingsUpdatePayload {
  items: PlatformSettingItem[]
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
