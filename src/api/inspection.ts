import { http } from '@/api/http'
import type { InspectionState } from '@/types/inspection'

export const inspectionApi = {
  quota() {
    return http.get<InspectionState>('/super-admin/inspection/quota')
  },
  start(payload: {
    organization_id: string
    password: string
    code: string
    purpose?: string
  }) {
    return http.post<InspectionState>('/super-admin/inspection/start', payload)
  },
  heartbeat(payload: { active: boolean; seq: number }) {
    return http.post<InspectionState>('/super-admin/inspection/heartbeat', payload)
  },
  end() {
    return http.post<InspectionState>('/super-admin/inspection/end')
  },
}
