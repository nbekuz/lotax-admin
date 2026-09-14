<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { BarChartOutlined, FileSearchOutlined } from '@ant-design/icons-vue'
import HubNavCard from '@/components/HubNavCard.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const links = computed(() => {
  const items = []
  if (auth.canViewReports) {
    items.push({
      key: 'reports',
      title: 'Отчёт',
      description: 'Сводные показатели и выгрузка данных',
      icon: BarChartOutlined,
      route: 'reports',
    })
  }
  if (auth.canViewPdnAudit) {
    items.push({
      key: 'pdn',
      title: 'Журнал ПДн',
      description: 'Аудит доступа к персональным данным',
      icon: FileSearchOutlined,
      route: 'pdn',
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
      title="Аналитика"
      subtitle="Отчёты и журнал работы с персональными данными"
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
