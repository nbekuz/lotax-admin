import { defineStore } from 'pinia'
import { authApi } from '@/api/auth'
import { tokenStorage } from '@/utils/tokenStorage'
import { extractErrorMessage } from '@/utils/labels'
import type { AdminLoginPayload, AdminProfile, AdminRole, StaffAssignableRole } from '@/types/api'

interface AuthState {
  admin: AdminProfile | null
  loading: boolean
  bootstrapped: boolean
  error: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    admin: null,
    loading: false,
    bootstrapped: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (s) => Boolean(s.admin),
    role: (s): AdminRole | null => s.admin?.role ?? null,
    isDirector: (s) => s.admin?.role === 'director',
    isAdmin: (s) => s.admin?.role === 'admin' || s.admin?.role === 'director',
    canEditBalance: (s) =>
      ['director', 'admin', 'manager'].includes(s.admin?.role ?? ''),
    canEditStatus: (s) => ['director', 'admin'].includes(s.admin?.role ?? ''),
    canSync: (s) => ['director', 'admin'].includes(s.admin?.role ?? ''),
    canViewPdn: (s) => s.admin?.role === 'director',
    canManageStaff: (s) => ['director', 'admin'].includes(s.admin?.role ?? ''),
    creatableRoles: (s): StaffAssignableRole[] => {
      if (s.admin?.role === 'director') return ['admin', 'manager']
      if (s.admin?.role === 'admin') return ['manager']
      return []
    },
    fullName: (s) => {
      if (!s.admin) return ''
      return `${s.admin.first_name} ${s.admin.last_name}`.trim()
    },
  },

  actions: {
    async bootstrap() {
      if (!tokenStorage.hasTokens()) {
        this.admin = null
        this.bootstrapped = true
        return
      }
      this.loading = true
      try {
        const { data } = await authApi.me()
        this.admin = data
        this.error = null
      } catch {
        tokenStorage.clear()
        this.admin = null
      } finally {
        this.loading = false
        this.bootstrapped = true
      }
    },

    async login(payload: AdminLoginPayload) {
      this.loading = true
      this.error = null
      try {
        const { data } = await authApi.login(payload)
        tokenStorage.setTokens(data.access_token, data.refresh_token)
        const me = await authApi.me()
        this.admin = me.data
        return true
      } catch (e) {
        this.error = extractErrorMessage(e, 'Неверный email или пароль')
        tokenStorage.clear()
        this.admin = null
        return false
      } finally {
        this.loading = false
      }
    },

    logout() {
      tokenStorage.clear()
      this.admin = null
      this.error = null
    },
  },
})
