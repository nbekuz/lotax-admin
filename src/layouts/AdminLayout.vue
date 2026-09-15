<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Badge, message } from 'ant-design-vue'
import {
  AuditOutlined,
  AppstoreOutlined,
  BankOutlined,
  BarChartOutlined,
  CarOutlined,
  GiftOutlined,
  InboxOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  LockOutlined,
  MessageOutlined,
  PictureOutlined,
  RocketOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  NotificationOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useOrgStore } from '@/stores/org'
import { usePasswordResetStore } from '@/stores/passwordReset'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { extractErrorMessage } from '@/utils/labels'
import BrandMark from '@/components/BrandMark.vue'

const auth = useAuthStore()
const chat = useChatStore()
const passwordReset = usePasswordResetStore()
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
  if (route.path.startsWith('/platform-push')) return ['platform-push']
  if (route.path.startsWith('/banners')) return ['banners']
  if (route.path.startsWith('/deleted-drivers')) return ['deleted-drivers']
  if (route.path === '/analytics' || route.path.startsWith('/reports') || route.path.startsWith('/pdn')) {
    return ['analytics-hub']
  }
  if (
    route.path === '/engagement' ||
    route.path.startsWith('/tasks') ||
    route.path.startsWith('/task-templates') ||
    route.path.startsWith('/competitions') ||
    route.path.startsWith('/referral')
  ) {
    return ['engagement-hub']
  }
  if (
    route.path === '/park-settings' ||
    route.path.startsWith('/rules') ||
    route.path.startsWith('/park-groups') ||
    route.path.startsWith('/leaderboard-settings') ||
    route.path.startsWith('/tier-settings') ||
    route.path.startsWith('/push') ||
    route.path.startsWith('/organization/yandex') ||
    route.path.startsWith('/sync')
  ) {
    return ['park-settings-hub']
  }
  if (route.path === '/team' || route.path.startsWith('/staff')) {
    return ['staff']
  }
  if (route.path.startsWith('/chat')) return ['chat']
  if (route.path.startsWith('/password-reset')) return ['password-reset']
  if (route.path === '/organization' || route.path.startsWith('/organization/')) {
    return ['organization']
  }
  if (route.path.startsWith('/reward-icons')) return ['reward-icons']
  if (route.path.startsWith('/rewards')) return ['rewards']
  if (route.path.startsWith('/orders')) return ['orders']
  if (route.path.startsWith('/settings')) return ['settings']
  if (route.path.startsWith('/profile')) return ['profile']
  if (route.path.startsWith('/drivers')) return ['drivers']
  return auth.isPlatformOperator ? ['organizations'] : ['organization']
})

const showEngagementHub = computed(
  () =>
    auth.canViewTasks ||
    auth.canViewCompetitions ||
    auth.canManageReferral,
)

const showParkSettingsHub = computed(
  () =>
    auth.canManageRules ||
    auth.canViewParkGroups ||
    auth.canViewLeaderboardSettings ||
    auth.canViewTierSettings ||
    auth.canManageRewards ||
    auth.canManageYandex ||
    auth.canSync,
)

const showAnalyticsHub = computed(
  () => auth.canViewReports || auth.canViewPdnAudit,
)

function chatMenuLabel(text: string, unread = chat.totalUnread) {
  return h(
    'span',
    {
      class: 'inline-flex w-full min-w-0 items-center justify-between gap-2',
    },
    [
      h('span', { class: 'truncate' }, text),
      unread > 0
        ? h(Badge, {
            count: unread,
            overflowCount: 99,
            size: 'small',
          })
        : null,
    ],
  )
}

