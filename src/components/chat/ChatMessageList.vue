<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { ChatMessage } from '@/types/chat'
import {
  getMessageClusterFlags,
  groupMessagesByDate,
} from '@/utils/chatDate'
import ChatMessageBubble from './ChatMessageBubble.vue'

const props = defineProps<{
  messages: ChatMessage[]
  loading: boolean
  hasMore: boolean
}>()

const emit = defineEmits<{
  loadOlder: []
}>()

const listRef = ref<HTMLElement | null>(null)
const stickToBottom = ref(true)

const groupedMessages = computed(() => groupMessagesByDate(props.messages))

function scrollToBottom() {
  const el = listRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

function onScroll() {
  const el = listRef.value
  if (!el) return

  if (el.scrollTop < 80 && props.hasMore && !props.loading) {
    emit('loadOlder')
  }

  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
  stickToBottom.value = distanceFromBottom < 80
}

watch(
  () => props.messages.length,
  async () => {
    if (!stickToBottom.value) return
    await nextTick()
    scrollToBottom()
  },
)

onMounted(async () => {
  await nextTick()
  scrollToBottom()
})
</script>

<template>
  <div
    ref="listRef"
    class="chat-thread flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 md:px-4"
    @scroll="onScroll"
  >
    <div v-if="loading && !messages.length" class="flex flex-1 items-center justify-center">
      <a-spin />
    </div>

    <div
      v-else-if="!messages.length"
      class="flex flex-1 items-center justify-center text-center text-[15px] text-ink-muted"
    >
      Нет сообщений. Напишите первым.
    </div>

    <template v-else>
      <div v-if="hasMore" class="mb-2 text-center">
        <a-button type="link" size="small" :loading="loading" @click="emit('loadOlder')">
          Загрузить ранее
        </a-button>
      </div>

      <section
        v-for="group in groupedMessages"
        :key="group.key"
        class="mb-2"
      >
        <div class="chat-date-chip">
          {{ group.label }}
        </div>

        <ChatMessageBubble
          v-for="(message, index) in group.items"
          :key="message.id"
          :message="message"
          :cluster="getMessageClusterFlags(group.items, index)"
        />
      </section>
    </template>
  </div>
</template>

<style scoped>
.chat-thread {
  background:
    linear-gradient(180deg, var(--lotax-primary-soft) 0%, transparent 120px),
    var(--lotax-bg);
}

.chat-date-chip {
  margin: 10px auto 12px;
  width: fit-content;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  border: none;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--lotax-text-secondary);
  box-shadow: 0 1px 2px rgba(17, 17, 17, 0.06);
}
</style>
