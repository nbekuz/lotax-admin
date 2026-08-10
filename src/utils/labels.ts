import type {
  AdminRole,
  AdminStatus,
  CompetitionCriteria,
  CompetitionStatus,
  DriverStatus,
  DriverTier,
  TaskStatus,
  TaskType,
} from '@/types/api'

export const roleLabel: Record<AdminRole, string> = {
  director: 'Директор',
  admin: 'Админ',
  manager: 'Менеджер',
  super_admin: 'Супер-админ',
}

export const adminStatusLabel: Record<AdminStatus, string> = {
  active: 'Активен',
  blocked: 'Заблокирован',
  inactive: 'Неактивен',
}

export const adminStatusTone: Record<AdminStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blocked: 'bg-red-50 text-red-700 ring-red-200',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-300',
}

export const driverStatusLabel: Record<DriverStatus, string> = {
  active: 'Активен',
  blocked: 'Заблокирован',
  pending: 'Ожидание',
}

export const driverTierLabel: Record<DriverTier, string> = {
  bronze: 'Бронза',
  silver: 'Серебро',
  gold: 'Золото',
  platinum: 'Платина',
}

/** Alias for reward forms */
export const tierLabel = driverTierLabel

export const rewardTypeLabel: Record<
  | 'free_shift'
  | 'certificate'
  | 'fuel_card'
  | 'car_wash'
  | 'merchandise'
  | 'other',
  string
> = {
  free_shift: 'Свободная смена',
  certificate: 'Сертификат',
  fuel_card: 'Топливная карта',
  car_wash: 'Мойка',
  merchandise: 'Мерч',
  other: 'Другое',
}

export const driverStatusColor: Record<DriverStatus, string> = {
  active: 'success',
  blocked: 'error',
  pending: 'warning',
}

export const driverTierColor: Record<DriverTier, string> = {
  bronze: 'orange',
  silver: 'default',
  gold: 'gold',
  platinum: 'purple',
}

export const taskTypeLabel: Record<TaskType, string> = {
  ride_count: 'Кол-во поездок',
  earn_points: 'Набрать баллы',
  fare_total: 'Сумма поездок, ₽',
  streak_days: 'Дни подряд',
  custom: 'Ручной трекинг',
}

export const taskStatusLabel: Record<TaskStatus, string> = {
  draft: 'Черновик',
  scheduled: 'Запланировано',
  active: 'Активно',
  completed: 'Завершено',
}

export const taskStatusTone: Record<TaskStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 ring-slate-300',
  scheduled: 'bg-blue-50 text-blue-700 ring-blue-200',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  completed: 'bg-slate-100 text-slate-600 ring-slate-300',
}

export const competitionCriteriaLabel: Record<CompetitionCriteria, string> = {
  max_points: 'Максимум баллов',
  max_rides: 'Максимум поездок',
}

export const competitionStatusLabel: Record<CompetitionStatus, string> = {
  draft: 'Черновик',
  scheduled: 'Запланировано',
  active: 'Активно',
  finalizing: 'Подведение итогов',
  completed: 'Завершено',
}

export const competitionStatusTone: Record<CompetitionStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 ring-slate-300',
  scheduled: 'bg-blue-50 text-blue-700 ring-blue-200',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  finalizing: 'bg-amber-50 text-amber-700 ring-amber-200',
  completed: 'bg-slate-100 text-slate-600 ring-slate-300',
}

export function extractErrorMessage(error: unknown, fallback = 'Ошибка запроса'): string {
  const err = error as {
    response?: { data?: { detail?: unknown }; status?: number }
    message?: string
  }

  const detail = err?.response?.data?.detail
  if (typeof detail === 'string' && detail) return detail
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] as { msg?: string }
    if (first?.msg) return first.msg
  }
  if (err?.message) return err.message
  return fallback
}

/** Format RU mobile as +7 (XXX) XXX-XX-XX. Masked values left as-is. */
export function formatPhone(phone?: string | null): string {
  if (phone == null || phone === '') return '—'
  if (/[*•xX]/.test(phone)) return phone

  const digits = phone.replace(/\D/g, '')
  let normalized = digits

  if (normalized.length === 11 && normalized.startsWith('8')) {
    normalized = `7${normalized.slice(1)}`
  } else if (normalized.length === 10) {
    normalized = `7${normalized}`
  }

  if (normalized.length === 11 && normalized.startsWith('7')) {
    return `+7 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9, 11)}`
  }

  return phone
}
