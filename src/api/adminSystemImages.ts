import { http } from './http'
import { toFormData } from '@/utils/formData'
import type { SystemImageItem, SystemImageListResponse } from '@/types/api'

export interface SystemImagesQuery {
  page?: number
  page_size?: number
}

export const adminSystemImagesApi = {
  list(params: SystemImagesQuery = {}) {
    return http.get<SystemImageListResponse>('/admin/system-images', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 100,
      },
    })
  },

  create(payload: { title: string; file: File }) {
    return http.post<SystemImageItem>(
      '/admin/system-images',
      toFormData({
        title: payload.title,
        file: payload.file,
      }),
    )
  },

  update(imageId: string, payload: { title?: string; file?: File | null }) {
    return http.patch<SystemImageItem>(
      `/admin/system-images/${imageId}`,
      toFormData({
        title: payload.title,
        file: payload.file ?? undefined,
      }),
    )
  },

  remove(imageId: string) {
    return http.delete(`/admin/system-images/${imageId}`)
  },
}
