<script setup lang="ts">
import { computed } from 'vue'
import { ConfigProvider, theme as antdTheme } from 'ant-design-vue'
import ruRU from 'ant-design-vue/es/locale/ru_RU'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { useThemeStore } from '@/stores/theme'

dayjs.locale('ru')

const themeStore = useThemeStore()

const theme = computed(() => {
  const dark = themeStore.isDark
  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#F7931A',
      colorSuccess: '#16A34A',
      colorWarning: '#D97706',
      colorError: '#EF4444',
      colorInfo: '#2563EB',
      colorText: dark ? '#F5F5F7' : '#111111',
      colorTextSecondary: dark ? '#AEAEB2' : '#6B7280',
      colorTextTertiary: dark ? '#8E8E93' : '#9CA3AF',
      colorBorder: dark ? '#3A3A3C' : '#E8EAED',
      colorBorderSecondary: dark ? '#3A3A3C' : '#E8EAED',
      colorBgLayout: dark ? '#0A0A0A' : '#F5F6F8',
      colorBgContainer: dark ? '#1C1C1E' : '#FFFFFF',
      colorBgElevated: dark ? '#2C2C2E' : '#FFFFFF',
      borderRadius: 12,
      borderRadiusLG: 16,
      borderRadiusSM: 8,
      fontFamily:
        "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      fontSize: 14,
      controlHeight: 40,
      controlHeightLG: 44,
      controlHeightSM: 32,
      paddingContentHorizontal: 16,
      controlPaddingHorizontal: 14,
      controlPaddingHorizontalSM: 10,
      wireframe: false,
    },
    components: {
      Button: {
        controlHeight: 40,
        borderRadius: 12,
        primaryShadow: '0 1px 2px rgba(247, 147, 26, 0.22)',
      },
      Table: {
        headerBg: dark ? '#161618' : '#FAFBFC',
        headerColor: dark ? '#AEAEB2' : '#6B7280',
        rowHoverBg: dark ? '#2C2C2E' : '#FAFBFC',
        borderColor: dark ? '#3A3A3C' : '#E8EAED',
      },
      Modal: {
        borderRadiusLG: 20,
      },
      Card: {
        borderRadiusLG: 16,
      },
    },
  }
})
</script>

<template>
  <ConfigProvider :locale="ruRU" :theme="theme">
    <router-view />
  </ConfigProvider>
</template>
