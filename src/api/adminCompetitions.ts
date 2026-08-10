import { http } from './http'
import { toFormData } from '@/utils/formData'
import type {
  CompetitionAdminCreatePayload,
  CompetitionAdminItem,
  CompetitionAdminListResponse,
  CompetitionAdminUpdatePayload,
  CompetitionFinalizeResponse,
  CompetitionLeaderboardResponse,
} from '@/types/api'

export interface AdminCompetitionsQuery {
  park_id?: string
}

export const adminCompetitionsApi = {
  list(params: AdminCompetitionsQuery = {}) {
    return http.get<CompetitionAdminListResponse>('/admin/competitions', {
      params: { park_id: params.park_id },
    })
  },

  create(payload: CompetitionAdminCreatePayload & { image?: File | null }) {
    const { image, prizes, ...rest } = payload
    return http.post<CompetitionAdminItem>(
      '/admin/competitions',
      toFormData({
        park_id: rest.park_id,
        title: rest.title,
        criteria: rest.criteria,
        count_points_type: rest.count_points_type,
        prize_points_type: rest.prize_points_type,
        prize_places: rest.prize_places,
        start_date: rest.start_date,
        end_date: rest.end_date,
        description: rest.description,
        status: rest.status,
        prizes: prizes ? JSON.stringify(prizes) : undefined,
        image: image ?? undefined,
      }),
    )
  },

  update(
    competitionId: string,
    payload: CompetitionAdminUpdatePayload & {
      image?: File | null
      clear_image?: boolean
    },
  ) {
    const { image, clear_image, prizes, ...rest } = payload
    return http.patch<CompetitionAdminItem>(
      `/admin/competitions/${competitionId}`,
      toFormData({
        title: rest.title,
        description: rest.description,
        start_date: rest.start_date,
        end_date: rest.end_date,
        prize_places: rest.prize_places,
        prize_points_type: rest.prize_points_type,
        status: rest.status,
        prizes: prizes ? JSON.stringify(prizes) : undefined,
        clear_image,
        image: image ?? undefined,
      }),
    )
  },

  remove(competitionId: string) {
    return http.delete<CompetitionAdminItem>(
      `/admin/competitions/${competitionId}`,
    )
  },

  leaderboard(competitionId: string) {
    return http.get<CompetitionLeaderboardResponse>(
      `/admin/competitions/${competitionId}/leaderboard`,
    )
  },

  finalize(competitionId: string) {
    return http.post<CompetitionFinalizeResponse>(
      `/admin/competitions/${competitionId}/finalize`,
    )
  },
}
