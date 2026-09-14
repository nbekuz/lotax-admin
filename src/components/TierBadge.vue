<script setup lang="ts">
import type { DriverTier } from '@/types/api'
import { driverTierLabel } from '@/utils/labels'

defineProps<{
  tier: DriverTier
}>()

const styles: Record<DriverTier, string> = {
  bronze: 'bg-[#FDF0E7] text-[#9A5B2F] ring-[#E8C4A8]/40',
  silver: 'bg-slate-100 text-slate-700 ring-slate-300/50',
  gold: 'bg-[var(--lotax-warning-soft)] text-[var(--lotax-warning)] ring-[var(--lotax-warning)]/20',
  platinum: 'bg-violet-50 text-violet-700 ring-violet-200/50',
}
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset"
    :class="styles[tier]"
  >
    {{ driverTierLabel[tier] }}
  </span>
</template>
