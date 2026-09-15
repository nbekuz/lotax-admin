import { http } from './http'
import type { MessageResponse } from '@/types/api'
import type {
  PasswordResetMessage,
  PasswordResetMessageListResponse,
  PasswordResetRoom,
  PasswordResetRoomListResponse,
  PasswordResetRoomsFilter,
} from '@/types/passwordReset'

export interface PasswordResetRoomsQuery {
  status?: PasswordResetRoomsFilter
  page?: number
  page_size?: number
}

export const passwordResetApi = {
  listRooms(params: PasswordResetRoomsQuery = {}) {
    return http.get<PasswordResetRoomListResponse>('/password-reset/rooms', {
      params: {
        status: params.status ?? 'open',
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
      },
    })
  },

  listMessages(roomId: string, params: { page?: number; page_size?: number } = {}) {
    return http.get<PasswordResetMessageListResponse>(
      `/password-reset/admin/rooms/${roomId}/messages`,
      {
        params: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 100,
        },
      },
    )
  },

  sendMessage(roomId: string, body: string) {
    return http.post<PasswordResetMessage>(
      `/password-reset/admin/rooms/${roomId}/messages`,
      { body },
    )
  },

  closeRoom(roomId: string) {
    return http.post<PasswordResetRoom | MessageResponse>(
      `/password-reset/admin/rooms/${roomId}/close`,
    )
  },
}
