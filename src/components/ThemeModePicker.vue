<script setup lang="ts">
import { useThemeStore, type ThemeMode } from '@/stores/theme'

defineProps<{
  compact?: boolean
}>()

const theme = useThemeStore()

const options: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Авто' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
]
</script>

<template>
  <div
    class="theme-picker"
    role="radiogroup"
    aria-label="Тема"
    :class="compact ? 'theme-picker--compact' : ''"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      class="theme-picker__btn"
      :aria-checked="theme.mode === option.value"
      :class="theme.mode === option.value ? 'is-active' : ''"
      @click="theme.setMode(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.theme-picker {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: var(--lotax-chip);
}

.theme-picker--compact .theme-picker__btn {
  min-width: 72px;
  padding: 6px 10px;
  font-size: 12px;
}

.theme-picker__btn {
  flex: 1;
  min-width: 84px;
  border: 0;
  border-radius: 10px;
  padding: 8px 12px;
  background: transparent;
  color: var(--lotax-text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.theme-picker__btn.is-active {
  background: var(--lotax-card);
  color: var(--lotax-text);
  box-shadow: var(--lotax-shadow);
}
</style>
