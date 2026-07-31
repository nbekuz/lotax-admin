<script setup lang="ts">
defineProps<{
  label: string
  value?: string | number | null
}>()
</script>

<template>
  <div class="min-w-0">
    <p class="mb-1.5 text-[13px] font-medium leading-none text-ink-muted">
      {{ label }}
    </p>
    <p class="break-words text-[17px] font-semibold leading-snug tracking-tight text-ink md:text-[18px]">
      <slot>{{ value == null || value === '' ? '—' : value }}</slot>
    </p>
  </div>
</template>
