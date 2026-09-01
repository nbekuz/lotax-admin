import dayjs from 'dayjs'

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const

function dayDiffFromToday(value: string) {
  const today = dayjs().startOf('day')
  const msgDay = dayjs(value).startOf('day')
  return today.diff(msgDay, 'day')
}

/** HH:mm inside message bubbles. */
export function formatChatTime(value: string): string {
  return dayjs(value).format('HH:mm')
}

/** Date chip: Сегодня / Вчера / 25 августа */
export function formatChatDateLabel(value: string): string {
  const diff = dayDiffFromToday(value)
  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Вчера'

  const d = dayjs(value)
  return `${d.date()} ${MONTHS_GENITIVE[d.month()]}`
}

/** Sidebar preview time. */
export function formatChatListTime(value: string): string {
  const diff = dayDiffFromToday(value)
  if (diff === 0) return formatChatTime(value)
  if (diff === 1) return 'Вчера'

  const d = dayjs(value)
  return `${d.date()} ${MONTHS_GENITIVE[d.month()]}`
}

export function chatDateKey(value: string): string {
  return dayjs(value).format('YYYY-MM-DD')
}

export function groupMessagesByDate<T extends { created_at: string }>(
  messages: T[],
) {
  const groups: { key: string; label: string; items: T[] }[] = []

  for (const message of messages) {
    const key = chatDateKey(message.created_at)
    const label = formatChatDateLabel(message.created_at)
    const last = groups[groups.length - 1]

    if (last?.key === key) {
      last.items.push(message)
    } else {
      groups.push({ key, label, items: [message] })
    }
  }

  return groups
}

export interface MessageClusterFlags {
  isFirst: boolean
  isLast: boolean
}

export function getMessageClusterFlags<T extends { created_at: string; is_mine: boolean }>(
  items: T[],
  index: number,
): MessageClusterFlags {
  const current = items[index]
  const previous = items[index - 1]
  const next = items[index + 1]

  const sameCluster = (
    a: T | undefined,
    b: T | undefined,
  ) =>
    Boolean(
      a &&
        b &&
        a.is_mine === b.is_mine &&
        chatDateKey(a.created_at) === chatDateKey(b.created_at) &&
        Math.abs(dayjs(a.created_at).diff(dayjs(b.created_at), 'minute')) <= 3,
    )

  return {
    isFirst: !sameCluster(previous, current),
    isLast: !sameCluster(current, next),
  }
}
