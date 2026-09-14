<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { TeamOutlined } from '@ant-design/icons-vue'
import HubNavCard from '@/components/HubNavCard.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const links = computed(() => {
  if (!auth.canManageStaff) return []
  return [
    {
      key: 'staff',
      title: 'Сотрудники',
      description: 'Менеджеры парка и доступ в ЛК',
      icon: TeamOutlined,
      route: 'staff',
    },
  ]
})

function open(routeName: string) {
  router.push({ name: routeName })
}
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <PageHeader title="Сотрудники" subtitle="Управление менеджерами парка" />

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
