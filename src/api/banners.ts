import { http } from './http'
import type {
  BannerCreatePayload,
  BannerItem,
  BannerListResponse,
  BannerUpdatePayload,
  MessageResponse,
} from '@/types/api'

export interface BannersQuery {
  page?: number
  page_size?: number
  is_active?: boolean | null
}

export const bannersApi = {
  list(params: BannersQuery = {}) {
    return http.get<BannerListResponse>('/super-admin/banners', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
        is_active:
          params.is_active === null || params.is_active === undefined
            ? undefined
            : params.is_active,
      },
    })
  },

  create(payload: BannerCreatePayload) {
    return http.post<BannerItem>('/super-admin/banners', payload)
  },

  getById(bannerId: string) {
    return http.get<BannerItem>(`/super-admin/banners/${bannerId}`)
  },

  update(bannerId: string, payload: BannerUpdatePayload) {
    return http.patch<BannerItem>(`/super-admin/banners/${bannerId}`, payload)
  },

  remove(bannerId: string) {
    return http.delete<MessageResponse>(`/super-admin/banners/${bannerId}`)
  },
}
