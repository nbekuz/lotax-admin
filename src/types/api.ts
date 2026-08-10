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
  expires_in: number
  role?: AdminRole
  email?: string
  organization_id?: string | null
  organization_ids?: string[]
}

export interface AdminProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: AdminRole
  status: AdminStatus
  /** Legacy single-park link; prefer organization_id. */
  park_id?: string | null
  organization_id?: string | null
  organization_ids?: string[]
  created_at: string
}

/** Staff list/detail item — same shape as AdminProfile for org staff. */
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

export interface PasswordChangePayload {
  current_password: string
  new_password: string
}

export interface MessageResponse {
  message: string
}

/* ── Organization (tenant) ── */

export interface OrganizationResponse {
  id: string
  name: string
  legal_name?: string | null
  subscription_active: boolean
  is_active: boolean
  notes?: string | null
  parks_count?: number
  created_at: string
  updated_at: string
}

export interface OrganizationListResponse {
  items: OrganizationResponse[]
  total: number
  page: number
  page_size: number
}

export interface OrganizationCreatePayload {
  name: string
  legal_name?: string | null
  subscription_active?: boolean
  notes?: string | null
}

export interface OrganizationUpdatePayload {
  name?: string | null
  legal_name?: string | null
  is_active?: boolean | null
  notes?: string | null
}

export interface OrganizationSubscriptionPayload {
  subscription_active: boolean
}

export interface OrgMeResponse {
  organization: OrganizationResponse
  role: AdminRole
  email: string
  first_name: string
  last_name: string
  admin_id: string
  organization_ids?: string[]
}

export interface OrganizationSwitchRequest {
  organization_id: string
}

/* ── Parks ── */

