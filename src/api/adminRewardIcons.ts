import { http } from './http'
import { toFormData } from '@/utils/formData'
import type { RewardIconItem, RewardIconListResponse } from '@/types/api'

export interface RewardIconsQuery {
  page?: number
  page_size?: number
}

export const adminRewardIconsApi = {
  list(params: RewardIconsQuery = {}) {
    return http.get<RewardIconListResponse>('/admin/reward-icons', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 100,
      },
    })
  },

  get(iconId: string) {
    return http.get<RewardIconItem>(`/admin/reward-icons/${iconId}`)
  },

  create(payload: { title: string; file: File }) {
    return http.post<RewardIconItem>(
      '/admin/reward-icons',
      toFormData({
        title: payload.title,
        file: payload.file,
      }),
    )
  },

  update(
    iconId: string,
    payload: { title?: string; file?: File | null },
  ) {
    return http.patch<RewardIconItem>(
      `/admin/reward-icons/${iconId}`,
      toFormData({
        title: payload.title,
        file: payload.file ?? undefined,
      }),
    )
  },

  remove(iconId: string) {
    return http.delete(`/admin/reward-icons/${iconId}`)
  },
}
