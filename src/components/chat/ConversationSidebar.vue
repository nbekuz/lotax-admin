<script setup lang="ts">
import dayjs from 'dayjs'
import type { ChatConversation } from '@/types/chat'
import type { AdminRole } from '@/types/api'
import {
  conversationSubtitle,
  conversationTitle,
} from '@/stores/chat'

defineProps<{
  conversations: ChatConversation[]
  activeId: string | null
  loading: boolean
  role: AdminRole | null
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <div class="flex h-full min-h-0 flex-col border-r border-line bg-white">
    <div class="border-b border-line px-4 py-4">
      <div class="text-[18px] font-semibold text-ink">Чаты</div>
    </div>

    <div v-if="loading && !conversations.length" class="flex flex-1 items-center justify-center">
      <a-spin />
    </div>

    <div
      v-else-if="!conversations.length"
      class="flex flex-1 items-center justify-center px-4 text-center text-[14px] text-ink-muted"
    >
      Нет сообщений. Напишите первым.
    </div>

    <div v-else class="min-h-0 flex-1 overflow-y-auto">
      <button
        v-for="conversation in conversations"
        :key="conversation.id"
        type="button"
        class="flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors hover:bg-surface"
        :class="activeId === conversation.id ? 'bg-brand-soft' : ''"
        @click="emit('select', conversation.id)"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <div class="truncate text-[15px] font-semibold text-ink">
              {{ conversationTitle(conversation, role) }}
            </div>
            <a-badge
              v-if="conversation.unread_count > 0"
              :count="conversation.unread_count"
              :overflow-count="99"
            />
          </div>
          <div class="truncate text-[12px] text-ink-muted">
            {{ conversationSubtitle(conversation, role) }}
          </div>
          <div
            v-if="conversation.last_message_preview"
            class="mt-1 truncate text-[13px] text-ink-muted"
          >
            {{ conversation.last_message_preview }}
          </div>
          <div
            v-if="conversation.last_message_at"
            class="mt-1 text-[11px] text-ink-muted"
          >
            {{ dayjs(conversation.last_message_at).format('DD.MM.YYYY HH:mm') }}
          </div>
        </div>
      </button>
    </div>
  </div>
</template>