export interface ParkResponse {
  id: string
  organization_id?: string | null
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

/** New director: password required (min 8). Existing director: email only. */
export interface OrgDirectorCreatePayload {
  email: string
  password?: string | null
  first_name?: string
  last_name?: string
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

/* ── Stage 2: points, Yandex settings, rewards, orders, rules ── */

export type PointsType = 'system' | 'park'
export type RewardType =
  | 'free_shift'
  | 'certificate'
  | 'fuel_card'
  | 'car_wash'
  | 'merchandise'
  | 'other'
export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'fulfilled'
export type RuleType = 'per_ride' | 'per_ruble' | 'time_multiplier' | 'tier_multiplier'

/* ── Yandex settings (org/parks) ── */

export interface YandexSettingsResponse {
  park_id: string
  yandex_park_id?: string | null
  yandex_client_id?: string | null
  has_yandex_api_key: boolean
}

export interface YandexSettingsUpdatePayload {
  yandex_client_id?: string | null
  yandex_api_key?: string | null
  yandex_park_id?: string | null
}

/* ── Manual driver creation ── */

export interface ManualDriverCreatePayload {
  phone: string
  first_name: string
  last_name: string
  middle_name?: string | null
  yandex_driver_id?: string | null
  park_id: string
}

/* ── Points adjustment ── */

export interface AdjustPointsPayload {
  points_type: PointsType
  amount: number
  description: string
}

/* ── Rewards (admin ЛК + super-admin) ── */

export interface RewardAdminItem {
  id: string
  park_id?: string | null
  title: string
  description?: string | null
  image_url?: string | null
  type: string
  points_type: PointsType
  points_cost: number
  stock_total?: number | null
  stock_remaining?: number | null
  min_tier: DriverTier
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface RewardAdminListResponse {
  items: RewardAdminItem[]
  total: number
  page: number
  page_size: number
}

export interface RewardAdminCreatePayload {
  park_id?: string | null
  title: string
  description?: string | null
  type: string
  points_type: PointsType
  points_cost: number
  stock_total?: number | null
  min_tier?: DriverTier
  sort_order?: number
  is_active?: boolean
}

export interface RewardAdminUpdatePayload {
  title?: string | null
  description?: string | null
  points_cost?: number | null
  stock_total?: number | null
  min_tier?: DriverTier | null
  sort_order?: number | null
  is_active?: boolean | null
}

/* ── Orders (reward redemption requests) ── */

export interface OrderAdminItem {
  id: string
  driver_id: string
  driver_display_name?: string | null
  reward_id: string
  reward_title: string
  reward_type: string
  points_type: string
  points_spent: number
  status: OrderStatus
  certificate_code?: string | null
  free_shift_date?: string | null
  review_comment?: string | null
  reviewed_at?: string | null
  created_at: string
}

export interface OrderAdminListResponse {
  items: OrderAdminItem[]
  total: number
  page: number
  page_size: number
}

export interface OrderApprovePayload {
  certificate_code?: string | null
}

export interface OrderRejectPayload {
  reason: string
}

/* ── Points rules (park earning rules) ── */

export interface PointsRuleItem {
  id: string
  park_id?: string | null
  points_type: PointsType
  name: string
  description?: string | null
  rule_type: string
  conditions: Record<string, unknown>
  is_active: boolean
  priority: number
  valid_from?: string | null
  valid_until?: string | null
  created_at: string
  updated_at: string
}

export interface PointsRuleListResponse {
  items: PointsRuleItem[]
}

export interface PointsRuleCreatePayload {
  park_id: string
  points_type?: PointsType
  name: string
  description?: string | null
  rule_type: string
  conditions?: Record<string, unknown>
  is_active?: boolean
  priority?: number
  valid_from?: string | null
  valid_until?: string | null
}

export interface PointsRuleUpdatePayload {
  name?: string | null
  description?: string | null
  rule_type?: string | null
  conditions?: Record<string, unknown> | null
  is_active?: boolean | null
  priority?: number | null
  valid_from?: string | null
  valid_until?: string | null
}

/* ── Stage 3: tasks, competitions, referral program ── */

export type TaskType =
  | 'ride_count'
  | 'earn_points'
  | 'fare_total'
  | 'streak_days'
  | 'custom'
export type TaskStatus = 'draft' | 'scheduled' | 'active' | 'completed'

export interface TaskAdminItem {
  id: string
  park_id: string
  title: string
  description?: string | null
  task_type: TaskType
  target_value: number
  reward_points_type: PointsType
  reward_points: number
  start_date: string
  end_date: string
  auto_join: boolean
  status: TaskStatus
  participants_count?: number | null
  completed_count?: number | null
  created_at: string
  updated_at: string
}

export interface TaskAdminListResponse {
  items: TaskAdminItem[]
  total?: number
  page?: number
  page_size?: number
}

export interface TaskAdminCreatePayload {
  park_id: string
  title: string
  description?: string | null
  task_type: TaskType
  target_value: number
  reward_points_type: PointsType
  reward_points: number
  start_date: string
  end_date: string
  auto_join?: boolean
  status?: TaskStatus
  notify_on_create?: boolean
}

export interface TaskAdminUpdatePayload {
  title?: string | null
  description?: string | null
  target_value?: number | null
  reward_points_type?: PointsType | null
  reward_points?: number | null
  start_date?: string | null
  end_date?: string | null
  auto_join?: boolean | null
  status?: TaskStatus | null
}

export interface TaskProgressParticipant {
  driver_id: string
  driver_display_name?: string | null
  progress: number
  target_value: number
  percent: number
  is_completed: boolean
  completed_at?: string | null
  joined_at?: string | null
}

export interface TaskProgressResponse {
  task_id: string
  title?: string
  target_value: number
  participants_count: number
  completed_count: number
  average_progress?: number | null
  items: TaskProgressParticipant[]
}

export type CompetitionCriteria = 'max_points' | 'max_rides'
export type CompetitionStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'finalizing'
  | 'completed'

export interface PrizePlaceItem {
  place: number
  points: number
}

export interface CompetitionAdminItem {
  id: string
  park_id: string
  title: string
  description?: string | null
  criteria: CompetitionCriteria
  count_points_type?: PointsType | null
  start_date: string
  end_date: string
  prize_places: number
  prizes: PrizePlaceItem[]
  prize_points_type: PointsType
  status: CompetitionStatus
  participants_count?: number | null
  created_at: string
  updated_at: string
}

export interface CompetitionAdminListResponse {
  items: CompetitionAdminItem[]
  total?: number
  page?: number
  page_size?: number
}

export interface CompetitionAdminCreatePayload {
  park_id: string
  title: string
  description?: string | null
  criteria: CompetitionCriteria
  count_points_type?: PointsType | null
  start_date: string
  end_date: string
  prize_places: number
  prizes: PrizePlaceItem[]
  prize_points_type: PointsType
  status?: CompetitionStatus
}

export interface CompetitionAdminUpdatePayload {
  title?: string | null
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  prize_places?: number | null
  prizes?: PrizePlaceItem[] | null
  prize_points_type?: PointsType | null
  status?: CompetitionStatus | null
}

export interface CompetitionLeaderboardItem {
  rank: number
  driver_id: string
  display_name?: string | null
  score: number
  is_me?: boolean
}

export interface CompetitionLeaderboardResponse {
  competition_id: string
  criteria: CompetitionCriteria
  items: CompetitionLeaderboardItem[]
}

export interface CompetitionFinalizeResponse {
  message: string
  status?: CompetitionStatus
}

export interface ReferralSettingsResponse {
  park_id: string
  is_active: boolean
  rides_required: number
  referrer_bonus: number
  referee_bonus: number
  bonus_points_type: PointsType
  max_referrals: number
  share_text_template: string
}

export interface ReferralSettingsUpdatePayload {
  is_active?: boolean
  rides_required?: number
  referrer_bonus?: number
  referee_bonus?: number
  bonus_points_type?: PointsType
  max_referrals?: number
  share_text_template?: string
}

export interface ReferralTopReferrerItem {
  driver_id: string
  display_name?: string | null
  total_referrals: number
  activated_referrals: number
  points_earned?: number
}

export interface ReferralStatsAdminResponse {
  park_id?: string | null
  total_referrals: number
  activated_referrals: number
  pending_referrals: number
  total_referrer_bonus_paid: number
  total_referee_bonus_paid: number
  /** Optional — not always returned by live API */
  points_awarded?: number
  top_referrers?: ReferralTopReferrerItem[]
}

export type PushNotifyCategory =
  | 'earn_points'
  | 'tasks'
  | 'competitions'
  | 'referrals'
  | 'promo'

export interface PushNotifyPayload {
  park_id: string
  title: string
  body: string
  driver_ids?: string[] | null
  category?: PushNotifyCategory
  data?: Record<string, string> | null
}

export interface PushNotifyResponse {
  success_count: number
  failure_count: number
  devices_targeted: number
  detail?: string | null
  errors?: string[]
}
