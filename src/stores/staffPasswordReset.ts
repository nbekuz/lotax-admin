import { defineStore } from 'pinia'
import { staffPasswordResetApi } from '@/api/staffPasswordReset'
import type { StaffPasswordResetMessage, StaffPasswordResetRoom } from '@/types/staffPasswordReset'

export const useStaffPasswordResetStore = defineStore('staffPasswordReset', {
  state: () => ({
    rooms: [] as StaffPasswordResetRoom[],
    roomsTotal: 0,
    openCount: 0,
    statusFilter: 'open' as 'open' | 'closed' | 'all',
    activeRoomId: null as string | null,
    messages: [] as StaffPasswordResetMessage[],
    loadingRooms: false,
    loadingMessages: false,
  }),

  getters: {
    activeRoom(state): StaffPasswordResetRoom | null {
      if (!state.activeRoomId) return null
      return state.rooms.find((room) => room.id === state.activeRoomId) ?? null
    },
  },

  actions: {
    async fetchOpenCount() {
      const { data } = await staffPasswordResetApi.listRooms('open')
      this.openCount = data.total ?? 0
    },

    async fetchRooms() {
      this.loadingRooms = true
      try {
        const { data } = await staffPasswordResetApi.listRooms(this.statusFilter)
        this.rooms = data.items ?? []
        this.roomsTotal = data.total ?? this.rooms.length
        if (this.statusFilter === 'open') this.openCount = this.roomsTotal
      } finally {
        this.loadingRooms = false
      }
    },

    async selectRoom(roomId: string) {
      this.activeRoomId = roomId
      await this.loadMessages(roomId)
    },

    async loadMessages(roomId: string) {
      this.loadingMessages = true
      try {
        const { data } = await staffPasswordResetApi.adminMessages(roomId)
        this.messages = data.items ?? []
      } finally {
        this.loadingMessages = false
      }
    },

    async sendMessage(body: string) {
      if (!this.activeRoomId) return
      const { data } = await staffPasswordResetApi.adminSend(this.activeRoomId, body)
      if (!this.messages.some((item) => item.id === data.id)) {
        this.messages = [...this.messages, data]
      }
    },

    async closeActive() {
      if (!this.activeRoomId) return
      await staffPasswordResetApi.closeRoom(this.activeRoomId)
      await this.fetchRooms()
    },

    handleStreamEvent(event: {
      room_id?: string
      conversation_id?: string
      event?: string
      type?: string
    }) {
      const name = event.type ?? event.event
      if (!name?.startsWith('staff_password_reset')) return
      const roomId = event.room_id || event.conversation_id
      void this.fetchRooms()
      if (roomId && roomId === this.activeRoomId) {
        void this.loadMessages(roomId)
      }
    },

    reset() {
      this.rooms = []
      this.openCount = 0
      this.activeRoomId = null
      this.messages = []
    },
  },
})
