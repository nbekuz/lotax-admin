import { http } from './http'
import { toFormData } from '@/utils/formData'
import { scopeToFormFields } from '@/utils/scope'
import type {
  RewardAdminCreatePayload,
  RewardAdminItem,
  RewardAdminListResponse,
  RewardAdminUpdatePayload,
} from '@/types/api'

export interface AdminRewardsQuery {
  park_id?: string
  page?: number
  page_size?: number
}

export const adminRewardsApi = {
  list(params: AdminRewardsQuery = {}) {
    return http.get<RewardAdminListResponse>('/admin/rewards', {
      params: {
        park_id: params.park_id,
        page: params.page ?? 1,
        page_size: params.page_size ?? 50,
      },
    })
  },

  create(payload: RewardAdminCreatePayload & { image?: File | null }) {
    const { image, park_ids, ...rest } = payload
    return http.post<RewardAdminItem>(
      '/admin/rewards',
      toFormData({
        park_id: rest.park_id,
        title: rest.title,
        type: rest.type,
        points_type: rest.points_type,
        points_cost: rest.points_cost,
        description: rest.description,
        stock_total: rest.stock_total,
        min_tier: rest.min_tier,
        sort_order: rest.sort_order,
        is_active: rest.is_active,
        one_per_driver: rest.one_per_driver,
        raffle_date: rest.raffle_date,
        ...scopeToFormFields({
          scope_type: rest.scope_type,
          park_group_id: rest.park_group_id,
          park_ids,
        }),
        image: image ?? undefined,
      }),
    )
  },

  update(
    rewardId: string,
    payload: RewardAdminUpdatePayload & {
      image?: File | null
      clear_image?: boolean
    },
  ) {
    const { image, clear_image, park_ids, ...rest } = payload
    return http.patch<RewardAdminItem>(
      `/admin/rewards/${rewardId}`,
      toFormData({
        title: rest.title,
        description: rest.description,
        points_cost: rest.points_cost,
        stock_total: rest.stock_total,
        min_tier: rest.min_tier,
        sort_order: rest.sort_order,
        is_active: rest.is_active,
        one_per_driver: rest.one_per_driver,
        raffle_date: rest.raffle_date,
        ...scopeToFormFields({
          scope_type: rest.scope_type,
          park_group_id: rest.park_group_id,
          park_ids,
        }),
        clear_image,
        image: image ?? undefined,
      }),
    )
  },

  remove(rewardId: string) {
    return http.delete<RewardAdminItem>(`/admin/rewards/${rewardId}`)
  },
}
