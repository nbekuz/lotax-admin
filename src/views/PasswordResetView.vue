<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  CloseCircleOutlined,
  KeyOutlined,
  LockOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import ChatMessageList from '@/components/chat/ChatMessageList.vue'
import { driversApi } from '@/api/drivers'
import { useAuthStore } from '@/stores/auth'
import { usePasswordResetStore } from '@/stores/passwordReset'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { extractErrorMessage } from '@/utils/labels'
import { formatChatListTime } from '@/utils/chatDate'
import type { ChatMessage } from '@/types/chat'
import type { PasswordResetRoomsFilter } from '@/types/passwordReset'

const auth = useAuthStore()
const store = usePasswordResetStore()
const { isMobile } = useBreakpoint()

const passwordModalOpen = ref(false)
const passwordSaving = ref(false)
const passwordValue = ref('')
const composerPrefill = ref<string | null>(null)

const showSidebar = computed(() => {
  if (!isMobile.value) return true
  return !store.activeRoomId
})

const showThread = computed(() => {
  if (!isMobile.value) return true
  return Boolean(store.activeRoomId)
})

const threadMessages = computed<ChatMessage[]>(() =>
  store.messages.map((m) => ({
    id: m.id,
    conversation_id: m.room_id,
    body: m.body,
    created_at: m.created_at,
    sender_admin_id: m.sender_admin_id ?? '',
    sender_type: m.sender_type === 'admin' ? 'initiator' : 'receiver',
    sender_name: m.sender_type === 'admin' ? 'Парк' : 'Водитель',
    is_mine: m.sender_type === 'admin',
  })),
)

const roomTitle = computed(() => {
  const room = store.activeRoom
  if (!room) return 'Восстановление пароля'
  return room.driver_display_name?.trim() || 'Водитель'
})

const roomSubtitle = computed(() => {
  const room = store.activeRoom
  if (!room) return ''
  if (room.status === 'closed') return 'Комната закрыта'
  return 'Заявка на восстановление пароля'
})

const filterOptions: { value: PasswordResetRoomsFilter; label: string }[] = [
  { value: 'open', label: 'Открытые' },
  { value: 'closed', label: 'Закрытые' },
  { value: 'all', label: 'Все' },
]

function roomLabel(room: { driver_display_name?: string | null }) {
  return room.driver_display_name?.trim() || 'Водитель'
}

function roomPreview(room: {
  last_message_preview?: string | null
}) {
  const text = room.last_message_preview?.trim()
  return text || 'Нет сообщений'
}

