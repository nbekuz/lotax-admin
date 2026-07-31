import { defineStore } from 'pinia'
import { adminsApi, type AdminsQuery } from '@/api/admins'
import { extractErrorMessage } from '@/utils/labels'
import type {
  AdminCreatePayload,
  AdminListItem,
  AdminUpdatePayload,
  StaffAssignableRole,
} from '@/types/api'

interface AdminsState {
  items: AdminListItem[]
  total: number
  page: number
  pageSize: number
  roleFilter: StaffAssignableRole | null
  loading: boolean
  current: AdminListItem | null
  error: string | null
}

export const useAdminsStore = defineStore('admins', {
  state: (): AdminsState => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    roleFilter: null,
    loading: false,
    current: null,
    error: null,
  }),

  actions: {
    async fetchList(query: Partial<AdminsQuery> = {}) {
      this.loading = true
      this.error = null
      if (query.page != null) this.page = query.page
      if (query.page_size != null) this.pageSize = query.page_size
      if (query.role !== undefined) this.roleFilter = query.role ?? null

      try {
        const data = await adminsApi.list({
          page: this.page,
          page_size: this.pageSize,
          role: this.roleFilter,
        })
        this.items = data.items
        this.total = data.total
        this.page = data.page
        this.pageSize = data.page_size
      } catch (e) {
        this.error = extractErrorMessage(e, 'Не удалось загрузить сотрудников')
        throw e
      } finally {
        this.loading = false
      }
    },

    async fetchById(id: string) {
      this.loading = true
      this.error = null
      try {
        const { data } = await adminsApi.getById(id)
        this.current = data
        return data
      } catch (e) {
        this.error = extractErrorMessage(e, 'Сотрудник не найден')
        this.current = null
        throw e
      } finally {
        this.loading = false
      }
    },

    async create(payload: AdminCreatePayload) {
      const { data } = await adminsApi.create(payload)
      await this.fetchList()
      return data
    },

    async update(id: string, payload: AdminUpdatePayload) {
      const { data } = await adminsApi.update(id, payload)
      const idx = this.items.findIndex((a) => a.id === id)
      if (idx >= 0) this.items[idx] = data
      if (this.current?.id === id) this.current = data
      return data
    },
  },
})
