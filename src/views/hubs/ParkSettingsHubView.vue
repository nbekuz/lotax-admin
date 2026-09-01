<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ApiOutlined,
  CloudSyncOutlined,
  ClusterOutlined,
  CrownOutlined,
  FileTextOutlined,
  NotificationOutlined,
  OrderedListOutlined,
} from '@ant-design/icons-vue'
import HubNavCard from '@/components/HubNavCard.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const links = computed(() => {
  const items = []
  if (auth.canManageRules) {
    items.push({
      key: 'rules',
      title: 'Правила',
      description: 'Правила парка и условия для водителей',
      icon: FileTextOutlined,
      route: 'rules',
    })
  }
  if (auth.canViewParkGroups) {
    items.push({
      key: 'park-groups',
      title: 'Группы парков',
      description: 'Объединение парков и общие настройки',
      icon: ClusterOutlined,
      route: 'park-groups',
    })
  }
  if (auth.canViewLeaderboardSettings) {
    items.push({
      key: 'leaderboard-settings',
      title: 'ТОП-5',
      description: 'Лидерборд лучших водителей парка',
      icon: OrderedListOutlined,
      route: 'leaderboard-settings',
    })
  }
  if (auth.canViewTierSettings) {
    items.push({
      key: 'tier-settings',
      title: 'Уровни',
      description: 'Уровни водителей и пороги баллов',
      icon: CrownOutlined,
      route: 'tier-settings',
    })
  }
  if (auth.canManageRewards) {
    items.push({
      key: 'push',
      title: 'Push-уведомления',
      description: 'Рассылка push водителям парка',
      icon: NotificationOutlined,
      route: 'push',
    })
  }
  if (auth.canManageYandex) {
    items.push({
      key: 'organization-yandex',
      title: 'Yandex Fleet',
      description: 'Интеграция с Yandex Fleet API',
      icon: ApiOutlined,
      route: 'organization-yandex',
    })
  }
  if (auth.canSync) {
    items.push({
      key: 'sync',
      title: 'Синхронизация',
      description: 'Синхронизация данных с внешними системами',
      icon: CloudSyncOutlined,
      route: 'sync',
    })
  }
  return items
})

function open(routeName: string) {
  router.push({ name: routeName })
}
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div>
      <h1 class="lotax-page-title">Настройки парка</h1>
      <p class="lotax-caption mt-1">
        Правила, уровни, интеграции и сервисные параметры
      </p>
    </div>

    <div v-if="!links.length" class="lotax-card p-8 text-center lotax-caption">
      Разделы недоступны для вашей роли
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2">
      <HubNavCard
        v-for="item in links"
        :key="item.key"
        :title="item.title"
        :description="item.description"
        :icon="item.icon"
        @click="open(item.route)"
      />
    </div>
  </div>
</template>
