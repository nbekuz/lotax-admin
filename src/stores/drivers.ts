import { defineStore } from 'pinia'
import { driversApi, syncApi, type DriversQuery } from '@/api/drivers'
import { extractErrorMessage } from '@/utils/labels'
import type {
  BalanceUpdatePayload,
  DriverListItem,
  DriverPersonalData,
  DriverStatus,
  StatusUpdatePayload,
} from '@/types/api'

interface DriversState {
  items: DriverListItem[]
  total: number
  page: number
  pageSize: number
  status: DriverStatus | null
  loading: boolean
  current: DriverListItem | null
  personalData: DriverPersonalData | null
  error: string | null
}

export const useDriversStore = defineStore('drivers', {
  state: (): DriversState => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    status: null,
    loading: false,
    current: null,
    personalData: null,
    error: null,
  }),

  actions: {
    async fetchList(query: Partial<DriversQuery> = {}) {
      this.loading = true
      this.error = null
      if (query.page != null) this.page = query.page
      if (query.page_size != null) this.pageSize = query.page_size
      if (query.status !== undefined) this.status = query.status ?? null

      try {
        const { data } = await driversApi.list({
          page: this.page,
          page_size: this.pageSize,
          status: this.status,
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

    async updateBalance(id: string, payload: BalanceUpdatePayload) {
      const { data } = await driversApi.updateBalance(id, payload)
      this.current = data
      const idx = this.items.findIndex((d) => d.id === id)
      if (idx >= 0) this.items[idx] = data
      return data
    },

    async updateStatus(id: string, payload: StatusUpdatePayload) {
      const { data } = await driversApi.updateStatus(id, payload)
      this.current = data
      const idx = this.items.findIndex((d) => d.id === id)
      if (idx >= 0) this.items[idx] = data
      return data
    },

    async syncDrivers() {
      const { data } = await syncApi.drivers()
      return data
    },

    async syncRides() {
      const { data } = await syncApi.rides()
      return data
    },
  },
})
