import { http } from './http'
import type {
  PointsRuleCreatePayload,
  PointsRuleItem,
  PointsRuleListResponse,
  PointsRuleUpdatePayload,
} from '@/types/api'

export interface AdminRulesQuery {
  park_id?: string
}

export const adminRulesApi = {
  list(params: AdminRulesQuery = {}) {
    return http.get<PointsRuleListResponse>('/admin/rules', {
      params: {
        park_id: params.park_id,
      },
    })
  },
  create(payload: PointsRuleCreatePayload) {
    return http.post<PointsRuleItem>('/admin/rules', payload)
  },
  update(ruleId: string, payload: PointsRuleUpdatePayload) {
    return http.patch<PointsRuleItem>(`/admin/rules/${ruleId}`, payload)
  },
  remove(ruleId: string) {
    return http.delete<PointsRuleItem>(`/admin/rules/${ruleId}`)
  },
}
