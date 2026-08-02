import { http } from './http'
import type {
  AdminLoginPayload,
  AdminProfile,
  MessageResponse,
  PasswordChangePayload,
  TokenResponse,
} from '@/types/api'

export const authApi = {
  login(payload: AdminLoginPayload) {
    return http.post<TokenResponse>('/auth/admin/login', payload)
  },
  me() {
    return http.get<AdminProfile>('/auth/me/admin')
  },
  refresh(refreshToken: string) {
    return http.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    })
  },
  changePassword(payload: PasswordChangePayload) {
    return http.patch<MessageResponse>('/auth/me/admin/password', payload)
  },
}
