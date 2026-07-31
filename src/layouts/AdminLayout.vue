<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BankOutlined,
  CarOutlined,
  CloudSyncOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useBreakpoint } from '@/composables/useBreakpoint'
import BrandMark from '@/components/BrandMark.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const { isMobile, isLgUp } = useBreakpoint()

const collapsed = ref(false)
const drawerOpen = ref(false)

const selectedKeys = computed(() => {
  if (route.path.startsWith('/parks')) return ['parks']
  if (route.path.startsWith('/settings')) return ['settings']
  if (route.path.startsWith('/sync')) return ['sync']
  if (route.path.startsWith('/staff')) return ['staff']
  if (route.path.startsWith('/profile')) return ['profile']
  return ['drivers']
})

const menuItems = computed(() => {
  if (auth.isSuperAdmin) {
    return [
      {
        key: 'parks',
        icon: () => h(BankOutlined),
        label: 'Таксопарки',
        title: 'Таксопарки',
      },
      {
        key: 'settings',
        icon: () => h(SettingOutlined),
        label: 'Настройки',
        title: 'Настройки',
      },
      {
        key: 'profile',
        icon: () => h(UserOutlined),
        label: 'Профиль',
        title: 'Профиль',
      },
    ]
  }

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
  if (auth.canManageStaff) {
    items.push({
      key: 'staff',
      icon: () => h(TeamOutlined),
      label: 'Сотрудники',
      title: 'Сотрудники',
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

const userInitial = computed(() =>
  (auth.admin?.first_name?.[0] || auth.admin?.email?.[0] || 'A').toUpperCase(),
)

watch(isLgUp, (lg) => {
  if (lg) {
    collapsed.value = false
    drawerOpen.value = false
  } else if (!isMobile.value) {
    collapsed.value = true
  }
}, { immediate: true })

watch(isMobile, (mobile) => {
  if (mobile) {
    drawerOpen.value = false
  }
})

function onMenuClick(info: { key: string | number }) {
  const key = String(info.key)
  router.push(`/${key}`)
  if (isMobile.value) {
    drawerOpen.value = false
  }
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

function toggleNav() {
  if (isMobile.value) {
    drawerOpen.value = !drawerOpen.value
  } else {
    collapsed.value = !collapsed.value
  }
}
</script>

<template>
  <a-layout class="min-h-full">
    <a-layout-sider
      v-if="!isMobile"
      v-model:collapsed="collapsed"
      collapsible
      :trigger="null"
      :width="260"
      :collapsed-width="72"
      theme="light"
      class="lotax-sider !bg-white"
    >
      <div
        class="flex h-16 items-center border-b border-line px-4 xl:h-[72px]"
        :class="collapsed ? 'justify-center' : 'justify-start'"
      >
        <BrandMark
          :size="collapsed ? 36 : 44"
          :show-wordmark="!collapsed"
          layout="inline"
        />
      </div>

      <div class="px-2 py-4">
        <a-menu
          theme="light"
          mode="inline"
          class="!border-none !bg-transparent"
          :selected-keys="selectedKeys"
          :items="menuItems"
          :inline-collapsed="collapsed"
          @click="onMenuClick"
        />
      </div>
    </a-layout-sider>

    <a-drawer
      v-model:open="drawerOpen"
      placement="left"
      :width="280"
      :closable="false"
      class="lotax-nav-drawer"
      :body-style="{ padding: 0 }"
    >
      <div class="flex h-16 items-center border-b border-line px-4">
        <BrandMark :size="40" layout="inline" />
      </div>
      <div class="px-2 py-4">
        <a-menu
          theme="light"
          mode="inline"
          class="!border-none !bg-transparent"
          :selected-keys="selectedKeys"
          :items="menuItems"
          @click="onMenuClick"
        />
      </div>
      <div class="absolute inset-x-0 bottom-0 border-t border-line p-4">
        <a-button class="lotax-btn-secondary w-full" block @click="logout">
          <template #icon><LogoutOutlined /></template>
          Выйти
        </a-button>
      </div>
    </a-drawer>

    <a-layout class="!min-w-0 !bg-surface">
      <a-layout-header
        class="lotax-topbar !sticky !top-0 !z-20 !flex !h-14 !items-center !justify-between !bg-white/95 !px-4 !backdrop-blur-md md:!h-16 md:!px-6 xl:!h-[72px]"
      >
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-muted transition-all duration-fast md:hover:border-zinc-300 md:hover:text-ink"
            :aria-label="isMobile ? 'Открыть меню' : collapsed ? 'Развернуть меню' : 'Свернуть меню'"
            @click="toggleNav"
          >
            <MenuOutlined v-if="isMobile" />
            <MenuUnfoldOutlined v-else-if="collapsed" />
            <MenuFoldOutlined v-else />
          </button>

          <div class="min-w-0 flex-1">
            <div
              class="truncate tracking-tight"
              :class="
                route.name === 'driver-detail' || route.name === 'park-detail'
                  ? 'text-[13px] font-medium text-ink-muted md:text-[14px]'
                  : 'text-base font-semibold text-ink md:text-[20px]'
              "
            >
              {{ route.meta.title || 'Lotax' }}
            </div>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2 md:gap-3">
          <div class="hidden text-[15px] font-medium text-ink lg:block">
            {{ auth.fullName || auth.admin?.email }}
          </div>

          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand md:hidden"
            aria-label="Профиль"
            @click="router.push('/profile')"
          >
            {{ userInitial }}
          </button>

          <a-button class="lotax-btn-secondary !hidden md:!inline-flex" @click="logout">
            <template #icon><LogoutOutlined /></template>
            <span class="hidden lg:inline">Выйти</span>
          </a-button>
        </div>
      </a-layout-header>

      <a-layout-content class="lotax-page-pad">
        <div class="mx-auto min-h-[calc(100vh-5rem)] w-full max-w-[1400px]">
          <router-view />
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.lotax-sider {
  border-right: 1px solid var(--lotax-border) !important;
  transition: width 150ms ease !important;
  position: sticky !important;
  top: 0;
  height: 100vh;
  overflow: auto;
}

.lotax-topbar {
  border-bottom: 1px solid var(--lotax-border);
}

:deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
}

:deep(.ant-menu-item-selected) {
  position: relative;
}

:deep(.ant-menu-item-selected)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  border-radius: 0 4px 4px 0;
  background: var(--lotax-primary);
}

:deep(.ant-drawer-body) {
  position: relative;
  min-height: 100%;
  padding-bottom: 88px !important;
}
</style>
