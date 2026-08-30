<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ApiOutlined,
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  CarOutlined,
  CloudSyncOutlined,
  ClusterOutlined,
  CrownOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  InboxOutlined,
  FlagOutlined,
  GiftOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  NotificationOutlined,
  OrderedListOutlined,
  PictureOutlined,
  SettingOutlined,
  ShareAltOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { extractErrorMessage } from '@/utils/labels'
import BrandMark from '@/components/BrandMark.vue'

const auth = useAuthStore()
const org = useOrgStore()
const route = useRoute()
const router = useRouter()
const { isMobile, isLgUp } = useBreakpoint()

const collapsed = ref(false)
const drawerOpen = ref(false)

const selectedKeys = computed(() => {
  if (route.path.startsWith('/organizations')) return ['organizations']
  if (route.path.startsWith('/directors')) return ['directors']
  if (route.path.startsWith('/platform-admins')) return ['platform-admins']
  if (route.path.startsWith('/system-rewards')) return ['system-rewards']
  if (route.path.startsWith('/banners')) return ['banners']
  if (route.path.startsWith('/deleted-drivers')) return ['deleted-drivers']
  if (route.path.startsWith('/organization/yandex')) return ['organization-yandex']
  if (route.path === '/organization' || route.path.startsWith('/organization/')) {
    return ['organization']
  }
  if (route.path.startsWith('/rewards')) return ['rewards']
  if (route.path.startsWith('/orders')) return ['orders']
  if (route.path.startsWith('/rules')) return ['rules']
  if (route.path.startsWith('/task-templates')) return ['task-templates']
  if (route.path.startsWith('/tasks')) return ['tasks']
  if (route.path.startsWith('/competitions')) return ['competitions']
  if (route.path.startsWith('/referral')) return ['referral']
  if (route.path.startsWith('/park-groups')) return ['park-groups']
  if (route.path.startsWith('/leaderboard-settings')) return ['leaderboard-settings']
  if (route.path.startsWith('/tier-settings')) return ['tier-settings']
  if (route.path.startsWith('/reports')) return ['reports']
  if (route.path.startsWith('/pdn')) return ['pdn']
  if (route.path.startsWith('/push')) return ['push']
  if (route.path.startsWith('/settings')) return ['settings']
  if (route.path.startsWith('/sync')) return ['sync']
  if (route.path.startsWith('/staff')) return ['staff']
  if (route.path.startsWith('/profile')) return ['profile']
  if (route.path.startsWith('/drivers')) return ['drivers']
  return auth.isPlatformOperator ? ['organizations'] : ['organization']
})

