import { http } from './http'
import type { PdnAuditLogListResponse } from '@/types/api'

export interface PdnAuditQuery {
  page?: number
  page_size?: number
}

export const pdnApi = {
  auditLogs(params: PdnAuditQuery = {}) {
    return http.get<PdnAuditLogListResponse>('/pdn/audit-logs', {
      params: {
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
      },
    })
  },
}
