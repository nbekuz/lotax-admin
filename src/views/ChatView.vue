<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  CustomerServiceOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'
import { adminsApi } from '@/api/admins'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import ChatMessageList from '@/components/chat/ChatMessageList.vue'
import ConversationSidebar from '@/components/chat/ConversationSidebar.vue'
import { useAuthStore } from '@/stores/auth'
import {
  conversationSubtitle,
  conversationTitle,
  useChatStore,
} from '@/stores/chat'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { extractErrorMessage } from '@/utils/labels'
import type { AdminListItem } from '@/types/api'

const auth = useAuthStore()
const chat = useChatStore()
const route = useRoute()
const router = useRouter()
const { isMobile } = useBreakpoint()

const managerModalOpen = ref(false)
const managers = ref<AdminListItem[]>([])
const managersLoading = ref(false)
const openingSupport = ref(false)
const openingStaff = ref(false)

const pageTitle = computed(() => {
  if (auth.isSuperAdmin) return 'Обращения директоров'
  return 'Чаты'
})

const showSidebar = computed(() => {
  if (!isMobile.value) return true
  return !chat.activeConversationId
})

const showThread = computed(() => {
  if (!isMobile.value) return true
  return Boolean(chat.activeConversationId)
})

const activeTitle = computed(() => {
  if (!chat.activeConversation) return 'Чат'
  return conversationTitle(chat.activeConversation, auth.role)
})

const activeSubtitle = computed(() => {
  if (!chat.activeConversation) return ''
  return conversationSubtitle(chat.activeConversation, auth.role)
})

async function bootstrap() {
  try {
    await Promise.all([chat.fetchConversations(), chat.fetchNotifications()])

    const routeId = route.params.id
    if (typeof routeId === 'string' && routeId) {
      await chat.selectConversation(routeId)
      return
    }

    if (auth.isManager && chat.conversations.length === 1) {
      await chat.selectConversation(chat.conversations[0]!.id)
      return
    }

    if (!isMobile.value && chat.conversations.length && !chat.activeConversationId) {
      await chat.selectConversation(chat.conversations[0]!.id)
    }
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

async function selectConversation(id: string) {
  try {
    await chat.selectConversation(id)
    if (isMobile.value) {
      await router.replace({ name: 'chat-conversation', params: { id } })
    }
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function backToList() {
  chat.activeConversationId = null
  chat.messages = []
  router.replace({ name: 'chat' })
}

async function openSupport() {
  openingSupport.value = true
  try {
    const conversation = await chat.openSupport()
    await router.replace({
      name: 'chat-conversation',
      params: { id: conversation.id },
    })
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    openingSupport.value = false
  }
}

async function loadManagers() {
  managersLoading.value = true
  try {
    const data = await adminsApi.listManagers({ page_size: 100 })
    managers.value = data.items
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    managersLoading.value = false
  }
}

async function openManagerChat(managerId: string) {
  openingStaff.value = true
  try {
    const conversation = await chat.openStaff(managerId)
    managerModalOpen.value = false
    await router.replace({
      name: 'chat-conversation',
      params: { id: conversation.id },
    })
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    openingStaff.value = false
  }
}

async function openDirectorChat() {
  openingStaff.value = true
  try {
    const conversation = await chat.openStaff()
    await router.replace({
      name: 'chat-conversation',
      params: { id: conversation.id },
    })
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    openingStaff.value = false
  }
}

async function refreshAll() {
  try {
    await chat.fetchConversations()
    await chat.fetchNotifications()
    if (chat.activeConversationId) {
      await chat.loadMessages(chat.activeConversationId)
    }
    message.success('Обновлено')
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

watch(
  () => route.params.id,
  async (id) => {
    if (typeof id === 'string' && id && id !== chat.activeConversationId) {
      await chat.selectConversation(id)
    }
  },
)

onMounted(() => {
  void bootstrap()
})
</script>

<template>
  <div class="flex h-[calc(100vh-7rem)] min-h-[560px] flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-[24px] font-semibold tracking-tight text-ink">
          {{ pageTitle }}
        </h1>
        <p v-if="chat.totalUnread > 0" class="text-[14px] text-ink-muted">
          Непрочитанных: {{ chat.totalUnread }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <a-button @click="refreshAll">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>

        <a-button
          v-if="auth.isDirector"
          type="primary"
          :loading="openingSupport"
          @click="openSupport"
        >
          <template #icon><CustomerServiceOutlined /></template>
          Помощь
        </a-button>

        <a-button
          v-if="auth.isDirector"
          :loading="openingStaff"
          @click="managerModalOpen = true; loadManagers()"
        >
          <template #icon><PlusOutlined /></template>
          Чат с менеджером
        </a-button>

        <a-button
          v-if="auth.isManager && !chat.conversations.length"
          type="primary"
          :loading="openingStaff"
          @click="openDirectorChat"
        >
          Чат с директором
        </a-button>
      </div>
    </div>

    <div class="lotax-card flex min-h-0 flex-1 overflow-hidden !p-0">
      <div
        v-if="showSidebar"
        class="h-full min-h-0"
        :class="isMobile ? 'w-full' : 'w-[320px] shrink-0 xl:w-[360px]'"
      >
        <ConversationSidebar
          :conversations="chat.conversations"
          :active-id="chat.activeConversationId"
          :loading="chat.loadingConversations"
          :role="auth.role"
          @select="selectConversation"
        />
      </div>

      <div
        v-if="showThread"
        class="flex min-h-0 min-w-0 flex-1 flex-col bg-surface"
      >
        <div
          v-if="chat.activeConversation"
          class="flex items-center gap-3 border-b border-line bg-white px-4 py-3"
        >
          <a-button
            v-if="isMobile"
            type="text"
            @click="backToList"
          >
            Назад
          </a-button>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[16px] font-semibold text-ink">
              {{ activeTitle }}
            </div>
            <div class="truncate text-[13px] text-ink-muted">
              {{ activeSubtitle }}
            </div>
          </div>
        </div>

        <div
          v-else
          class="flex flex-1 items-center justify-center px-6 text-center text-[15px] text-ink-muted"
        >
          Выберите чат слева или откройте новый диалог.
        </div>

        <template v-if="chat.activeConversation">
          <ChatMessageList
            :messages="chat.messages"
            :loading="chat.loadingMessages"
            :has-more="chat.messagesHasMore"
            @load-older="chat.loadOlderMessages()"
          />
          <ChatComposer
            :sending="chat.sending"
            @send="chat.sendMessage"
          />
        </template>
      </div>
    </div>

    <a-modal
      v-model:open="managerModalOpen"
      title="Чат с менеджером"
      :footer="null"
      destroy-on-close
    >
      <a-spin :spinning="managersLoading">
        <div v-if="!managers.length" class="py-6 text-center text-ink-muted">
          Менеджеры не найдены
        </div>
        <div v-else class="flex flex-col gap-2">
          <a-button
            v-for="manager in managers"
            :key="manager.id"
            block
            class="!h-auto !justify-start !py-3"
            :loading="openingStaff"
            @click="openManagerChat(manager.id)"
          >
            <div class="text-left">
              <div class="font-medium">
                {{ manager.first_name }} {{ manager.last_name }}
              </div>
              <div class="text-[13px] text-ink-muted">{{ manager.email }}</div>
            </div>
          </a-button>
        </div>
      </a-spin>
    </a-modal>
  </div>
</template>
