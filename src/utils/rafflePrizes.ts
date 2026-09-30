export interface PrizeRow {
  place: number
  prize: string
}

export function emptyPrizeRows(): PrizeRow[] {
  return [{ place: 1, prize: '' }]
}

export function rafflePrizePayload(input: {
  isRaffle: boolean
  mode: 'list' | 'identical'
  rows: PrizeRow[]
  identicalCount?: number | null
  identicalPrize?: string
}) {
  if (!input.isRaffle) return {}
  if (input.mode === 'identical') {
    const prize = input.identicalPrize?.trim()
    if (!input.identicalCount || !prize) return {}
    return {
      prize_identical_count: input.identicalCount,
      prize_identical_prize: prize,
    }
  }
  const rows = input.rows
    .filter((row) => row.place >= 1 && row.prize.trim())
    .map((row) => ({ place: row.place, prize: row.prize.trim() }))
  if (!rows.length) return {}
  return { prize_places: JSON.stringify(rows) }
}
