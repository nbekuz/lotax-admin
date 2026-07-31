<script setup lang="ts">
defineProps<{
  label: string
  value?: string | number | null
}>()
</script>

<template>
  <div class="min-w-0">
    <p class="lotax-field-label">{{ label }}</p>
    <p class="lotax-field-value break-words">
      <slot>{{ value == null || value === '' ? '—' : value }}</slot>
    </p>
  </div>
</template>
