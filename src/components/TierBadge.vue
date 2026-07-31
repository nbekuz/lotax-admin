<script setup lang="ts">
import type { DriverTier } from '@/types/api'
import { driverTierLabel } from '@/utils/labels'

defineProps<{
  tier: DriverTier
}>()

const styles: Record<DriverTier, string> = {
  bronze: 'bg-[#FDF0E7] text-[#9A5B2F] ring-[#E8C4A8]',
  silver: 'bg-slate-100 text-slate-700 ring-slate-300',
  gold: 'bg-amber-50 text-amber-800 ring-amber-200',
  platinum: 'bg-violet-50 text-violet-700 ring-violet-200',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
    :class="styles[tier]"
  >
    {{ driverTierLabel[tier] }}
  </span>
</template>
