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
          return auth.isSuperAdmin ? '/parks' : '/drivers'
        },
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
        path: 'parks',
        name: 'parks',
        component: () => import('@/views/ParksView.vue'),
        meta: { title: 'Таксопарки', roles: ['super_admin'] },
      },
      {
        path: 'parks/:id',
        name: 'park-detail',
        component: () => import('@/views/ParkDetailView.vue'),
        meta: { title: 'Парк', roles: ['super_admin'] },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/PlatformSettingsView.vue'),
        meta: { title: 'Настройки', roles: ['super_admin'] },
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
  return auth.isSuperAdmin ? { name: 'parks' as const } : { name: 'drivers' as const }
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
