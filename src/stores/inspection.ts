import { defineStore } from 'pinia'
import { inspectionApi } from '@/api/inspection'
import { authApi } from '@/api/auth'
import { setInspectionToken } from '@/utils/inspectionMemory'
import { useAuthStore } from '@/stores/auth'
import { extractErrorMessage } from '@/utils/labels'

const INSPECTION_ROUTES = new Set([
  'organization',
  'organization-yandex',
  'drivers',
  'driver-detail',
  'rewards',
  'reward-icons',
  'system-images',
  'orders',
  'analytics-hub',
  'engagement-hub',
  'park-settings-hub',
  'team-hub',
  'rules',
  'tasks',
  'task-progress',
  'competitions',
  'competition-leaderboard',
  'referral',
  'park-groups',
  'leaderboard-settings',
  'tier-settings',
  'push',
  'sync',
  'reports',
  'pdn',
  'staff',
  'support-contacts',
  'driver-support',
  'driver-support-conversation',
  'chat',
  'chat-conversation',
  'password-reset',
  'system-raffles',
  'system-raffle-drivers',
  'profile',
])

let timer: number | null = null
let onActivity: ((event: Event) => void) | null = null

export function isInspectionRoute(name: unknown) {
  return typeof name === 'string' && INSPECTION_ROUTES.has(name)
}

export const useInspectionStore = defineStore('inspection', {
  state: () => ({
    active: false,
    organizationId: null as string | null,
    organizationName: '',
    remainingSeconds: 0,
    dailyLimitSeconds: 3600,
    inactivitySeconds: 60,
    counting: false,
    seq: 0,
    error: null as string | null,
    lastInputAt: 0,
  }),
  actions: {
    async start(payload: {
      organizationId: string
      organizationName: string
      password: string
      code: string
    }) {
      const { data } = await inspectionApi.start({
        organization_id: payload.organizationId,
        password: payload.password,
        code: payload.code,
        purpose: 'Проверка организации',
      })
      if (!data.token) throw new Error('Сервер не выдал сессию проверки')
      this.organizationId = data.organization_id || payload.organizationId
      this.organizationName = data.organization_name || payload.organizationName
      this.remainingSeconds = data.remaining_seconds
      this.dailyLimitSeconds = data.daily_limit_seconds
      this.inactivitySeconds = data.inactivity_seconds || 60
      this.counting = false
      this.seq = 0
      this.error = null
      this.lastInputAt = Date.now()
      this.active = true
      setInspectionToken(data.token)
      useAuthStore().inspecting = true
      this.bindActivity()
      this.armTimer()
      void this.pulse()
    },
    armTimer() {
      if (timer != null) window.clearInterval(timer)
      timer = window.setInterval(() => {
        void this.pulse()
      }, 20000)
    },
    bindActivity() {
      this.unbindActivity()
      const mark = () => {
        this.lastInputAt = Date.now()
      }
      onActivity = mark
      window.addEventListener('pointerdown', mark, { passive: true })
      window.addEventListener('keydown', mark)
      window.addEventListener('scroll', mark, { passive: true })
      window.addEventListener('wheel', mark, { passive: true })
    },
    unbindActivity() {
      if (!onActivity) return
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('scroll', onActivity)
      window.removeEventListener('wheel', onActivity)
      onActivity = null
    },
    userIsActive() {
      if (document.visibilityState === 'hidden') return false
      return Date.now() - this.lastInputAt < this.inactivitySeconds * 1000
    },
    async pulse() {
      if (!this.active) return
      this.seq += 1
      try {
        const { data } = await inspectionApi.heartbeat({
          active: this.userIsActive(),
          seq: this.seq,
        })
        this.remainingSeconds = data.remaining_seconds
        this.counting = data.counting
        if (data.status !== 'active') {
          this.error = 'Дневной лимит проверки исчерпан'
          this.clear()
        }
      } catch (error) {
        this.error = extractErrorMessage(error, 'Сессия проверки остановлена')
        this.clear()
      }
    },
    async end() {
      const organizationId = this.organizationId
      try {
        if (this.active) await inspectionApi.end()
      } catch {
        // The server may already have revoked the session.
      }
      this.clear()
      try {
        await authApi.me()
        return { alive: true, organizationId }
      } catch {
        return { alive: false, organizationId }
      }
    },
    clear() {
      if (timer != null) {
        window.clearInterval(timer)
        timer = null
      }
      this.unbindActivity()
      this.active = false
      this.counting = false
      setInspectionToken(null)
      useAuthStore().inspecting = false
    },
  },
})
