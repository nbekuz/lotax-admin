<script setup lang="ts">
import { ConfigProvider } from 'ant-design-vue'
import ruRU from 'ant-design-vue/es/locale/ru_RU'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'

dayjs.locale('ru')

const theme = {
  token: {
    colorPrimary: '#F7931A',
    colorSuccess: '#22C55E',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorText: '#111111',
    colorTextSecondary: '#6B7280',
    colorBorder: '#ECECEC',
    colorBgLayout: '#F8F9FB',
    colorBgContainer: '#FFFFFF',
    borderRadius: 10,
    borderRadiusLG: 12,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 15,
    controlHeight: 42,
    controlHeightLG: 44,
    paddingContentHorizontal: 16,
    controlPaddingHorizontal: 16,
    controlPaddingHorizontalSM: 12,
  },
}
</script>

<template>
  <ConfigProvider :locale="ruRU" :theme="theme">
    <router-view />
  </ConfigProvider>
</template>
