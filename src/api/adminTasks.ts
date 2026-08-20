import { http } from './http'
import { toFormData } from '@/utils/formData'
import { scopeToFormFields } from '@/utils/scope'
import type {
  TaskAdminCreatePayload,
  TaskAdminItem,
  TaskAdminListResponse,
  TaskAdminUpdatePayload,
  TaskProgressResponse,
} from '@/types/api'

export interface AdminTasksQuery {
  park_id?: string
}

export const adminTasksApi = {
  list(params: AdminTasksQuery = {}) {
    return http.get<TaskAdminListResponse>('/admin/tasks', {
      params: { park_id: params.park_id },
    })
  },

  create(payload: TaskAdminCreatePayload & { image?: File | null }) {
    const { image, park_ids, ...rest } = payload
    return http.post<TaskAdminItem>(
      '/admin/tasks',
      toFormData({
        park_id: rest.park_id,
        title: rest.title,
        task_type: rest.task_type,
        target_value: rest.target_value,
        reward_points_type: rest.reward_points_type,
        reward_points: rest.reward_points,
        start_date: rest.start_date,
        end_date: rest.end_date,
        description: rest.description,
        auto_join: rest.auto_join,
        status: rest.status,
        notify_on_create: rest.notify_on_create,
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
    taskId: string,
    payload: TaskAdminUpdatePayload & {
      image?: File | null
      clear_image?: boolean
    },
  ) {
    const { image, clear_image, ...rest } = payload
    return http.patch<TaskAdminItem>(
      `/admin/tasks/${taskId}`,
      toFormData({
        title: rest.title,
        description: rest.description,
        target_value: rest.target_value,
        reward_points: rest.reward_points,
        start_date: rest.start_date,
        end_date: rest.end_date,
        auto_join: rest.auto_join,
        status: rest.status,
        notify_on_create: rest.notify_on_create,
        clear_image,
        image: image ?? undefined,
      }),
    )
  },

  remove(taskId: string) {
    return http.delete<TaskAdminItem>(`/admin/tasks/${taskId}`)
  },

  progress(taskId: string) {
    return http.get<TaskProgressResponse>(`/admin/tasks/${taskId}/progress`)
  },
}
