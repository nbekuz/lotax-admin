<script setup lang="ts">
import { ConfigProvider } from 'ant-design-vue'
import ruRU from 'ant-design-vue/es/locale/ru_RU'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'

dayjs.locale('ru')

const theme = {
  token: {
    colorPrimary: '#F7931A',
    colorSuccess: '#16A34A',
    colorWarning: '#D97706',
    colorError: '#EF4444',
    colorInfo: '#2563EB',
    colorText: '#111111',
    colorTextSecondary: '#6B7280',
    colorTextTertiary: '#9CA3AF',
    colorBorder: '#E8EAED',
    colorBorderSecondary: '#E8EAED',
    colorBgLayout: '#F5F6F8',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
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
      headerBg: '#FAFBFC',
      headerColor: '#6B7280',
      rowHoverBg: '#FAFBFC',
      borderColor: '#E8EAED',
    },
    Modal: {
      borderRadiusLG: 20,
    },
    Card: {
      borderRadiusLG: 16,
    },
  },
}
</script>

<template>
  <ConfigProvider :locale="ruRU" :theme="theme">
    <router-view />
  </ConfigProvider>
</template>