const menuItems = computed(() => {
  if (auth.isPlatformOperator) {
    const items = [
      {
        key: 'organizations',
        icon: () => h(BankOutlined),
        label: 'Организации',
        title: 'Организации',
      },
      {
        key: 'directors',
        icon: () => h(TeamOutlined),
        label: 'Директоры',
        title: 'Директоры',
      },
    ]
    if (auth.isSuperAdmin) {
      items.push({
        key: 'platform-admins',
        icon: () => h(UserOutlined),
        label: 'Админы',
        title: 'Админы платформы',
      })
      items.push({
        key: 'system-rewards',
        icon: () => h(GiftOutlined),
        label: 'Каталог LOTAX',
        title: 'Каталог LOTAX',
      })
      items.push({
        key: 'banners',
        icon: () => h(PictureOutlined),
        label: 'Баннеры',
        title: 'Баннеры',
      })
      items.push({
        key: 'deleted-drivers',
        icon: () => h(InboxOutlined),
        label: 'Архив',
        title: 'Архив водителей',
      })
      items.push({
        key: 'settings',
        icon: () => h(SettingOutlined),
        label: 'Настройки',
        title: 'Настройки',
      })
    }
    items.push({
      key: 'profile',
      icon: () => h(UserOutlined),
      label: 'Профиль',
      title: 'Профиль',
    })
    return items
  }

  const items = [
    {
      key: 'organization',
      icon: () => h(BankOutlined),
      label: 'Организация',
      title: 'Организация',
    },
    {
      key: 'drivers',
      icon: () => h(CarOutlined),
      label: 'Водители',
      title: 'Водители',
    },
    {
      key: 'rewards',
      icon: () => h(GiftOutlined),
      label: 'Награды',
      title: 'Награды',
    },
    {
      key: 'orders',
      icon: () => h(AuditOutlined),
      label: 'Заявки',
      title: 'Заявки',
    },
  ]
  if (auth.canViewReports) {
    items.push({
      key: 'reports',
      icon: () => h(BarChartOutlined),
      label: 'Отчёт',
      title: 'Отчёт',
    })
  }
  if (auth.canViewPdnAudit) {
    items.push({
      key: 'pdn',
      icon: () => h(FileSearchOutlined),
      label: 'ПДн',
      title: 'Журнал ПДн',
    })
  }
  if (auth.canManageRules) {
    items.push({
      key: 'rules',
      icon: () => h(FileTextOutlined),
      label: 'Правила',
      title: 'Правила',
    })
  }
  if (auth.canViewTasks) {
    items.push({
      key: 'tasks',
      icon: () => h(FlagOutlined),
      label: 'Задания',
      title: 'Задания',
    })
    items.push({
      key: 'task-templates',
      icon: () => h(FileTextOutlined),
      label: 'Шаблоны',
      title: 'Шаблоны заданий',
    })
  }
  if (auth.canViewCompetitions) {
    items.push({
      key: 'competitions',
      icon: () => h(TrophyOutlined),
      label: 'Соревнования',
      title: 'Соревнования',
    })
  }
  if (auth.canManageReferral) {
    items.push({
      key: 'referral',
      icon: () => h(ShareAltOutlined),
      label: 'Рефералы',
      title: 'Рефералы',
    })
  }
  if (auth.canViewParkGroups) {
    items.push({
      key: 'park-groups',
      icon: () => h(ClusterOutlined),
      label: 'Группы парков',
      title: 'Группы парков',
    })
  }
  if (auth.canViewLeaderboardSettings) {
    items.push({
      key: 'leaderboard-settings',
      icon: () => h(OrderedListOutlined),
      label: 'ТОП-5',
      title: 'ТОП-5',
    })
  }
  if (auth.canViewTierSettings) {
    items.push({
      key: 'tier-settings',
      icon: () => h(CrownOutlined),
      label: 'Уровни',
      title: 'Уровни',
    })
  }
  if (auth.canManageRewards) {
    items.push({
      key: 'push',
      icon: () => h(NotificationOutlined),
      label: 'Push',
      title: 'Push',
    })
  }
  if (auth.canManageYandex) {
    items.push({
      key: 'organization-yandex',
      icon: () => h(ApiOutlined),
      label: 'Yandex',
      title: 'Yandex Fleet',
    })
  }
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

const parkSelectOptions = computed(() =>
  org.parks.map((p) => ({ value: p.id, label: p.name })),
)

const orgSelectOptions = computed(() =>
  org.myOrganizations.map((o) => ({ value: o.id, label: o.name })),
)

const userInitial = computed(() =>
  (auth.admin?.first_name?.[0] || auth.admin?.email?.[0] || 'A').toUpperCase(),
)

onMounted(async () => {
  if (auth.isParkAdmin) {
    try {
      await org.loadDashboard()
    } catch {
      /* ignore */
    }
  }
})

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
  router.push({ name: key })
  if (isMobile.value) {
    drawerOpen.value = false
  }
}

function onParkChange(id: string) {
  org.selectPark(id)
}

async function onOrgChange(id: string) {
  if (id === org.organization?.id) return
  try {
    await org.switchOrganization(id)
    message.success('Организация переключена')
  } catch (e) {
    message.error(extractErrorMessage(e))
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
                route.name === 'driver-detail' ||
                route.name === 'organization-detail'
                  ? 'text-[13px] font-medium text-ink-muted md:text-[14px]'
                  : 'text-base font-semibold text-ink md:text-[20px]'
              "
            >
              {{ route.meta.title || 'Lotax' }}
            </div>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2 md:gap-3">
          <a-select
            v-if="auth.isParkAdmin && org.hasMultipleOrgs"
            :value="org.organization?.id"
            class="!w-36 md:!w-44"
            size="large"
            :options="orgSelectOptions"
            :loading="org.switching"
            placeholder="Организация"
            @change="(v) => onOrgChange(String(v))"
          />
          <a-select
            v-if="auth.isParkAdmin && parkSelectOptions.length"
            :value="org.selectedParkId ?? undefined"
            class="!w-36 md:!w-48"
            size="large"
            :options="parkSelectOptions"
            placeholder="Парк"
            @change="(v) => onParkChange(String(v))"
          />


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
