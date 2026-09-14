<script setup lang="ts">
import type { DriverStatus } from '@/types/api'
import { driverStatusLabel } from '@/utils/labels'

defineProps<{
  status: DriverStatus
}>()

const styles: Record<DriverStatus, string> = {
  active: 'bg-[var(--lotax-success-soft)] text-[var(--lotax-success)] ring-[var(--lotax-success)]/20',
  pending: 'bg-[var(--lotax-warning-soft)] text-[var(--lotax-warning)] ring-[var(--lotax-warning)]/20',
  blocked: 'bg-[var(--lotax-danger-soft)] text-[var(--lotax-danger)] ring-[var(--lotax-danger)]/20',
}

const dots: Record<DriverStatus, string> = {
  active: 'bg-[var(--lotax-success)]',
  pending: 'bg-[var(--lotax-warning)]',
  blocked: 'bg-[var(--lotax-danger)]',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset"
    :class="styles[status]"
  >
    <span class="h-1.5 w-1.5 rounded-full" :class="dots[status]" aria-hidden="true" />
    {{ driverStatusLabel[status] }}
  </span>
</template>
