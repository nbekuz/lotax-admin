<script setup lang="ts">
defineProps<{
  label: string
  value?: string | number | null
}>()
</script>

<template>
  <div class="min-w-0">
    <p class="lotax-field-label mb-1.5 leading-none">
      {{ label }}
    </p>
    <p class="lotax-field-value text-[16px] font-semibold tracking-tight md:text-[17px]">
      <slot>{{ value == null || value === '' ? '—' : value }}</slot>
    </p>
  </div>
</template>
