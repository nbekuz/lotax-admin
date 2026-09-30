<script setup lang="ts">
import { BgColorsOutlined } from '@ant-design/icons-vue'
import ThemeModePicker from '@/components/ThemeModePicker.vue'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
</script>

<template>
  <a-popover trigger="click" placement="bottomRight">
    <button type="button" class="lotax-icon-btn" aria-label="Тема" title="Тема">
      <BgColorsOutlined />
    </button>
    <template #content>
      <p class="mb-1 text-[13px] font-semibold text-ink">Тема</p>
      <p class="mb-3 text-[12px] text-ink-muted">{{ theme.hint }}</p>
      <ThemeModePicker compact />
    </template>
  </a-popover>
</template>
