import type { ParkScopeInfo, ScopeType } from '@/types/api'

export interface ScopeFormValue {
  scope_type: ScopeType
  park_group_id?: string | null
  park_ids?: string[] | null
}

/** Default: current park only (`specific` without extra parks → backend uses form `park_id`). */
export function defaultSpecificScope(parkId?: string | null): ScopeFormValue {
  return {
    scope_type: 'specific',
    park_group_id: null,
    park_ids: parkId ? [parkId] : [],
  }
}

export function scopeFromApi(
  scope?: ParkScopeInfo | null,
  fallbackParkId?: string | null,
): ScopeFormValue {
  return {
    scope_type: scope?.scope_type ?? 'specific',
    park_group_id: scope?.park_group_id ?? null,
    park_ids: scope?.park_ids?.length
      ? [...scope.park_ids]
      : fallbackParkId
        ? [fallbackParkId]
        : [],
  }
}

export function validateScopeFields(
  scope: ScopeFormValue,
  options: { requireSpecificParks?: boolean } = {},
): string | null {
  if (scope.scope_type === 'group' && !scope.park_group_id) {
    return 'Выберите группу парков'
  }
  if (
    options.requireSpecificParks &&
    scope.scope_type === 'specific' &&
    !scope.park_ids?.length
  ) {
    return 'Выберите хотя бы один парк'
  }
  return null
}

/** Append scope fields to multipart FormData (park_ids as JSON string). */
export function scopeToFormFields(scope: {
  scope_type?: string | null
  park_group_id?: string | null
  park_ids?: string[] | null
}): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {}
  if (scope.scope_type) out.scope_type = scope.scope_type
  if (scope.scope_type === 'group' && scope.park_group_id) {
    out.park_group_id = scope.park_group_id
  }
  if (scope.scope_type === 'specific' && scope.park_ids?.length) {
    out.park_ids = JSON.stringify(scope.park_ids)
  }
  return out
}

export function scopeLabel(scope?: {
  scope_type?: string
  park_group_id?: string | null
  park_ids?: string[] | null
} | null): string {
  if (!scope?.scope_type) return '—'
  switch (scope.scope_type) {
    case 'all':
      return 'Все парки'
    case 'group':
      return 'Группа парков'
    case 'specific':
      return scope.park_ids?.length
        ? `Парки: ${scope.park_ids.length}`
        : 'Один парк'
    default:
      return scope.scope_type
  }
}
