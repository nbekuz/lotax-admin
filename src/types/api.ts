export type AdminRole = 'director' | 'admin' | 'manager' | 'super_admin'
export type AdminStatus = 'active' | 'blocked' | 'inactive'
export type DriverStatus = 'active' | 'blocked' | 'pending'
export type DriverTier = 'bronze' | 'silver' | 'gold' | 'platinum'
/** Park staff that a director may create (`POST /admins`, role=manager only). */
export type StaffAssignableRole = 'manager'

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

export interface PlatformAdminCreatePayload {
  email: string
  password: string
  first_name: string
  last_name: string
  role?: 'admin'
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
  phone?: string | null
  contact_person?: string | null
  subscription_active: boolean
  is_active: boolean
  notes?: string | null
  parks_count?: number
  drivers_count?: number
  completed_orders_count?: number
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
  phone?: string | null
  contact_person?: string | null
  subscription_active?: boolean
  notes?: string | null
}

export interface OrganizationUpdatePayload {
  name?: string | null
  legal_name?: string | null
  phone?: string | null
  contact_person?: string | null
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

/** Admin: `GET /drivers/{id}/rides` */
export interface DriverRideItem {
  id: string
  ride_date: string
  pickup_address?: string | null
  dropoff_address?: string | null
  fare_amount?: number | null
  currency: string
  points_system_earned: number
  points_park_earned: number
}

export interface DriverRideListResponse {
  items: DriverRideItem[]
  total: number
  page: number
  page_size: number
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
  | 'raffle_coupon'
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

export interface AdjustTierPayload {
  tier: DriverTier
  reason: string
  expires_at?: string | null
}

/* ── Multipark scope ── */

export type ScopeType = 'all' | 'group' | 'specific'

export interface ParkScopeInfo {
  id: string
  scope_type: ScopeType
  park_group_id?: string | null
  park_ids?: string[] | null
  organization_id?: string | null
}

export interface ScopeFieldsPayload {
  scope_type?: ScopeType
  park_group_id?: string | null
  park_ids?: string[] | null
}

/* ── Park groups ── */

export interface ParkGroupItem {
  id: string
  organization_id: string
  name: string
  description?: string | null
  color: string
  is_active: boolean
  park_ids: string[]
  parks_count?: number
  created_at: string
  updated_at: string
}

export interface ParkGroupListResponse {
  items: ParkGroupItem[]
}

export interface ParkGroupCreatePayload {
  name: string
  description?: string | null
  color?: string | null
  park_ids: string[]
  is_active?: boolean
}

export interface ParkGroupUpdatePayload {
  name?: string | null
  description?: string | null
  color?: string | null
  park_ids?: string[] | null
  is_active?: boolean | null
}

/* ── Org leaderboard settings (ТОП-5) ── */

export interface LeaderboardSettingsResponse {
  organization_id: string
  scope: ParkScopeInfo
  /** Ignored by API; ranking metric is always rides. */
  points_type?: PointsType
  show_park_name?: boolean
}

export interface LeaderboardSettingsUpdatePayload {
  scope_type: ScopeType
  park_group_id?: string | null
  park_ids?: string[]
  /** Deprecated — backend ignores this. Sent as `park` for older servers. */
  points_type?: PointsType
  show_park_name?: boolean
}

/* ── Park tier settings ── */

export interface ParkTierLevelItem {
  rides?: number
  rides_threshold?: number
  coefficient: number
  min_month?: number
  min_rides_per_month?: number
}

export interface ParkTierSettingsResponse {
  park_id: string
  apply_tiers: boolean
  bronze: ParkTierLevelItem
  silver: ParkTierLevelItem
  gold: ParkTierLevelItem
  platinum: ParkTierLevelItem
  silver_rides?: number
  gold_rides?: number
  platinum_rides?: number
  silver_coefficient?: number
  gold_coefficient?: number
  platinum_coefficient?: number
  silver_min_month?: number
  gold_min_month?: number
  platinum_min_month?: number
}

export interface ParkTierLevelUpdate {
  rides_threshold?: number
  coefficient?: number
  min_rides_per_month?: number
}

export interface ParkTierSettingsUpdatePayload {
  apply_tiers: boolean
  silver?: ParkTierLevelUpdate
  gold?: ParkTierLevelUpdate
  platinum?: ParkTierLevelUpdate
  silver_rides?: number
  gold_rides?: number
  platinum_rides?: number
  silver_coefficient?: number
  gold_coefficient?: number
  platinum_coefficient?: number
  silver_min_month?: number
  gold_min_month?: number
  platinum_min_month?: number
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
  one_per_driver?: boolean
  raffle_date?: string | null
  scope_id?: string | null
  scope?: ParkScopeInfo | null
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
  one_per_driver?: boolean
  raffle_date?: string | null
  scope_type?: ScopeType
  park_group_id?: string | null
  park_ids?: string[] | null
}

export interface RewardAdminUpdatePayload {
  title?: string | null
  description?: string | null
  points_cost?: number | null
  stock_total?: number | null
  min_tier?: DriverTier | null
  sort_order?: number | null
  is_active?: boolean | null
  one_per_driver?: boolean | null
  raffle_date?: string | null
  scope_type?: ScopeType | null
  park_group_id?: string | null
  park_ids?: string[] | null
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
  | 'claim'
  | 'days_active'
export type TaskStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'completed'
  | 'cancelled'

export interface TaskAdminItem {
  id: string
  park_id: string
  title: string
  description?: string | null
  image_url?: string | null
  task_type: TaskType | string
  target_value: number
  reward_points_type: PointsType
  reward_points: number
  start_date: string
  end_date: string
  auto_join: boolean
  status: TaskStatus | string
  notify_on_create?: boolean
  template_key?: string | null
  period_days?: number | null
  is_claimable?: boolean
  renew_on_complete?: boolean
  scope_id?: string | null
  scope?: ParkScopeInfo | null
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
  scope_type?: ScopeType
  park_group_id?: string | null
  park_ids?: string[] | null
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
  notify_on_create?: boolean | null
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
  image_url?: string | null
  criteria: CompetitionCriteria
  count_points_type?: PointsType | null
  start_date: string
  end_date: string
  prize_places: number
  prizes: PrizePlaceItem[]
  prize_points_type: PointsType
  status: CompetitionStatus
  participants_count?: number | null
  scope_id?: string | null
  scope?: ParkScopeInfo | null
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
  scope_type?: ScopeType
  park_group_id?: string | null
  park_ids?: string[] | null
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
  /** Ride count — ranking metric. */
  score: number
  rides?: number
  is_me?: boolean
}

export interface CompetitionLeaderboardResponse {
  competition_id: string
  criteria: CompetitionCriteria
  metric?: string
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

/* ── Task templates (park catalog) ── */

export type TaskTemplateKey =
  | 'welcome_bonus'
  | 'first_order'
  | 'rides_100_7d'
  | 'rides_160_14d'
  | 'rides_500_30d'
  | 'rides_5000_365d'
  | 'days_120_park'
  | string

export interface TaskTemplateItem {
  key: TaskTemplateKey
  title: string
  description: string
  task_type: string
  target_value: number
  default_reward_points: number
  period_days?: number | null
  is_claimable: boolean
  renew_on_complete: boolean
  enabled?: boolean
  task_id?: string | null
  task_status?: string | null
}

export interface TaskTemplateListResponse {
  items: TaskTemplateItem[]
}

export interface TaskTemplateEnablePayload {
  park_id: string
  reward_points?: number | null
  reward_points_type?: PointsType
}
