import { defineStore } from 'pinia'
import { passwordResetApi } from '@/api/passwordReset'
import type { ChatStreamEvent } from '@/types/chat'
import type {
  PasswordResetMessage,
  PasswordResetRoom,
  PasswordResetRoomsFilter,
} from '@/types/passwordReset'

const POLL_MS = 8000

interface PasswordResetState {
  rooms: PasswordResetRoom[]
  roomsTotal: number
  openCount: number
  statusFilter: PasswordResetRoomsFilter
  activeRoomId: string | null
  messages: PasswordResetMessage[]
  loadingRooms: boolean
  loadingMessages: boolean
  sending: boolean
  closing: boolean
  pollTimer: ReturnType<typeof setInterval> | null
}

function sortRooms(items: PasswordResetRoom[]) {
  return [...items].sort((a, b) => {
    const aTime = a.last_message_at ?? a.created_at
    const bTime = b.last_message_at ?? b.created_at
    return bTime.localeCompare(aTime)
  })
}

function streamEventName(event: ChatStreamEvent): string {
  return event.type ?? event.event
}

export const usePasswordResetStore = defineStore('passwordReset', {
  state: (): PasswordResetState => ({
    rooms: [],
    roomsTotal: 0,
    openCount: 0,
    statusFilter: 'open',
    activeRoomId: null,
    messages: [],
    loadingRooms: false,
    loadingMessages: false,
    sending: false,
    closing: false,
    pollTimer: null,
  }),

  getters: {
    activeRoom(state): PasswordResetRoom | null {
      if (!state.activeRoomId) return null
      return state.rooms.find((r) => r.id === state.activeRoomId) ?? null
    },
  },

  actions: {
    async fetchOpenCount() {
      const { data } = await passwordResetApi.listRooms({
        status: 'open',
        page: 1,
        page_size: 1,
      })
      this.openCount = data.total ?? 0
    },

    async fetchRooms() {
      this.loadingRooms = true
      try {
        const { data } = await passwordResetApi.listRooms({
          status: this.statusFilter,
          page: 1,
          page_size: 50,
        })
        this.rooms = sortRooms(data.items ?? [])
        this.roomsTotal = data.total ?? this.rooms.length
        if (this.statusFilter === 'open') {
          this.openCount = this.roomsTotal
        } else {
          void this.fetchOpenCount()
        }
      } finally {
        this.loadingRooms = false
      }
    },

    async setStatusFilter(status: PasswordResetRoomsFilter) {
      this.statusFilter = status
      await this.fetchRooms()
      if (
        this.activeRoomId &&
        !this.rooms.some((r) => r.id === this.activeRoomId)
      ) {
        this.activeRoomId = null
        this.messages = []
      }
    },

    upsertRoom(room: PasswordResetRoom) {
      const idx = this.rooms.findIndex((r) => r.id === room.id)
      const matchesFilter =
        this.statusFilter === 'all' || room.status === this.statusFilter

      if (!matchesFilter) {
        if (idx >= 0) this.rooms.splice(idx, 1)
        this.rooms = sortRooms(this.rooms)
        return
      }

      if (idx >= 0) {
        this.rooms[idx] = { ...this.rooms[idx], ...room }
      } else {
        this.rooms.push(room)
      }
      this.rooms = sortRooms(this.rooms)
    },

    async selectRoom(roomId: string) {
      this.activeRoomId = roomId
      await this.loadMessages(roomId)
    },

    async loadMessages(roomId: string) {
      this.loadingMessages = true
      try {
        const { data } = await passwordResetApi.listMessages(roomId)
        this.messages = data.items ?? []
      } finally {
        this.loadingMessages = false
      }
    },

    async sendMessage(body: string) {
      const roomId = this.activeRoomId
      if (!roomId) return

      const trimmed = body.trim()
      if (!trimmed) return

      this.sending = true
      try {
        const { data } = await passwordResetApi.sendMessage(roomId, trimmed)
        const exists = this.messages.some((m) => m.id === data.id)
        if (!exists) {
          this.messages = [...this.messages, data]
        }
        this.touchRoom(roomId, data.body, data.created_at)
      } finally {
        this.sending = false
      }
    },

    async closeActiveRoom() {
      const roomId = this.activeRoomId
      if (!roomId) return

      this.closing = true
      try {
        const { data } = await passwordResetApi.closeRoom(roomId)
        const room =
          data && typeof data === 'object' && 'id' in data
            ? (data as PasswordResetRoom)
            : {
                ...(this.activeRoom ?? {
                  id: roomId,
                  driver_id: '',
                  park_id: '',
                  organization_id: '',
                  created_at: new Date().toISOString(),
                }),
                status: 'closed' as const,
                closed_at: new Date().toISOString(),
              }
        this.upsertRoom(room)
        void this.fetchOpenCount()
        if (this.statusFilter === 'open') {
          this.activeRoomId = null
          this.messages = []
        }
      } finally {
        this.closing = false
      }
    },

    touchRoom(roomId: string, preview: string, at: string) {
      const room = this.rooms.find((r) => r.id === roomId)
      if (!room) {
        void this.fetchRooms()
        return
      }
      room.last_message_preview = preview
      room.last_message_at = at
      this.rooms = sortRooms(this.rooms)
    },

    handleStreamEvent(event: ChatStreamEvent) {
      const name = streamEventName(event)

      if (name === 'password_reset_opened') {
        if (event.room_id) {
          this.upsertRoom({
            id: event.room_id,
            driver_id: event.driver_id ?? '',
            park_id: event.park_id ?? '',
            organization_id: '',
            status: 'open',
            driver_display_name: event.driver_display_name,
            last_message_preview: event.body_preview,
            last_message_at: null,
            created_at: new Date().toISOString(),
            closed_at: null,
          })
          void this.fetchOpenCount()
        } else {
          void this.fetchRooms()
        }
        return
      }

      if (name === 'password_reset_message') {
        if (event.room_id && event.body_preview) {
          this.touchRoom(
            event.room_id,
            event.body_preview,
            new Date().toISOString(),
          )
        }
        if (event.room_id === this.activeRoomId) {
          void this.loadMessages(event.room_id)
        } else if (!this.rooms.some((r) => r.id === event.room_id)) {
          void this.fetchRooms()
        }
        return
      }

      if (name === 'password_reset_closed') {
        if (event.room_id) {
          const room = this.rooms.find((r) => r.id === event.room_id)
          if (room) {
            room.status = 'closed'
            room.closed_at = new Date().toISOString()
            this.upsertRoom(room)
          } else {
            void this.fetchRooms()
          }
          void this.fetchOpenCount()
          if (this.activeRoomId === event.room_id && this.statusFilter === 'open') {
            this.activeRoomId = null
            this.messages = []
          }
        } else {
          void this.fetchRooms()
        }
      }
    },

    startPolling() {
      this.stopPolling()
      this.pollTimer = setInterval(() => {
        void this.fetchRooms()
        if (this.activeRoomId) {
          void this.loadMessages(this.activeRoomId)
        }
      }, POLL_MS)
    },

    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },

    reset() {
      this.stopPolling()
      this.rooms = []
      this.roomsTotal = 0
      this.openCount = 0
      this.statusFilter = 'open'
      this.activeRoomId = null
      this.messages = []
    },
  },
})
