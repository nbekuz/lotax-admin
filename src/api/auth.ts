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
  verifyTwoFactor(challengeToken: string, code: string) {
    return http.post<TokenResponse>('/auth/admin/2fa/verify', {
      challenge_token: challengeToken,
      code,
    })
  },
  setupTwoFactor() {
    return http.post<{ secret: string; otpauth_uri: string }>('/auth/admin/2fa/setup')
  },
  confirmTwoFactor(code: string) {
    return http.post<TokenResponse>('/auth/admin/2fa/confirm', { code })
  },
  logout(accessToken?: string) {
    return http.post<{ message: string }>(
      '/auth/logout',
      null,
      accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
    )
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
