<script setup lang="ts">
import ThemeModePicker from '@/components/ThemeModePicker.vue'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
</script>

<template>
  <a-popover trigger="click" placement="bottomRight">
    <button type="button" class="lotax-icon-btn" aria-label="Тема" title="Тема">
      <svg
        v-if="theme.isDark"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6" />
      </svg>
    </button>
    <template #content>
      <p class="mb-1 text-[13px] font-semibold text-ink">Тема</p>
      <p class="mb-3 text-[12px] text-ink-muted">{{ theme.hint }}</p>
      <ThemeModePicker compact />
    </template>
  </a-popover>
</template>
