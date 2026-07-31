<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  hint?: string
}>()
</script>

<template>
  <div class="lotax-card lotax-card-hover p-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="lotax-caption mb-2 font-medium">{{ title }}</p>
        <p class="truncate text-[28px] font-semibold tracking-tight text-ink leading-none">
          {{ value }}
        </p>
        <p v-if="hint" class="lotax-caption mt-2">{{ hint }}</p>
      </div>
      <div
        v-if="$slots.icon"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
      >
        <slot name="icon" />
      </div>
    </div>
  </div>
</template>
