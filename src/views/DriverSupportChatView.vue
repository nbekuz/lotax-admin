<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ReloadOutlined, UserOutlined } from '@ant-design/icons-vue'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import ChatMessageList from '@/components/chat/ChatMessageList.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useDriverSupportStore } from '@/stores/driverSupport'
import type { ChatMessage } from '@/types/chat'
import { formatChatListTime } from '@/utils/chatDate'
import { extractErrorMessage } from '@/utils/labels'

const route = useRoute()
const router = useRouter()
const { isMobile } = useBreakpoint()
const store = useDriverSupportStore()

const showList = computed(() => !isMobile.value || !store.activeId)
const showThread = computed(() => !isMobile.value || Boolean(store.activeId))

const threadMessages = computed<ChatMessage[]>(() =>
  store.messages.map((item) => ({
    id: item.id,
    conversation_id: item.conversation_id,
    body: item.body,
    created_at: item.created_at,
    sender_admin_id: '',
    sender_type: item.is_mine ? 'initiator' : 'receiver',
    sender_name: '',
    is_mine: item.is_mine === true,
  })),
)

async function open(id: string) {
  try {
    await store.select(id)
    if (isMobile.value) {
      await router.replace({ name: 'driver-support-conversation', params: { id } })
    }
  } catch (error) {
    message.error(extractErrorMessage(error, 'Не удалось открыть чат'))
  }
}

function back() {
  store.activeId = null
  store.messages = []
  void router.replace({ name: 'driver-support' })
}

async function refresh() {
  try {
    await store.fetchInbox()
    if (store.activeId) await store.loadMessages(store.activeId)
  } catch (error) {
    message.error(extractErrorMessage(error, 'Не удалось обновить'))
  }
}

async function send(body: string) {
  if (body.trim().length > 4000) {
    message.warning('Сообщение длиннее 4000 символов')
    return
  }
  try {
    await store.send(body)
  } catch (error) {
    message.error(extractErrorMessage(error, 'Не удалось отправить'))
  }
}

async function loadOlder() {
  const oldest = store.messages[0]?.id
  if (!store.activeId || !oldest) return
  try {
    await store.loadMessages(store.activeId, oldest)
  } catch (error) {
    message.error(extractErrorMessage(error, 'Не удалось загрузить сообщения'))
  }
}

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === 'string' && id && id !== store.activeId) void open(id)
  },
)

onMounted(async () => {
  try {
    await store.fetchInbox()
    const id = route.params.id
    if (typeof id === 'string' && id) {
      await open(id)
      return
    }
    if (!isMobile.value && store.inbox[0] && !store.activeId) {
      await open(store.inbox[0].id)
    }
  } catch (error) {
    message.error(extractErrorMessage(error, 'Не удалось загрузить чаты'))
  }
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <div class="lotax-card flex min-h-0 flex-1 overflow-hidden !p-0 !shadow-sm">
      <aside
        v-if="showList"
        class="flex h-full min-h-0 flex-col border-r border-line bg-surface-card"
        :class="isMobile ? 'w-full' : 'w-[340px] shrink-0 xl:w-[380px]'"
      >
        <div class="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 class="text-[17px] font-semibold text-ink">Водители</h2>
          <a-button type="text" class="!h-9 !w-9" @click="refresh">
            <template #icon><ReloadOutlined /></template>
          </a-button>
        </div>
        <div v-if="store.loadingInbox && !store.inbox.length" class="flex flex-1 items-center justify-center">
          <a-spin />
        </div>
        <p
          v-else-if="!store.inbox.length"
          class="px-4 py-8 text-center text-[14px] text-ink-muted"
        >
          Водители ещё не писали
        </p>
        <div v-else class="min-h-0 flex-1 overflow-y-auto">
          <button
            v-for="item in store.inbox"
            :key="item.id"
            type="button"
            class="flex w-full appearance-none items-start gap-3 border-0 border-b border-line bg-transparent px-4 py-3 text-left"
            :class="item.id === store.activeId ? 'bg-[var(--lotax-primary-soft)]' : ''"
            @click="open(item.id)"
          >
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted">
              <UserOutlined />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-center justify-between gap-2">
                <span class="truncate text-[15px] font-semibold text-ink">
                  {{ item.driver_display_name || 'Водитель' }}
                </span>
                <span v-if="item.last_message_at" class="shrink-0 text-[12px] text-ink-muted">
                  {{ formatChatListTime(item.last_message_at) }}
                </span>
              </span>
              <span class="mt-0.5 flex items-center justify-between gap-2">
                <span class="truncate text-[13px] text-ink-muted">
                  {{ item.last_message_preview || 'Нет сообщений' }}
                </span>
                <span
                  v-if="item.unread_count > 0"
                  class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--lotax-primary)] px-1.5 text-[11px] font-semibold text-white"
                >
                  {{ item.unread_count }}
                </span>
              </span>
            </span>
          </button>
        </div>
      </aside>

      <section
        v-if="showThread"
        class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface"
      >
        <header
          v-if="store.active"
          class="flex min-h-[64px] items-center gap-3 border-b border-line bg-surface-card px-4 py-3"
        >
          <a-button
            v-if="isMobile"
            type="text"
            class="!h-9 !w-9 !px-0"
            aria-label="Назад"
            @click="back"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </a-button>
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted">
            <UserOutlined />
          </span>
          <div class="min-w-0">
            <p class="truncate text-[16px] font-semibold text-ink">
              {{ store.active.driver_display_name || 'Водитель' }}
            </p>
            <p class="text-[13px] text-ink-muted">Чат с водителем</p>
          </div>
        </header>
        <div
          v-else
          class="flex flex-1 items-center justify-center px-6 text-center text-[15px] text-ink-muted"
        >
          Выберите водителя
        </div>
        <template v-if="store.active">
          <ChatMessageList
            :messages="threadMessages"
            :loading="store.loadingMessages"
            :has-more="store.hasMore"
            @load-older="loadOlder"
          />
          <ChatComposer :sending="store.sending" @send="send" />
        </template>
      </section>
    </div>
  </div>
</template>
