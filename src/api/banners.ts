import { http } from './http'
import { toFormData } from '@/utils/formData'
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

  create(payload: Omit<BannerCreatePayload, 'image_url'> & { image: File }) {
    const { image, ...rest } = payload
    return http.post<BannerItem>(
      '/super-admin/banners',
      toFormData({ ...rest, image }),
    )
  },

  getById(bannerId: string) {
    return http.get<BannerItem>(`/super-admin/banners/${bannerId}`)
  },

  update(
    bannerId: string,
    payload: Omit<BannerUpdatePayload, 'image_url'> & { image?: File | null },
  ) {
    const { image, ...rest } = payload
    return http.patch<BannerItem>(
      `/super-admin/banners/${bannerId}`,
      toFormData({ ...rest, image: image ?? undefined }),
    )
  },

  remove(bannerId: string) {
    return http.delete<MessageResponse>(`/super-admin/banners/${bannerId}`)
  },
}
