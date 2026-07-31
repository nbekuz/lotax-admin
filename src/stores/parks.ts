import { defineStore } from 'pinia'
import { superAdminApi, type ParksQuery } from '@/api/superAdmin'
import { extractErrorMessage } from '@/utils/labels'
import type {
  AdminListItem,
  ParkCreatePayload,
  ParkDirectorCreatePayload,
  ParkResponse,
  ParkUpdatePayload,
  PlatformSettingItem,
} from '@/types/api'

interface ParksState {
  items: ParkResponse[]
  total: number
  page: number
  pageSize: number
  subscriptionFilter: boolean | null
  loading: boolean
  current: ParkResponse | null
  staff: AdminListItem[]
  staffTotal: number
  settings: PlatformSettingItem[]
  error: string | null
}

export const useParksStore = defineStore('parks', {
  state: (): ParksState => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    subscriptionFilter: null,
    loading: false,
    current: null,
    staff: [],
    staffTotal: 0,
    settings: [],
    error: null,
  }),

  actions: {
    async fetchList(query: Partial<ParksQuery> = {}) {
      this.loading = true
      this.error = null
      if (query.page != null) this.page = query.page
      if (query.page_size != null) this.pageSize = query.page_size
      if (query.subscription_active !== undefined) {
        this.subscriptionFilter = query.subscription_active ?? null
      }
      try {
        const { data } = await superAdminApi.listParks({
          page: this.page,
          page_size: this.pageSize,
          subscription_active: this.subscriptionFilter,
        })
        this.items = data.items
        this.total = data.total
        this.page = data.page
        this.pageSize = data.page_size
      } catch (e) {
        this.error = extractErrorMessage(e, 'Не удалось загрузить парки')
        throw e
      } finally {
        this.loading = false
      }
    },

    async fetchById(id: string) {
      this.loading = true
      this.error = null
      try {
        const { data } = await superAdminApi.getPark(id)
        this.current = data
        return data
      } catch (e) {
        this.error = extractErrorMessage(e, 'Парк не найден')
        this.current = null
        throw e
      } finally {
        this.loading = false
      }
    },

    async create(payload: ParkCreatePayload) {
      const { data } = await superAdminApi.createPark(payload)
      await this.fetchList()
      return data
    },

    async update(id: string, payload: ParkUpdatePayload) {
      const { data } = await superAdminApi.updatePark(id, payload)
      this.current = data
      const idx = this.items.findIndex((p) => p.id === id)
      if (idx >= 0) this.items[idx] = data
      return data
    },

    async setSubscription(id: string, subscription_active: boolean) {
      const { data } = await superAdminApi.setSubscription(id, {
        subscription_active,
      })
      this.current = data
      const idx = this.items.findIndex((p) => p.id === id)
      if (idx >= 0) this.items[idx] = data
      return data
    },

    async createDirector(id: string, payload: ParkDirectorCreatePayload) {
      return (await superAdminApi.createDirector(id, payload)).data
    },

    async fetchStaff(id: string, page = 1, pageSize = 20) {
      const { data } = await superAdminApi.listParkStaff(id, {
        page,
        page_size: pageSize,
      })
      this.staff = data.items
      this.staffTotal = data.total
      return data
    },

    async fetchSettings() {
      this.loading = true
      try {
        const { data } = await superAdminApi.getSettings()
        this.settings = data.items
        return data.items
      } catch (e) {
        this.error = extractErrorMessage(e, 'Не удалось загрузить настройки')
        throw e
      } finally {
        this.loading = false
      }
    },

    async saveSettings(items: PlatformSettingItem[]) {
      const { data } = await superAdminApi.updateSettings({ items })
      this.settings = data.items
      return data.items
    },
  },
})
