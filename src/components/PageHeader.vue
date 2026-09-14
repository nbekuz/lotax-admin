<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
  }>(),
  {
    subtitle: undefined,
  },
)
</script>

<template>
  <header class="lotax-page-header">
    <div class="min-w-0 flex-1">
      <h1 class="lotax-page-title">{{ title }}</h1>
      <p v-if="subtitle" class="lotax-page-subtitle">{{ subtitle }}</p>
      <slot name="description" />
    </div>
    <div v-if="$slots.actions" class="lotax-btn-stack shrink-0">
      <slot name="actions" />
    </div>
  </header>
</template>
