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
          return auth.isSuperAdmin ? '/organizations' : '/organization'
        },
      },
      {
        path: 'organization',
        name: 'organization',
        component: () => import('@/views/OrgOverviewView.vue'),
        meta: {
          title: 'Организация',
          roles: ['director', 'admin', 'manager'],
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
          roles: ['director', 'admin', 'manager'],
        },
      },
      {
        path: 'drivers/:id',
        name: 'driver-detail',
        component: () => import('@/views/DriverDetailView.vue'),
        meta: {
          title: 'Карточка водителя',
          roles: ['director', 'admin', 'manager'],
        },
      },
      {
        path: 'rewards',
        name: 'rewards',
        component: () => import('@/views/RewardsView.vue'),
        meta: {
          title: 'Награды',
          roles: ['director', 'admin', 'manager'],
        },
      },
      {
        path: 'orders',
        name: 'orders',
        component: () => import('@/views/OrdersView.vue'),
        meta: {
          title: 'Заявки',
          roles: ['director', 'admin', 'manager'],
        },
      },
      {
        path: 'rules',
        name: 'rules',
        component: () => import('@/views/RulesView.vue'),
        meta: { title: 'Правила', roles: ['director', 'admin'] },
      },
      {
        path: 'tasks',
        name: 'tasks',
        component: () => import('@/views/TasksView.vue'),
        meta: {
          title: 'Задания',
          roles: ['director', 'admin', 'manager'],
        },
      },
      {
        path: 'tasks/:id/progress',
        name: 'task-progress',
        component: () => import('@/views/TaskProgressView.vue'),
        meta: {
          title: 'Прогресс задания',
          roles: ['director', 'admin', 'manager'],
        },
      },
      {
        path: 'competitions',
        name: 'competitions',
        component: () => import('@/views/CompetitionsView.vue'),
        meta: {
          title: 'Соревнования',
          roles: ['director', 'admin', 'manager'],
        },
      },
      {
        path: 'competitions/:id/leaderboard',
        name: 'competition-leaderboard',
        component: () => import('@/views/CompetitionLeaderboardView.vue'),
        meta: {
          title: 'Лидерборд соревнования',
          roles: ['director', 'admin', 'manager'],
        },
      },
      {
        path: 'referral',
        name: 'referral',
        component: () => import('@/views/ReferralProgramView.vue'),
        meta: { title: 'Рефералы', roles: ['director', 'admin'] },
      },
      {
        path: 'push',
        name: 'push',
        component: () => import('@/views/PushNotifyView.vue'),
        meta: { title: 'Push', roles: ['director', 'admin'] },
      },
      {
        path: 'sync',
        name: 'sync',
        component: () => import('@/views/SyncView.vue'),
        meta: { title: 'Синхронизация', roles: ['director', 'admin'] },
      },
      {
        path: 'staff',
        name: 'staff',
        component: () => import('@/views/StaffView.vue'),
        meta: { title: 'Сотрудники', roles: ['director', 'admin'] },
      },
      {
        path: 'organizations',
        name: 'organizations',
        component: () => import('@/views/OrganizationsView.vue'),
        meta: { title: 'Организации', roles: ['super_admin'] },
      },
      {
        path: 'organizations/:id',
        name: 'organization-detail',
        component: () => import('@/views/OrganizationDetailView.vue'),
        meta: { title: 'Организация', roles: ['super_admin'] },
      },
      {
        path: 'directors',
        name: 'directors',
        component: () => import('@/views/DirectorsView.vue'),
        meta: { title: 'Директоры', roles: ['super_admin'] },
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
  return auth.isSuperAdmin
    ? { name: 'organizations' as const }
    : { name: 'organization' as const }
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
