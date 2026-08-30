import { defineStore } from 'pinia'
import { driversApi, syncApi, type DriversQuery } from '@/api/drivers'
import { extractErrorMessage } from '@/utils/labels'
import type {
  AdjustPointsPayload,
  BalanceUpdatePayload,
  DriverListItem,
  DriverPersonalData,
  DriverRideItem,
  DriverStatus,
  DriverTier,
  ManualDriverCreatePayload,
  StatusUpdatePayload,
} from '@/types/api'

interface DriversState {
  items: DriverListItem[]
  total: number
  page: number
  pageSize: number
  q: string | null
  status: DriverStatus | null
  tier: DriverTier | null
  parkId: string | null
  loading: boolean
  current: DriverListItem | null
  personalData: DriverPersonalData | null
  rides: DriverRideItem[]
  ridesTotal: number
  ridesPage: number
  ridesPageSize: number
  ridesLoading: boolean
  error: string | null
}

export const useDriversStore = defineStore('drivers', {
  state: (): DriversState => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    q: null,
    status: null,
    tier: null,
    parkId: null,
    loading: false,
    current: null,
    personalData: null,
    rides: [],
    ridesTotal: 0,
    ridesPage: 1,
    ridesPageSize: 20,
    ridesLoading: false,
    error: null,
  }),

  actions: {
    async fetchList(query: Partial<DriversQuery> = {}) {
      this.loading = true
      this.error = null
      if (query.page != null) this.page = query.page
      if (query.page_size != null) this.pageSize = query.page_size
      if (query.q !== undefined) this.q = query.q?.trim() || null
      if (query.status !== undefined) this.status = query.status ?? null
      if (query.tier !== undefined) this.tier = query.tier ?? null
      if (query.park_id !== undefined) this.parkId = query.park_id ?? null

      try {
        const { data } = await driversApi.list({
          page: this.page,
          page_size: this.pageSize,
          q: this.q,
          status: this.status,
          tier: this.tier,
          park_id: this.parkId,
        })
        this.items = data.items
        this.total = data.total
        this.page = data.page
        this.pageSize = data.page_size
      } catch (e) {
        this.error = extractErrorMessage(e, 'Не удалось загрузить водителей')
        throw e
      } finally {
        this.loading = false
      }
    },

    async fetchById(id: string) {
      this.loading = true
      this.error = null
      this.personalData = null
      this.rides = []
      this.ridesTotal = 0
      try {
        const { data } = await driversApi.getById(id)
        this.current = data
        return data
      } catch (e) {
        this.error = extractErrorMessage(e, 'Водитель не найден')
        this.current = null
        throw e
      } finally {
        this.loading = false
      }
    },

    async fetchPersonalData(id: string) {
      try {
        const { data } = await driversApi.personalData(id)
        this.personalData = data
        return data
      } catch (e) {
        this.error = extractErrorMessage(e, 'Нет доступа к ПДн')
        throw e
      }
    },

    async fetchRides(
      id: string,
      query: { page?: number; page_size?: number } = {},
    ) {
      this.ridesLoading = true
      this.error = null
      if (query.page != null) this.ridesPage = query.page
      if (query.page_size != null) this.ridesPageSize = query.page_size
      try {
        const { data } = await driversApi.rides(id, {
          page: this.ridesPage,
          page_size: this.ridesPageSize,
        })
        this.rides = data.items
        this.ridesTotal = data.total
        this.ridesPage = data.page
        this.ridesPageSize = data.page_size
        return data
      } catch (e) {
        this.error = extractErrorMessage(e, 'Не удалось загрузить поездки')
        throw e
      } finally {
        this.ridesLoading = false
      }
    },

    async updateBalance(id: string, payload: BalanceUpdatePayload) {
      const { data } = await driversApi.updateBalance(id, payload)
      this.current = data
      const idx = this.items.findIndex((d) => d.id === id)
      if (idx >= 0) this.items[idx] = data
      return data
    },

    async adjustPoints(id: string, payload: AdjustPointsPayload) {
      const { data } = await driversApi.adjustPoints(id, payload)
      this.current = data
      const idx = this.items.findIndex((d) => d.id === id)
      if (idx >= 0) this.items[idx] = data
      return data
    },

    async adjustTier(id: string, payload: import('@/types/api').AdjustTierPayload) {
      const { data } = await driversApi.adjustTier(id, payload)
      this.current = data
      const idx = this.items.findIndex((d) => d.id === id)
      if (idx >= 0) this.items[idx] = data
      return data
    },

    async createManual(payload: ManualDriverCreatePayload) {
      const { data } = await driversApi.createManual(payload)
      await this.fetchList()
      return data
    },

    async updateStatus(id: string, payload: StatusUpdatePayload) {
      const { data } = await driversApi.updateStatus(id, payload)
      this.current = data
      const idx = this.items.findIndex((d) => d.id === id)
      if (idx >= 0) this.items[idx] = data
      return data
    },

    async bulkStatus(payload: import('@/types/api').DriverBulkStatusPayload) {
      return (await driversApi.bulkStatus(payload)).data
    },

    async launchReset(payload: import('@/types/api').DriverLaunchResetPayload) {
      return (await driversApi.launchReset(payload)).data
    },

    async syncDrivers(parkId?: string | null) {
      const { data } = await syncApi.drivers(parkId)
      return data
    },

    async syncRides(parkId?: string | null) {
      const { data } = await syncApi.rides(parkId)
      return data
    },
  },
})
