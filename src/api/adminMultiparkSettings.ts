import { http } from './http'
import type {
  LeaderboardSettingsResponse,
  LeaderboardSettingsUpdatePayload,
  ParkTierSettingsResponse,
  ParkTierSettingsUpdatePayload,
} from '@/types/api'

export const adminLeaderboardSettingsApi = {
  get() {
    return http.get<LeaderboardSettingsResponse>('/admin/leaderboard-settings')
  },

  update(payload: LeaderboardSettingsUpdatePayload) {
    return http.put<LeaderboardSettingsResponse>(
      '/admin/leaderboard-settings',
      payload,
    )
  },
}

export const adminParkTierSettingsApi = {
  get(parkId: string) {
    return http.get<ParkTierSettingsResponse>(
      `/admin/parks/${parkId}/tier-settings`,
    )
  },

  update(parkId: string, payload: ParkTierSettingsUpdatePayload) {
    return http.put<ParkTierSettingsResponse>(
      `/admin/parks/${parkId}/tier-settings`,
      payload,
    )
  },
}
