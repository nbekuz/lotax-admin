import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: 'Вход' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: () => {
          const auth = useAuthStore()
          return auth.homePath
        },
      },
      {
        path: 'organization',
        name: 'organization',
        component: () => import('@/views/OrgOverviewView.vue'),
        meta: {
          title: 'Организация',
          roles: ['director', 'manager'],
        },
      },
      {
        path: 'organization/yandex',
        name: 'organization-yandex',
        component: () => import('@/views/YandexParkSettingsView.vue'),
        meta: { title: 'Yandex Fleet', roles: ['director'] },
      },
      {
        path: 'drivers',
        name: 'drivers',
        component: () => import('@/views/DriversView.vue'),
        meta: {
          title: 'Водители',
          roles: ['director', 'manager'],
        },
      },
      {
        path: 'drivers/:id',
        name: 'driver-detail',
        component: () => import('@/views/DriverDetailView.vue'),
        meta: {
          title: 'Карточка водителя',
          roles: ['director', 'manager'],
        },
      },
      {
        path: 'rewards',
        name: 'rewards',
        component: () => import('@/views/RewardsView.vue'),
        meta: {
          title: 'Награды',
          roles: ['director', 'manager'],
        },
      },
      {
        path: 'orders',
        name: 'orders',
        component: () => import('@/views/OrdersView.vue'),
        meta: {
          title: 'Заявки',
          roles: ['director', 'manager'],
        },
      },
      {
        path: 'rules',
        name: 'rules',
        component: () => import('@/views/RulesView.vue'),
        meta: { title: 'Правила', roles: ['director'] },
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: () => import('@/views/TasksView.vue'),
        meta: {
          title: 'Задания',
          roles: ['director', 'manager'],
        },
      },
      {
        path: 'task-templates',
        name: 'task-templates',
        component: () => import('@/views/TaskTemplatesView.vue'),
        meta: {
          title: 'Шаблоны заданий',
          roles: ['director', 'manager'],
        },
      },
      {
        path: 'tasks/:id/progress',
        name: 'task-progress',
        component: () => import('@/views/TaskProgressView.vue'),
        meta: {
          title: 'Прогресс задания',
          roles: ['director', 'manager'],
        },
      },
      {
        path: 'competitions',
        name: 'competitions',
        component: () => import('@/views/CompetitionsView.vue'),
        meta: {
          title: 'Соревнования',
          roles: ['director', 'manager'],
        },
      },
      {
        path: 'competitions/:id/leaderboard',
        name: 'competition-leaderboard',
        component: () => import('@/views/CompetitionLeaderboardView.vue'),
        meta: {
          title: 'Лидерборд соревнования',
          roles: ['director', 'manager'],
        },
      },
      {
        path: 'referral',
        name: 'referral',
        component: () => import('@/views/ReferralProgramView.vue'),
        meta: { title: 'Рефералы', roles: ['director'] },
      },
      {
        path: 'park-groups',
        name: 'park-groups',
        component: () => import('@/views/ParkGroupsView.vue'),
        meta: {
          title: 'Группы парков',
          roles: ['director', 'manager'],
        },
      },
      {
        path: 'leaderboard-settings',
        name: 'leaderboard-settings',
        component: () => import('@/views/LeaderboardSettingsView.vue'),
        meta: {
          title: 'ТОП-5',
          roles: ['director', 'manager'],
        },
      },
      {
        path: 'tier-settings',
        name: 'tier-settings',
        component: () => import('@/views/ParkTierSettingsView.vue'),
        meta: {
          title: 'Уровни',
          roles: ['director', 'manager'],
        },
      },
      {
        path: 'push',
        name: 'push',
        component: () => import('@/views/PushNotifyView.vue'),
        meta: { title: 'Push', roles: ['director'] },
      },
      {
        path: 'sync',
        name: 'sync',
        component: () => import('@/views/SyncView.vue'),
        meta: { title: 'Синхронизация', roles: ['director'] },
      },
      {
        path: 'staff',
        name: 'staff',
        component: () => import('@/views/StaffView.vue'),
        meta: { title: 'Сотрудники', roles: ['director'] },
      },
      {
        path: 'organizations',
        name: 'organizations',
        component: () => import('@/views/OrganizationsView.vue'),
        meta: { title: 'Организации', roles: ['super_admin', 'admin'] },
      },
      {
        path: 'organizations/:id',
        name: 'organization-detail',
        component: () => import('@/views/OrganizationDetailView.vue'),
        meta: { title: 'Организация', roles: ['super_admin', 'admin'] },
      },
      {
        path: 'directors',
        name: 'directors',
        component: () => import('@/views/DirectorsView.vue'),
        meta: { title: 'Директоры', roles: ['super_admin', 'admin'] },
      },
      {
        path: 'platform-admins',
        name: 'platform-admins',
        component: () => import('@/views/PlatformAdminsView.vue'),
        meta: { title: 'Админы платформы', roles: ['super_admin'] },
      },
      { path: 'parks', redirect: '/organizations' },
      { path: 'parks/:id', redirect: '/organizations' },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/PlatformSettingsView.vue'),
        meta: { title: 'Настройки', roles: ['super_admin'] },
      },
      {
        path: 'system-rewards',
        name: 'system-rewards',
        component: () => import('@/views/SystemRewardsView.vue'),
        meta: { title: 'Каталог LOTAX', roles: ['super_admin'] },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: { title: 'Профиль' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

function homeForRole(auth: ReturnType<typeof useAuthStore>) {
  return { path: auth.homePath }
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.bootstrapped) {
    await auth.bootstrap()
  }

  if (to.meta.public) {
    if (auth.isAuthenticated && to.name === 'login') {
      return homeForRole(auth)
    }
    return true
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles && auth.role && !roles.includes(auth.role)) {
    return homeForRole(auth)
  }

  return true
})
