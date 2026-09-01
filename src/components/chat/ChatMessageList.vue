<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { ChatMessage } from '@/types/chat'
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
    class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
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
      <div v-if="hasMore" class="text-center">
        <a-button type="link" size="small" :loading="loading" @click="emit('loadOlder')">
          Загрузить ранее
        </a-button>
      </div>
      <ChatMessageBubble
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />
    </template>
  </div>
</template>
