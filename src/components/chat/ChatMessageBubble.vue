<script setup lang="ts">
import dayjs from 'dayjs'
import type { ChatMessage } from '@/types/chat'

defineProps<{
  message: ChatMessage
}>()
</script>

<template>
  <div
    class="flex"
    :class="message.is_mine ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[min(100%,520px)] rounded-2xl px-4 py-2.5 shadow-sm"
      :class="
        message.is_mine
          ? 'rounded-br-md bg-brand text-white'
          : 'rounded-bl-md border border-line bg-white text-ink'
      "
    >
      <div
        v-if="!message.is_mine"
        class="mb-1 text-[12px] font-medium text-ink-muted"
      >
        {{ message.sender_name }}
      </div>
      <div class="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
        {{ message.body }}
      </div>
      <div
        class="mt-1 text-right text-[11px]"
        :class="message.is_mine ? 'text-white/70' : 'text-ink-muted'"
      >
        {{ dayjs(message.created_at).format('DD.MM.YYYY HH:mm') }}
      </div>
    </div>
  </div>
</template>
