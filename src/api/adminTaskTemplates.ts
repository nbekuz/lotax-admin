import { http } from './http'
import type {
  TaskAdminItem,
  TaskTemplateEnablePayload,
  TaskTemplateListResponse,
} from '@/types/api'

export const adminTaskTemplatesApi = {
  list(parkId: string) {
    return http.get<TaskTemplateListResponse>('/admin/task-templates', {
      params: { park_id: parkId },
    })
  },

  enable(templateKey: string, payload: TaskTemplateEnablePayload) {
    return http.post<TaskAdminItem>(
      `/admin/task-templates/${templateKey}/enable`,
      payload,
    )
  },

  disable(templateKey: string, parkId: string) {
    return http.post<TaskAdminItem>(
      `/admin/task-templates/${templateKey}/disable`,
      null,
      { params: { park_id: parkId } },
    )
  },
}
