import { http } from './http'
import type {
  AdminLoginPayload,
  AdminProfile,
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
}
