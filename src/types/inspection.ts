export interface InspectionState {
  session_id?: string | null
  organization_id?: string | null
  organization_name?: string | null
  status: string
  counting: boolean
  used_seconds: number
  remaining_seconds: number
  daily_limit_seconds: number
  accrued_seconds?: number
  inactivity_seconds?: number
  token?: string | null
}
