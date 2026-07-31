<script setup lang="ts">
import { ConfigProvider } from 'ant-design-vue'
import ruRU from 'ant-design-vue/es/locale/ru_RU'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'

dayjs.locale('ru')

const theme = {
  token: {
    colorPrimary: '#1c1c1e',
    borderRadius: 12,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
}
</script>

<template>
  <ConfigProvider :locale="ruRU" :theme="theme">
    <router-view />
  </ConfigProvider>
</template>
