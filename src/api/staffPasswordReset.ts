import axios from 'axios'
import { http } from './http'
import { API_BASE_URL } from '@/config'
import type {
  AdminGhostSessionResponse,
  StaffPasswordResetMessage,
  StaffPasswordResetMessageListResponse,
  StaffPasswordResetRoom,
  StaffPasswordResetRoomListResponse,
} from '@/types/staffPasswordReset'

const GHOST_KEY = 'lotax_staff_ghost_token'

export const staffGhostToken = {
  get: () => sessionStorage.getItem(GHOST_KEY),
  set: (token: string) => sessionStorage.setItem(GHOST_KEY, token),
  clear: () => sessionStorage.removeItem(GHOST_KEY),
}

function ghostHttp() {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${staffGhostToken.get() ?? ''}`,
    },
  })
}

export const staffPasswordResetApi = {
  openSession(email: string) {
    return axios.post<AdminGhostSessionResponse>(
      `${API_BASE_URL}/auth/admin/password-reset/session`,
      { email },
      { headers: { Accept: 'application/json' } },
    )
  },

  openRoom() {
    return ghostHttp().post<StaffPasswordResetRoom>('/password-reset/staff/rooms')
  },

  ghostMessages(roomId: string) {
    return ghostHttp().get<StaffPasswordResetMessageListResponse>(
      `/password-reset/staff/rooms/${roomId}/messages`,
      { params: { page: 1, page_size: 100 } },
    )
  },

  ghostSend(roomId: string, body: string) {
    return ghostHttp().post<StaffPasswordResetMessage>(
      `/password-reset/staff/rooms/${roomId}/messages`,
      { body },
    )
  },

  listRooms(status: 'open' | 'closed' | 'all' = 'open') {
    return http.get<StaffPasswordResetRoomListResponse>('/password-reset/staff/rooms', {
      params: { status, page: 1, page_size: 50 },
    })
  },

  adminMessages(roomId: string) {
    return http.get<StaffPasswordResetMessageListResponse>(
      `/password-reset/staff/admin/rooms/${roomId}/messages`,
      { params: { page: 1, page_size: 100 } },
    )
  },

  adminSend(roomId: string, body: string) {
    return http.post<StaffPasswordResetMessage>(
      `/password-reset/staff/admin/rooms/${roomId}/messages`,
      { body },
    )
  },

  closeRoom(roomId: string) {
    return http.post<StaffPasswordResetRoom>(
      `/password-reset/staff/admin/rooms/${roomId}/close`,
    )
  },
}