const menuItems = computed(() => {
  const unreadCount = chat.totalUnread

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
        key: 'chat',
        icon: () => h(MessageOutlined),
        label: chatMenuLabel('Обращения', unreadCount) as unknown as string,
        title: 'Обращения директоров',
      })
      items.push({
        key: 'system-rewards',
        icon: () => h(GiftOutlined),
        label: 'Каталог LOTAX',
        title: 'Каталог LOTAX',
      })
      items.push({
        key: 'platform-push',
        icon: () => h(NotificationOutlined),
        label: 'Push',
        title: 'Push по организациям',
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
      key: 'reward-icons',
      icon: () => h(AppstoreOutlined),
      label: 'Иконки',
      title: 'Иконки наград',
    },
    {
      key: 'orders',
      icon: () => h(AuditOutlined),
      label: 'Заявки',
      title: 'Заявки',
    },
  ]
  if (auth.canViewChat) {
    items.push({
      key: 'chat',
      icon: () => h(MessageOutlined),
      label: chatMenuLabel('Чаты', unreadCount) as unknown as string,
      title: 'Чаты',
    })
  }
  if (auth.canViewPasswordReset) {
    items.push({
      key: 'password-reset',
      icon: () => h(LockOutlined),
      label: chatMenuLabel(
        'Восстановление пароля',
        passwordReset.openCount,
      ) as unknown as string,
      title: 'Восстановление пароля',
    })
  }
  if (showAnalyticsHub.value) {
    items.push({
      key: 'analytics-hub',
      icon: () => h(BarChartOutlined),
      label: 'Аналитика',
      title: 'Аналитика',
    })
  }
  if (showEngagementHub.value) {
    items.push({
      key: 'engagement-hub',
      icon: () => h(RocketOutlined),
      label: 'Активность',
      title: 'Активность',
    })
  }
  if (showParkSettingsHub.value) {
    items.push({
      key: 'park-settings-hub',
      icon: () => h(SettingOutlined),
      label: 'Настройки',
      title: 'Настройки парка',
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

const headerTitle = computed(() => String(route.meta.title || 'Lotax'))

const isDetailRoute = computed(
  () =>
    route.name === 'driver-detail' ||
    route.name === 'organization-detail' ||
    route.name === 'task-progress' ||
    route.name === 'competition-leaderboard' ||
    route.name === 'chat-conversation',
)

onMounted(async () => {
  if (auth.isParkAdmin) {
    try {
      await org.loadDashboard()
    } catch {
      /* ignore */
    }
  }
  if (auth.canViewChat) {
    try {
      await chat.fetchNotifications()
      chat.startRealtime()
    } catch {
      /* ignore */
    }
  }
  if (auth.canViewPasswordReset) {
    try {
      await passwordReset.fetchOpenCount()
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
  chat.reset()
  passwordReset.reset()
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
        class="lotax-sider__brand flex items-center border-b border-line px-4"
        :class="collapsed ? 'justify-center' : 'justify-start'"
      >
        <BrandMark
          :size="collapsed ? 34 : 40"
          :show-wordmark="!collapsed"
          layout="inline"
        />
      </div>

      <div class="lotax-sider__menu flex-1 overflow-y-auto px-1 py-3">
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
      :width="288"
      :closable="false"
      class="lotax-nav-drawer"
      :body-style="{ padding: 0 }"
    >
      <div class="flex h-14 items-center border-b border-line px-4">
        <BrandMark :size="36" layout="inline" />
      </div>
      <div class="px-1 py-3">
        <a-menu
          theme="light"
          mode="inline"
          class="!border-none !bg-transparent"
          :selected-keys="selectedKeys"
          :items="menuItems"
          @click="onMenuClick"
        />
      </div>
      <div class="absolute inset-x-0 bottom-0 border-t border-line bg-white p-4">
        <a-button class="lotax-btn-secondary w-full" block @click="logout">
          <template #icon><LogoutOutlined /></template>
          Выйти
        </a-button>
      </div>
    </a-drawer>

    <a-layout class="!min-w-0 !bg-surface">
      <a-layout-header class="lotax-topbar">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            class="lotax-icon-btn"
            :aria-label="isMobile ? 'Открыть меню' : collapsed ? 'Развернуть меню' : 'Свернуть меню'"
            @click="toggleNav"
          >
            <MenuOutlined v-if="isMobile" />
            <MenuUnfoldOutlined v-else-if="collapsed" />
            <MenuFoldOutlined v-else />
          </button>

          <div class="min-w-0 flex-1">
            <p
              class="truncate"
              :class="
                isDetailRoute
                  ? 'text-[13px] font-medium text-ink-muted'
                  : 'text-[15px] font-semibold tracking-tight text-ink md:text-base'
              "
            >
              {{ headerTitle }}
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2 md:gap-2.5">
          <a-select
            v-if="auth.isParkAdmin && org.hasMultipleOrgs"
            :value="org.organization?.id"
            class="!w-32 md:!w-44"
            :options="orgSelectOptions"
            :loading="org.switching"
            placeholder="Организация"
            @change="(v) => onOrgChange(String(v))"
          />
          <a-select
            v-if="auth.isParkAdmin && parkSelectOptions.length"
            :value="org.selectedParkId ?? undefined"
            class="!w-32 md:!w-44"
            :options="parkSelectOptions"
            placeholder="Парк"
            @change="(v) => onParkChange(String(v))"
          />

          <div
            class="hidden max-w-[180px] truncate text-[13px] font-medium text-ink-muted xl:block"
          >
            {{ auth.fullName || auth.admin?.email }}
          </div>

          <button
            type="button"
            class="lotax-avatar-btn md:hidden"
            aria-label="Профиль"
            @click="router.push('/profile')"
          >
            {{ userInitial }}
          </button>

          <button
            type="button"
            class="lotax-avatar-btn hidden md:inline-flex"
            :title="auth.fullName || auth.admin?.email || 'Профиль'"
            aria-label="Профиль"
            @click="router.push('/profile')"
          >
            {{ userInitial }}
          </button>

          <a-button
            class="lotax-btn-secondary !hidden lg:!inline-flex"
            @click="logout"
          >
            <template #icon><LogoutOutlined /></template>
            Выйти
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
  transition: width 160ms ease !important;
  position: sticky !important;
  top: 0;
  height: 100vh;
  overflow: hidden;
  z-index: 30;
}

.lotax-sider__brand {
  height: 64px;
  flex-shrink: 0;
}

.lotax-sider__menu {
  min-height: 0;
}

.lotax-topbar {
  position: sticky !important;
  top: 0;
  z-index: 20;
  display: flex !important;
  height: 64px !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px;
  padding-inline: 16px !important;
  background: rgba(255, 255, 255, 0.92) !important;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--lotax-border);
  line-height: 1.2 !important;
}

@media (min-width: 768px) {
  .lotax-topbar {
    padding-inline: 24px !important;
  }
}

.lotax-icon-btn {
  display: inline-flex;
  height: 40px;
  width: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid var(--lotax-border);
  background: #fff;
  color: var(--lotax-text-secondary);
  transition:
    border-color 160ms ease,
    color 160ms ease,
    background 160ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .lotax-icon-btn:hover {
    border-color: var(--lotax-border-strong);
    color: var(--lotax-text);
    background: #fafafa;
  }
}

.lotax-avatar-btn {
  display: inline-flex;
  height: 36px;
  width: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--lotax-primary-soft);
  color: var(--lotax-primary);
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 160ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .lotax-avatar-btn:hover {
    background: var(--lotax-primary-strong);
  }
}

:deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

:deep(.ant-menu-item-selected) {
  position: relative;
}

:deep(.ant-menu-item-selected::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  border-radius: 0 4px 4px 0;
  background: var(--lotax-primary);
}

:deep(.ant-drawer-body) {
  position: relative;
  min-height: 100%;
  padding-bottom: 88px !important;
}
</style>
