<script setup lang="ts">
import { computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CarOutlined,
  CloudSyncOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { APP_NAME } from '@/config'
import { roleLabel } from '@/utils/labels'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const selectedKeys = computed(() => {
  if (route.path.startsWith('/sync')) return ['sync']
  if (route.path.startsWith('/profile')) return ['profile']
  return ['drivers']
})

const menuItems = computed(() => {
  const items = [
    {
      key: 'drivers',
      icon: () => h(CarOutlined),
      label: 'Водители',
      title: 'Водители',
    },
  ]
  if (auth.canSync) {
    items.push({
      key: 'sync',
      icon: () => h(CloudSyncOutlined),
      label: 'Синхронизация',
      title: 'Синхронизация',
    })
  }
  items.push({
    key: 'profile',
    icon: () => h(UserOutlined),
    label: 'Профиль',
    title: 'Профиль',
  })
  return items
})

function onMenuClick({ key }: { key: string }) {
  router.push(`/${key === 'drivers' ? 'drivers' : key}`)
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <a-layout class="min-h-full">
    <a-layout-sider
      breakpoint="lg"
      collapsed-width="0"
      class="!bg-[#1c1c1e]"
      :width="240"
    >
      <div class="flex h-16 items-center gap-3 px-5 text-white">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-lg font-bold"
        >
          L
        </div>
        <div>
          <div class="text-base font-semibold leading-tight">{{ APP_NAME }}</div>
          <div class="text-xs text-white/50">Панель управления</div>
        </div>
      </div>
      <a-menu
        theme="dark"
        mode="inline"
        class="!bg-transparent"
        :selected-keys="selectedKeys"
        :items="menuItems"
        @click="onMenuClick"
      />
    </a-layout-sider>

    <a-layout>
      <a-layout-header
        class="!flex !h-16 !items-center !justify-between !bg-white !px-6 shadow-sm"
      >
        <div class="text-lg font-semibold text-neutral-900">
          {{ route.meta.title || 'Lotax' }}
        </div>
        <div class="flex items-center gap-4">
          <div class="hidden text-right sm:block">
            <div class="text-sm font-medium">{{ auth.fullName || auth.admin?.email }}</div>
            <div class="text-xs text-neutral-500">
              {{ auth.role ? roleLabel[auth.role] : '' }}
            </div>
          </div>
          <a-button type="default" @click="logout">
            <template #icon><LogoutOutlined /></template>
            Выйти
          </a-button>
        </div>
      </a-layout-header>

      <a-layout-content class="m-4 md:m-6">
        <div class="min-h-[calc(100vh-8rem)] rounded-2xl bg-white p-4 shadow-sm md:p-6">
          <router-view />
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>