async function bootstrap() {
  try {
    await store.fetchRooms()
    if (!isMobile.value && store.rooms.length && !store.activeRoomId) {
      await store.selectRoom(store.rooms[0]!.id)
    }
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

async function selectRoom(id: string) {
  try {
    await store.selectRoom(id)
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function backToList() {
  store.activeRoomId = null
  store.messages = []
}

async function onFilterChange(status: PasswordResetRoomsFilter) {
  try {
    await store.setStatusFilter(status)
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

async function refreshAll() {
  try {
    await store.fetchRooms()
    if (store.activeRoomId) {
      await store.loadMessages(store.activeRoomId)
    }
    message.success('Обновлено')
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

async function sendMessage(body: string) {
  try {
    await store.sendMessage(body)
    composerPrefill.value = null
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function openPasswordModal() {
  passwordValue.value = ''
  passwordModalOpen.value = true
}

async function savePassword() {
  const room = store.activeRoom
  if (!room) return

  const password = passwordValue.value.trim()
  if (!/^\d{4}$/.test(password)) {
    message.warning('Пароль — ровно 4 цифры')
    return
  }

  passwordSaving.value = true
  try {
    await driversApi.setPassword(room.driver_id, { password })
    message.success('Пароль задан')
    passwordModalOpen.value = false
    composerPrefill.value = `Ваш новый пароль: ${password}. Войдите в приложение.`
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось задать пароль'))
  } finally {
    passwordSaving.value = false
  }
}

function confirmCloseRoom() {
  Modal.confirm({
    title: 'Закрыть комнату?',
    content:
      'Водитель больше не сможет писать в эту заявку. Новая заявка создаст новую комнату.',
    okText: 'Закрыть',
    cancelText: 'Отмена',
    okButtonProps: { danger: true },
    centered: true,
    async onOk() {
      try {
        await store.closeActiveRoom()
        message.success('Комната закрыта')
      } catch (e) {
        message.error(extractErrorMessage(e, 'Не удалось закрыть комнату'))
        throw e
      }
    },
  })
}

onMounted(() => {
  void bootstrap()
  store.startPolling()
})

onUnmounted(() => {
  store.stopPolling()
})

watch(
  () => store.statusFilter,
  () => {
    composerPrefill.value = null
  },
)
</script>

<template>
  <div class="flex h-[calc(100vh-7rem)] min-h-[560px] flex-col gap-3 md:gap-4">
    <div
      v-if="isMobile"
      class="flex flex-wrap items-center justify-between gap-3"
    >
      <div>
        <h1 class="text-[24px] font-semibold tracking-tight text-ink">
          Восстановление пароля
        </h1>
        <p class="text-[14px] text-ink-muted">
          Заявки водителей на смену пароля
        </p>
      </div>
      <a-button size="small" @click="refreshAll">
        <template #icon><ReloadOutlined /></template>
      </a-button>
    </div>

    <div class="lotax-card flex min-h-0 flex-1 overflow-hidden !p-0 !shadow-sm">
      <div
        v-if="showSidebar"
        class="h-full min-h-0 border-r border-line"
        :class="isMobile ? 'w-full' : 'w-[340px] shrink-0 xl:w-[380px]'"
      >
        <div class="flex h-full min-h-0 flex-col bg-surface-card">
          <div
            class="flex min-h-[64px] items-center gap-2 border-b border-line px-4 py-3"
          >
            <div class="min-w-0 flex-1">
              <div class="text-[17px] font-semibold tracking-tight text-ink">
                Заявки
              </div>
            </div>
            <a-tooltip v-if="!isMobile" title="Обновить">
              <a-button type="text" class="!h-9 !w-9" @click="refreshAll">
                <template #icon><ReloadOutlined /></template>
              </a-button>
            </a-tooltip>
          </div>

          <div class="border-b border-line px-3 py-2">
            <a-segmented
              :value="store.statusFilter"
              block
              :options="filterOptions"
              @change="(v: string | number) => onFilterChange(String(v) as PasswordResetRoomsFilter)"
            />
          </div>

          <div
            v-if="store.loadingRooms && !store.rooms.length"
            class="flex flex-1 items-center justify-center"
          >
            <a-spin />
          </div>

          <div
            v-else-if="!store.rooms.length"
            class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
          >
            <div class="text-[15px] font-medium text-ink">Нет заявок</div>
            <p class="text-[13px] leading-relaxed text-ink-muted">
              Когда водитель нажмёт «Восстановить пароль», заявка появится здесь
            </p>
          </div>

          <div v-else class="min-h-0 flex-1 overflow-y-auto p-2">
            <button
              v-for="room in store.rooms"
              :key="room.id"
              type="button"
              class="mb-1 flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors"
              :class="
                store.activeRoomId === room.id
                  ? 'bg-brand-soft'
                  : 'hover:bg-black/[0.04]'
              "
              @click="selectRoom(room.id)"
            >
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted"
              >
                <LockOutlined class="text-[20px]" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="truncate text-[15px] font-medium text-ink">
                    {{ roomLabel(room) }}
                  </span>
                  <span
                    v-if="room.last_message_at || room.created_at"
                    class="shrink-0 text-[12px] text-ink-muted"
                  >
                    {{
                      formatChatListTime(
                        room.last_message_at || room.created_at,
                      )
                    }}
                  </span>
                </div>
                <div class="mt-1 flex items-center justify-between gap-2">
                  <span
                    class="truncate text-[14px]"
                    :class="
                      room.last_message_preview?.trim()
                        ? 'text-ink-muted'
                        : 'italic text-ink-muted/70'
                    "
                  >
                    {{ roomPreview(room) }}
                  </span>
                  <a-tag
                    v-if="store.statusFilter === 'all'"
                    :color="room.status === 'open' ? 'orange' : 'default'"
                    class="!m-0 shrink-0"
                  >
                    {{ room.status === 'open' ? 'Открыта' : 'Закрыта' }}
                  </a-tag>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showThread"
        class="flex min-h-0 min-w-0 flex-1 flex-col bg-surface"
      >
        <div
          v-if="store.activeRoom"
          class="flex min-h-[64px] items-center gap-3 border-b border-line bg-surface-card px-4 py-3"
        >
          <a-button v-if="isMobile" type="text" @click="backToList">
            Назад
          </a-button>

          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
          >
            <UserOutlined />
          </div>

          <div class="min-w-0 flex-1">
            <div class="truncate text-[16px] font-semibold text-ink">
              {{ roomTitle }}
            </div>
            <div class="truncate text-[13px] text-ink-muted">
              {{ roomSubtitle }}
            </div>
          </div>

          <div class="flex shrink-0 flex-wrap items-center gap-2">
            <a-button
              v-if="auth.isDirector && store.activeRoom.status === 'open'"
              type="primary"
              size="small"
              @click="openPasswordModal"
            >
              <template #icon><KeyOutlined /></template>
              Задать пароль
            </a-button>
            <a-button
              v-if="store.activeRoom.status === 'open'"
              size="small"
              danger
              :loading="store.closing"
              @click="confirmCloseRoom"
            >
              <template #icon><CloseCircleOutlined /></template>
              Закрыть комнату
            </a-button>
          </div>
        </div>

        <div
          v-else
          class="flex flex-1 items-center justify-center px-6 text-center text-[15px] text-ink-muted"
        >
          Выберите заявку слева
        </div>

        <template v-if="store.activeRoom">
          <ChatMessageList
            :messages="threadMessages"
            :loading="store.loadingMessages"
            :has-more="false"
          />
          <ChatComposer
            :sending="store.sending"
            :disabled="store.activeRoom.status !== 'open'"
            :prefill="composerPrefill"
            @send="sendMessage"
          />
        </template>
      </div>
    </div>

    <a-modal
      v-model:open="passwordModalOpen"
      title="Задать пароль"
      ok-text="Задать"
      cancel-text="Отмена"
      centered
      :width="400"
      :confirm-loading="passwordSaving"
      @ok="savePassword"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Новый пароль (4 цифры)" required>
          <a-input
            v-model:value="passwordValue"
            size="large"
            :maxlength="4"
            inputmode="numeric"
            autocomplete="off"
            placeholder="1234"
            @update:value="
              (v: string) => (passwordValue = String(v).replace(/\D/g, '').slice(0, 4))
            "
          />
          <p class="mt-1 text-[13px] text-ink-muted">
            После сохранения можно отправить пароль водителю в чат
          </p>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
