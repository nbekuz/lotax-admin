import type { AdminRole, DriverStatus, DriverTier } from '@/types/api'

export const roleLabel: Record<AdminRole, string> = {
  director: 'Директор',
  admin: 'Админ',
  manager: 'Менеджер',
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
