import { http } from './http'
import type { ReportQuery, ReportSummary } from '@/types/api'

function reportParams(query: ReportQuery) {
  return {
    start_date: query.start_date,
    end_date: query.end_date,
    park_id: query.park_id || undefined,
  }
}

export const reportsApi = {
  summary(query: ReportQuery) {
    return http.get<ReportSummary>('/reports/summary', {
      params: reportParams(query),
    })
  },

  exportExcel(query: ReportQuery) {
    return http.get<Blob>('/reports/export/excel', {
      params: reportParams(query),
      responseType: 'blob',
    })
  },

  exportCsv(query: ReportQuery) {
    return http.get<Blob>('/reports/export/csv', {
      params: reportParams(query),
      responseType: 'blob',
    })
  },
}
