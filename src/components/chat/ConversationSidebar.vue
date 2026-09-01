<script setup lang="ts">
import { CustomerServiceOutlined, UserOutlined } from '@ant-design/icons-vue'
import type { ChatConversation } from '@/types/chat'
import type { AdminRole } from '@/types/api'
import { conversationTitle } from '@/stores/chat'
import { formatChatListTime } from '@/utils/chatDate'

const props = defineProps<{
  conversations: ChatConversation[]
  activeId: string | null
  loading: boolean
  role: AdminRole | null
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

function initials(conversation: ChatConversation) {
  const title = conversationTitle(conversation, props.role)
  const parts = title.trim().split(/\s+/)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  return (title[0] ?? '?').toUpperCase()
}

function previewText(conversation: ChatConversation) {
  const text = conversation.last_message_preview?.trim()
  if (text) return text
  return 'Нет сообщений'
}
</script>

<template>
  <div class="chat-sidebar flex h-full min-h-0 flex-col bg-white">
    <div class="chat-sidebar__toolbar">
      <div class="min-w-0 flex-1">
        <div class="text-[17px] font-semibold tracking-tight text-ink">Чаты</div>
      </div>
      <slot name="actions" />
    </div>

    <div v-if="loading && !conversations.length" class="flex flex-1 items-center justify-center">
      <a-spin />
    </div>

    <div
      v-else-if="!conversations.length"
      class="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <div class="text-[15px] font-medium text-ink">Пока нет диалогов</div>
      <p class="text-[13px] leading-relaxed text-ink-muted">
        Нажмите «Помощь» или создайте чат с менеджером
      </p>
    </div>

    <div v-else class="chat-sidebar__list min-h-0 flex-1 overflow-y-auto">
      <button
        v-for="conversation in conversations"
        :key="conversation.id"
        type="button"
        class="chat-sidebar__item"
        :class="{
          'chat-sidebar__item--active': activeId === conversation.id,
          'chat-sidebar__item--unread': conversation.unread_count > 0,
        }"
        @click="emit('select', conversation.id)"
      >
        <div
          class="chat-sidebar__avatar"
          :class="
            conversation.conversation_type === 'support'
              ? 'chat-sidebar__avatar--support'
              : 'chat-sidebar__avatar--person'
          "
        >
          <CustomerServiceOutlined
            v-if="conversation.conversation_type === 'support'"
            class="text-[22px]"
          />
          <UserOutlined
            v-else-if="conversation.conversation_type === 'staff'"
            class="text-[22px]"
          />
          <span v-else>{{ initials(conversation) }}</span>
        </div>

        <div class="chat-sidebar__content">
          <div class="chat-sidebar__top">
            <span class="chat-sidebar__name">
              {{ conversationTitle(conversation, role) }}
            </span>
            <span
              v-if="conversation.last_message_at"
              class="chat-sidebar__time"
            >
              {{ formatChatListTime(conversation.last_message_at) }}
            </span>
          </div>

          <div class="chat-sidebar__bottom">
            <span
              class="chat-sidebar__preview"
              :class="{ 'chat-sidebar__preview--empty': !conversation.last_message_preview?.trim() }"
            >
              {{ previewText(conversation) }}
            </span>
            <span
              v-if="conversation.unread_count > 0"
              class="chat-sidebar__badge"
            >
              {{
                conversation.unread_count > 99
                  ? '99+'
                  : conversation.unread_count
              }}
            </span>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-sidebar {
  border-right: 1px solid var(--lotax-border);
}

.chat-sidebar__toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--lotax-border);
  background: #fff;
}

.chat-sidebar__list {
  padding: 4px 0;
}

.chat-sidebar__item {
  appearance: none;
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 10px 16px;
  border: none;
  border-bottom: 1px solid rgba(17, 17, 17, 0.05);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 120ms ease;
  -webkit-tap-highlight-color: transparent;
}

.chat-sidebar__item:last-child {
  border-bottom: none;
}

.chat-sidebar__item:hover {
  background: rgba(17, 17, 17, 0.03);
}

.chat-sidebar__item:active {
  background: rgba(17, 17, 17, 0.05);
}

.chat-sidebar__item:focus {
  outline: none;
  box-shadow: none;
}

.chat-sidebar__item:focus-visible {
  outline: 2px solid rgba(247, 147, 26, 0.45);
  outline-offset: -2px;
}

.chat-sidebar__item--active {
  background: rgba(247, 147, 26, 0.08);
}

.chat-sidebar__item--active:hover {
  background: rgba(247, 147, 26, 0.1);
}

.chat-sidebar__avatar {
  display: flex;
  height: 48px;
  width: 48px;
  shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.chat-sidebar__avatar--support {
  background: linear-gradient(145deg, #fff1df 0%, #ffd9a8 100%);
  color: #c56a00;
}

.chat-sidebar__avatar--person {
  background: linear-gradient(145deg, #f4f5f7 0%, #e7eaef 100%);
  color: #5b6470;
}

.chat-sidebar__content {
  min-width: 0;
  flex: 1;
  padding: 1px 0;
}

.chat-sidebar__top,
.chat-sidebar__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.chat-sidebar__bottom {
  margin-top: 4px;
}

.chat-sidebar__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--lotax-text);
}

.chat-sidebar__item--unread .chat-sidebar__name {
  font-weight: 700;
}

.chat-sidebar__time {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1.2;
  color: #9ca3af;
}

.chat-sidebar__item--unread .chat-sidebar__time {
  color: var(--lotax-primary);
  font-weight: 600;
}

.chat-sidebar__preview {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  line-height: 1.25;
  color: #8e8e93;
}

.chat-sidebar__preview--empty {
  font-style: italic;
  color: #b0b4bb;
}

.chat-sidebar__item--unread .chat-sidebar__preview:not(.chat-sidebar__preview--empty) {
  color: #4b5563;
  font-weight: 500;
}

.chat-sidebar__badge {
  flex-shrink: 0;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  background: var(--lotax-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 20px;
  text-align: center;
}
</style>
