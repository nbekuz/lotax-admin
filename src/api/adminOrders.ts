import { http } from './http'
import type {
  OrderAdminListResponse,
  OrderApprovePayload,
  OrderRejectPayload,
  OrderStatus,
  PointsType,
  OrderAdminItem,
} from '@/types/api'

export interface AdminOrdersQuery {
  park_id?: string
  status?: OrderStatus | null
  points_type?: PointsType | null
  page?: number
  page_size?: number
}

export const adminOrdersApi = {
  list(params: AdminOrdersQuery = {}) {
    return http.get<OrderAdminListResponse>('/admin/orders', {
      params: {
        park_id: params.park_id || undefined,
        status: params.status || undefined,
        points_type: params.points_type || undefined,
        page: params.page ?? 1,
        page_size: params.page_size ?? 50,
      },
    })
  },
  approve(orderId: string, payload: OrderApprovePayload = {}) {
    return http.post<OrderAdminItem>(
      `/admin/orders/${orderId}/approve`,
      payload,
    )
  },
  reject(orderId: string, payload: OrderRejectPayload) {
    return http.post<OrderAdminItem>(
      `/admin/orders/${orderId}/reject`,
      payload,
    )
  },
}
