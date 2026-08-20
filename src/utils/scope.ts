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
