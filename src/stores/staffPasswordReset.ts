import { defineStore } from 'pinia'
import { staffPasswordResetApi } from '@/api/staffPasswordReset'
import type { StaffPasswordResetMessage, StaffPasswordResetRoom } from '@/types/staffPasswordReset'

const SEEN_KEY = 'lotax.staffPasswordSeen'

function roomStamp(room: Pick<StaffPasswordResetRoom, 'last_message_at' | 'created_at'>) {
  return room.last_message_at || room.created_at
}

function readSeen(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export const useStaffPasswordResetStore = defineStore('staffPasswordReset', {
  state: () => ({
    rooms: [] as StaffPasswordResetRoom[],
    roomsTotal: 0,
    openCount: 0,
    viewing: false,
    seen: readSeen() as Record<string, string>,
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
    persistSeen() {
      sessionStorage.setItem(SEEN_KEY, JSON.stringify(this.seen))
    },

    applyBadge(rooms: StaffPasswordResetRoom[]) {
      const open = rooms.filter((room) => room.status === 'open' || room.status === 'active')
      if (this.viewing) {
        for (const room of open) this.seen[room.id] = roomStamp(room)
        this.persistSeen()
        this.openCount = 0
        return
      }
      this.openCount = open.filter((room) => this.seen[room.id] !== roomStamp(room)).length
    },

    setViewing(active: boolean) {
      this.viewing = active
      if (active) this.applyBadge(this.rooms)
    },

    async fetchOpenCount() {
      const { data } = await staffPasswordResetApi.listRooms('open')
      this.applyBadge(data.items ?? [])
    },

    async fetchRooms(options?: { silent?: boolean }) {
      if (!options?.silent) this.loadingRooms = true
      try {
        const { data } = await staffPasswordResetApi.listRooms(this.statusFilter)
        this.rooms = data.items ?? []
        this.roomsTotal = data.total ?? this.rooms.length
        if (this.statusFilter === 'open') this.applyBadge(this.rooms)
        else void this.fetchOpenCount()
      } finally {
        if (!options?.silent) this.loadingRooms = false
      }
    },

    async selectRoom(roomId: string) {
      this.activeRoomId = roomId
      await this.loadMessages(roomId)
    },

    async loadMessages(roomId: string, options?: { silent?: boolean }) {
      if (!options?.silent) this.loadingMessages = true
      try {
        const { data } = await staffPasswordResetApi.adminMessages(roomId)
        if (this.activeRoomId !== roomId) return
        const incoming = data.items ?? []
        const known = new Set(incoming.map((item) => item.id))
        const pending = this.messages.filter((item) => !known.has(item.id))
        this.messages = pending.length ? [...incoming, ...pending] : incoming
      } finally {
        if (!options?.silent) this.loadingMessages = false
      }
    },

    async pollSnapshot() {
      const roomId = this.activeRoomId
      const tasks: Promise<unknown>[] = [
        this.fetchRooms({ silent: true }).catch(() => undefined),
      ]
      if (roomId) {
        tasks.push(this.loadMessages(roomId, { silent: true }).catch(() => undefined))
      }
      await Promise.all(tasks)
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
