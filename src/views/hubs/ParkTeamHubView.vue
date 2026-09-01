<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { MessageOutlined, TeamOutlined } from '@ant-design/icons-vue'
import HubNavCard from '@/components/HubNavCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

const auth = useAuthStore()
const chat = useChatStore()
const router = useRouter()

const links = computed(() => {
  const items = []
  if (auth.canManageStaff) {
    items.push({
      key: 'staff',
      title: 'Сотрудники',
      description: 'Менеджеры парка и доступ в ЛК',
      icon: TeamOutlined,
      route: 'staff',
    })
  }
  if (auth.canViewChat) {
    items.push({
      key: 'chat',
      title: 'Чаты',
      description: 'Переписка с менеджерами и поддержкой',
      icon: MessageOutlined,
      route: 'chat',
      badge: chat.totalUnread > 0 ? chat.totalUnread : undefined,
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
      <h1 class="lotax-page-title">Команда</h1>
      <p class="lotax-caption mt-1">Сотрудники парка и внутренняя переписка</p>
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
        :badge="item.badge"
        @click="open(item.route)"
      />
    </div>
  </div>
</template>
