import { defineStore } from 'pinia'
import { authApi } from '@/api/auth'
import { tokenStorage } from '@/utils/tokenStorage'
import { extractErrorMessage } from '@/utils/labels'
import type {
  AdminLoginPayload,
  AdminProfile,
  AdminRole,
  PasswordChangePayload,
  StaffAssignableRole,
} from '@/types/api'

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
    isSuperAdmin: (s) => s.admin?.role === 'super_admin',
    /** Platform operator: org/park CRUD, no driver PDN. */
    isPlatformAdmin: (s) => s.admin?.role === 'admin',
    isPlatformOperator: (s) =>
      ['super_admin', 'admin'].includes(s.admin?.role ?? ''),
    isDirector: (s) => s.admin?.role === 'director',
    isManager: (s) => s.admin?.role === 'manager',
    /** Park ЛК: director + manager. Platform `admin` is not park staff. */
    isParkAdmin: (s) =>
      ['director', 'manager'].includes(s.admin?.role ?? ''),
    homePath: (s) =>
      ['super_admin', 'admin'].includes(s.admin?.role ?? '')
        ? '/organizations'
        : '/organization',
    organizationId: (s) => s.admin?.organization_id ?? null,
    canEditBalance: (s) => s.admin?.role === 'director',
    canEditStatus: (s) => s.admin?.role === 'director',
    canSync: (s) => s.admin?.role === 'director',
    canViewPdn: (s) => s.admin?.role === 'director',
    canViewPdnAudit: (s) => s.admin?.role === 'director',
    canViewReports: (s) => s.admin?.role === 'director',
    canManageBanners: (s) => s.admin?.role === 'super_admin',
    canManageStaff: (s) => s.admin?.role === 'director',
    canManageYandex: (s) => s.admin?.role === 'director',
    canCreateDriver: (s) => s.admin?.role === 'director',
    canManageRewards: (s) => s.admin?.role === 'director',
    canViewRewards: (s) =>
      ['director', 'manager'].includes(s.admin?.role ?? ''),
    canModerateOrders: (s) =>
      ['director', 'manager'].includes(s.admin?.role ?? ''),
    canManageRules: (s) => s.admin?.role === 'director',
    canAdjustPoints: (s) => s.admin?.role === 'director',
    canManageTasks: (s) => s.admin?.role === 'director',
    canViewTasks: (s) =>
      ['director', 'manager'].includes(s.admin?.role ?? ''),
    canManageCompetitions: (s) => s.admin?.role === 'director',
    canViewCompetitions: (s) =>
      ['director', 'manager'].includes(s.admin?.role ?? ''),
    canManageReferral: (s) => s.admin?.role === 'director',
    canFinalizeCompetition: (s) => s.admin?.role === 'director',
    canManagePlatformAdmins: (s) => s.admin?.role === 'super_admin',
    canManagePlatformSettings: (s) => s.admin?.role === 'super_admin',
    canManageParkGroups: (s) => s.admin?.role === 'director',
    canViewParkGroups: (s) =>
      ['director', 'manager'].includes(s.admin?.role ?? ''),
    canManageLeaderboardSettings: (s) => s.admin?.role === 'director',
    canViewLeaderboardSettings: (s) =>
      ['director', 'manager'].includes(s.admin?.role ?? ''),
    canManageTierSettings: (s) => s.admin?.role === 'director',
    canViewTierSettings: (s) =>
      ['director', 'manager'].includes(s.admin?.role ?? ''),
    canAdjustTier: (s) => s.admin?.role === 'director',
    canViewChat: (s) =>
      ['director', 'manager', 'super_admin'].includes(s.admin?.role ?? ''),
    canViewPasswordReset: (s) =>
      ['director', 'manager'].includes(s.admin?.role ?? ''),
    canUseSupportChat: (s) => s.admin?.role === 'director',
    /** Soft-delete org/park — super_admin only. Platform `admin` gets 403. */
    canDeleteOrganizations: (s) => s.admin?.role === 'super_admin',
    /** Director may adjust park points only; system points → 403. */
    adjustPointsTypes: (s): Array<'park'> => {
      if (s.admin?.role === 'director') return ['park']
      return []
    },
    creatableRoles: (s): StaffAssignableRole[] => {
      if (s.admin?.role === 'director') return ['manager']
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

    async changePassword(payload: PasswordChangePayload) {
      const { data } = await authApi.changePassword(payload)
      return data
    },
  },
})
