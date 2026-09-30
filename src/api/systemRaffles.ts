import { http } from './http'

export interface RafflePrizePlace {
  place: number
  prize: string
}

export interface SystemRaffleListItem {
  id: string
  title: string
  raffle_date?: string | null
  prize_places?: RafflePrizePlace[]
  is_active: boolean
  tickets_in_org: number
}

export interface SystemRaffleTicket {
  ticket_no: number
  driver_first_name?: string | null
  driver_last_name?: string | null
  driver_display_name: string
  driver_phone: string
  purchased_at: string
  points_spent: number
  eligible: boolean
  park_id?: string | null
  park_name?: string | null
}

export const systemRafflesApi = {
  list() {
    return http.get<{ items: SystemRaffleListItem[]; total: number }>(
      '/admin/system-raffles',
    )
  },

  tickets(rewardId: string) {
    return http.get<{
      items: SystemRaffleTicket[]
      total: number
      reward_id: string
      reward_title: string
    }>(`/admin/system-raffles/${rewardId}/tickets`)
  },

  exportXlsx(rewardId: string) {
    return http.get<Blob>(`/admin/system-raffles/${rewardId}/export`, {
      params: { format: 'xlsx' },
      responseType: 'blob',
    })
  },
}
