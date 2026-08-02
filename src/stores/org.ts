import { defineStore } from 'pinia'
import { orgApi } from '@/api/org'
import { extractErrorMessage } from '@/utils/labels'
import type { OrganizationResponse, ParkResponse } from '@/types/api'

interface OrgState {
  organization: OrganizationResponse | null
  parks: ParkResponse[]
  parksTotal: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
}

/** ЛК store — own organization + parks (director / admin / manager). */
export const useOrgStore = defineStore('org', {
  state: (): OrgState => ({
    organization: null,
    parks: [],
    parksTotal: 0,
    page: 1,
    pageSize: 20,
    loading: false,
    error: null,
  }),

  actions: {
    async fetchMe() {
      this.loading = true
      this.error = null
      try {
        const { data } = await orgApi.me()
        this.organization = data.organization
        return data
      } catch (e) {
        this.error = extractErrorMessage(
          e,
          'Не удалось загрузить организацию',
        )
        this.organization = null
        throw e
      } finally {
        this.loading = false
      }
    },

    async fetchParks(page = 1, pageSize = 20) {
      this.loading = true
      this.error = null
      this.page = page
      this.pageSize = pageSize
      try {
        const { data } = await orgApi.listParks({
          page,
          page_size: pageSize,
        })
        this.parks = data.items
        this.parksTotal = data.total
        return data
      } catch (e) {
        this.error = extractErrorMessage(e, 'Не удалось загрузить парки')
        throw e
      } finally {
        this.loading = false
      }
    },

    async loadDashboard() {
      await this.fetchMe()
      await this.fetchParks(1, this.pageSize)
    },
  },
})
