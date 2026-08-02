import { defineStore } from 'pinia'
import { superAdminApi, type OrganizationsQuery } from '@/api/superAdmin'
import { extractErrorMessage } from '@/utils/labels'
import type {
  AdminListItem,
  OrganizationCreatePayload,
  OrganizationResponse,
  OrganizationUpdatePayload,
  OrgDirectorCreatePayload,
  ParkCreatePayload,
  ParkResponse,
  ParkUpdatePayload,
  PlatformSettingItem,
} from '@/types/api'

interface OrganizationsState {
  items: OrganizationResponse[]
  total: number
  page: number
  pageSize: number
  subscriptionFilter: boolean | null
  loading: boolean
  current: OrganizationResponse | null
  parks: ParkResponse[]
  parksTotal: number
  staff: AdminListItem[]
  staffTotal: number
  settings: PlatformSettingItem[]
  error: string | null
}

export const useOrganizationsStore = defineStore('organizations', {
  state: (): OrganizationsState => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    subscriptionFilter: null,
    loading: false,
    current: null,
    parks: [],
    parksTotal: 0,
    staff: [],
    staffTotal: 0,
    settings: [],
    error: null,
  }),

  actions: {
    async fetchList(query: Partial<OrganizationsQuery> = {}) {
      this.loading = true
      this.error = null
      if (query.page != null) this.page = query.page
      if (query.page_size != null) this.pageSize = query.page_size
      if (query.subscription_active !== undefined) {
        this.subscriptionFilter = query.subscription_active ?? null
      }
      try {
        const { data } = await superAdminApi.listOrganizations({
          page: this.page,
          page_size: this.pageSize,
          subscription_active: this.subscriptionFilter,
        })
        this.items = data.items
        this.total = data.total
        this.page = data.page
        this.pageSize = data.page_size
      } catch (e) {
        this.error = extractErrorMessage(e, 'Не удалось загрузить организации')
        throw e
      } finally {
        this.loading = false
      }
    },

    async fetchById(id: string) {
      this.loading = true
      this.error = null
      try {
        const { data } = await superAdminApi.getOrganization(id)
        this.current = data
        return data
      } catch (e) {
        this.error = extractErrorMessage(e, 'Организация не найдена')
        this.current = null
        throw e
      } finally {
        this.loading = false
      }
    },

    async create(payload: OrganizationCreatePayload) {
      const { data } = await superAdminApi.createOrganization(payload)
      await this.fetchList()
      return data
    },

    async update(id: string, payload: OrganizationUpdatePayload) {
      const { data } = await superAdminApi.updateOrganization(id, payload)
      this.current = data
      const idx = this.items.findIndex((o) => o.id === id)
      if (idx >= 0) this.items[idx] = data
      return data
    },

    async setSubscription(id: string, subscription_active: boolean) {
      const { data } = await superAdminApi.setOrganizationSubscription(id, {
        subscription_active,
      })
      this.current = data
      const idx = this.items.findIndex((o) => o.id === id)
      if (idx >= 0) this.items[idx] = data
      return data
    },

    async fetchParks(orgId: string, page = 1, pageSize = 50) {
      const { data } = await superAdminApi.listOrganizationParks(orgId, {
        page,
        page_size: pageSize,
      })
      this.parks = data.items
      this.parksTotal = data.total
      return data
    },

    async createPark(orgId: string, payload: ParkCreatePayload) {
      const { data } = await superAdminApi.createPark(orgId, payload)
      await this.fetchParks(orgId)
      return data
    },

    async updatePark(parkId: string, payload: ParkUpdatePayload) {
      const { data } = await superAdminApi.updatePark(parkId, payload)
      const idx = this.parks.findIndex((p) => p.id === parkId)
      if (idx >= 0) this.parks[idx] = data
      return data
    },

    async createDirector(orgId: string, payload: OrgDirectorCreatePayload) {
      return (await superAdminApi.createDirector(orgId, payload)).data
    },

    async fetchStaff(orgId: string, page = 1, pageSize = 20) {
      const { data } = await superAdminApi.listOrganizationStaff(orgId, {
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
