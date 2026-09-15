<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '@/types/chat'
import type { MessageClusterFlags } from '@/utils/chatDate'
import { formatChatTime } from '@/utils/chatDate'

const props = defineProps<{
  message: ChatMessage
  cluster: MessageClusterFlags
}>()

const time = computed(() => formatChatTime(props.message.created_at))

const bubbleClass = computed(() => {
  const mine = props.message.is_mine
  const { isFirst, isLast } = props.cluster

  if (mine) {
    if (isFirst && isLast) return 'chat-bubble chat-bubble--mine chat-bubble--mine-single'
    if (isFirst) return 'chat-bubble chat-bubble--mine chat-bubble--mine-first'
    if (isLast) return 'chat-bubble chat-bubble--mine chat-bubble--mine-last'
    return 'chat-bubble chat-bubble--mine chat-bubble--mine-middle'
  }

  if (isFirst && isLast) return 'chat-bubble chat-bubble--other chat-bubble--other-single'
  if (isFirst) return 'chat-bubble chat-bubble--other chat-bubble--other-first'
  if (isLast) return 'chat-bubble chat-bubble--other chat-bubble--other-last'
  return 'chat-bubble chat-bubble--other chat-bubble--other-middle'
})
</script>

<template>
  <div class="flex" :class="message.is_mine ? 'justify-end' : 'justify-start'">
    <div class="max-w-[min(100%,68%)]" :class="cluster.isLast ? 'mb-2' : 'mb-0.5'">
      <div :class="bubbleClass">
        <div class="chat-bubble__text">
          <span class="chat-bubble__body">{{ message.body }}</span>
          <span
            class="chat-bubble__time"
            :class="message.is_mine ? 'chat-bubble__time--mine' : 'chat-bubble__time--other'"
          >
            {{ time }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-bubble {
  position: relative;
  min-width: 52px;
  padding: 8px 12px 7px;
  box-shadow: 0 1px 1px rgba(17, 17, 17, 0.04);
}

.chat-bubble--mine {
  background: var(--lotax-primary);
  color: #fff;
}

.chat-bubble--other {
  background: #fff;
  color: var(--lotax-text);
  border: 1px solid rgba(17, 17, 17, 0.06);
}

.chat-bubble--mine-single {
  border-radius: 18px 18px 6px 18px;
}

.chat-bubble--mine-first {
  border-radius: 18px 18px 6px 18px;
}

.chat-bubble--mine-middle {
  border-radius: 18px 6px 6px 18px;
}

.chat-bubble--mine-last {
  border-radius: 18px 6px 6px 18px;
}

.chat-bubble--other-single {
  border-radius: 18px 18px 18px 6px;
}

.chat-bubble--other-first {
  border-radius: 18px 18px 18px 6px;
}

.chat-bubble--other-middle {
  border-radius: 6px 18px 18px 6px;
}

.chat-bubble--other-last {
  border-radius: 6px 18px 18px 6px;
}

.chat-bubble__text {
  display: block;
  font-size: 15px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-bubble__body {
  display: inline;
}

.chat-bubble__time {
  display: inline-block;
  margin-left: 8px;
  font-size: 11px;
  line-height: 1.2;
  white-space: nowrap;
  vertical-align: bottom;
  transform: translateY(1px);
}

.chat-bubble__time--mine {
  color: rgba(255, 255, 255, 0.82);
}

.chat-bubble__time--other {
  color: var(--lotax-text-tertiary);
}
</style>
