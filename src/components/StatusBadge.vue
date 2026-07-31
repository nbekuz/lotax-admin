<script setup lang="ts">
import type { DriverStatus } from '@/types/api'
import { driverStatusLabel } from '@/utils/labels'

defineProps<{
  status: DriverStatus
}>()

const styles: Record<DriverStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  blocked: 'bg-red-50 text-red-700 ring-red-200',
}

const dots: Record<DriverStatus, string> = {
  active: 'bg-emerald-500',
  pending: 'bg-amber-500',
  blocked: 'bg-red-500',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
    :class="styles[status]"
  >
    <span class="h-1.5 w-1.5 rounded-full" :class="dots[status]" />
    {{ driverStatusLabel[status] }}
  </span>
</template>
