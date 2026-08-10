import { defineStore } from 'pinia'
import { orgApi } from '@/api/org'
import { extractErrorMessage } from '@/utils/labels'
import type { OrganizationResponse, ParkResponse } from '@/types/api'

const PARK_STORAGE_KEY = 'lotax_selected_park_id'

interface OrgState {
  organization: OrganizationResponse | null
  myOrganizations: OrganizationResponse[]
  parks: ParkResponse[]
  parksTotal: number
  page: number
  pageSize: number
  selectedParkId: string | null
  loading: boolean
  switching: boolean
  error: string | null
}

/** ЛК store — own organization + parks (director / admin / manager). */
export const useOrgStore = defineStore('org', {
  state: (): OrgState => ({
    organization: null,
    myOrganizations: [],
    parks: [],
    parksTotal: 0,
    page: 1,
    pageSize: 20,
    selectedParkId: localStorage.getItem(PARK_STORAGE_KEY),
    loading: false,
    switching: false,
    error: null,
  }),

  getters: {
    selectedPark: (s): ParkResponse | null =>
      s.parks.find((p) => p.id === s.selectedParkId) ?? null,
    hasMultipleOrgs: (s) => s.myOrganizations.length > 1,
  },

  actions: {
    selectPark(parkId: string | null) {
      this.selectedParkId = parkId
      if (parkId) {
        localStorage.setItem(PARK_STORAGE_KEY, parkId)
      } else {
        localStorage.removeItem(PARK_STORAGE_KEY)
      }
    },

    ensureSelectedPark() {
      if (
        this.selectedParkId &&
        this.parks.some((p) => p.id === this.selectedParkId)
      ) {
        return this.selectedParkId
      }
      const first = this.parks[0]?.id ?? null
      this.selectPark(first)
      return first
    },

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

    async fetchMyOrganizations() {
      try {
        const { data } = await orgApi.listMyOrganizations({ page_size: 50 })
        this.myOrganizations = data.items
        return data.items
      } catch (e) {
        this.myOrganizations = this.organization ? [this.organization] : []
        throw e
      }
    },

    async switchOrganization(organizationId: string) {
      this.switching = true
      this.error = null
      try {
        const { data } = await orgApi.switchOrganization({
          organization_id: organizationId,
        })
        this.organization = data.organization
        this.selectPark(null)
        await this.fetchParks(1, this.pageSize)
        return data
      } catch (e) {
        this.error = extractErrorMessage(
          e,
          'Не удалось переключить организацию',
        )
        throw e
      } finally {
        this.switching = false
      }
    },

    async fetchParks(page = 1, pageSize = 50) {
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
        this.ensureSelectedPark()
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
      try {
        await this.fetchMyOrganizations()
      } catch {
        /* optional for single-org accounts */
      }
      await this.fetchParks(1, this.pageSize)
    },
  },
})
