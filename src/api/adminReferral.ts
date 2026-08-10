import { http } from './http'
import type {
  ReferralSettingsResponse,
  ReferralSettingsUpdatePayload,
  ReferralStatsAdminResponse,
} from '@/types/api'

export interface AdminReferralQuery {
  park_id?: string
}

export const adminReferralApi = {
  getSettings(params: AdminReferralQuery = {}) {
    return http.get<ReferralSettingsResponse>('/admin/referral/settings', {
      params: { park_id: params.park_id },
    })
  },
  updateSettings(
    params: AdminReferralQuery,
    payload: ReferralSettingsUpdatePayload,
  ) {
    return http.put<ReferralSettingsResponse>('/admin/referral/settings', payload, {
      params: { park_id: params.park_id },
    })
  },
  getStats(params: AdminReferralQuery = {}) {
    return http.get<ReferralStatsAdminResponse>('/admin/referral/stats', {
      params: { park_id: params.park_id },
    })
  },
}
