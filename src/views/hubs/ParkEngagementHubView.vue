<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  FlagOutlined,
  ShareAltOutlined,
  TrophyOutlined,
} from '@ant-design/icons-vue'
import HubNavCard from '@/components/HubNavCard.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const links = computed(() => {
  const items = []
  if (auth.canViewTasks) {
    items.push({
      key: 'tasks',
      title: 'Задания',
      description: 'Дефолтные и свои задания парка',
      icon: FlagOutlined,
      route: 'tasks',
    })
  }
  if (auth.canViewCompetitions) {
    items.push({
      key: 'competitions',
      title: 'Соревнования',
      description: 'Соревнования, лидерборды и призы',
      icon: TrophyOutlined,
      route: 'competitions',
    })
  }
  if (auth.canManageReferral) {
    items.push({
      key: 'referral',
      title: 'Рефералы',
      description: 'Реферальная программа и бонусы',
      icon: ShareAltOutlined,
      route: 'referral',
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
    <PageHeader
      title="Активность"
      subtitle="Задания, соревнования и программы вовлечения водителей"
    />

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
