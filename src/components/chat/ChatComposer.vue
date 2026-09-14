<script setup lang="ts">
import { ref } from 'vue'
import { SendOutlined } from '@ant-design/icons-vue'

defineProps<{
  sending: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [body: string]
}>()

const text = ref('')

function submit() {
  const body = text.value.trim()
  if (!body) return
  emit('send', body)
  text.value = ''
}
</script>

<template>
  <div class="chat-composer border-t border-line bg-surface-card px-3 py-2.5 md:px-4">
    <div class="flex items-end gap-2">
      <a-textarea
        v-model:value="text"
        :disabled="disabled || sending"
        :auto-size="{ minRows: 1, maxRows: 5 }"
        placeholder="Введите сообщение…"
        class="chat-composer__input"
        @press-enter.exact.prevent="submit"
      />
      <a-button
        type="primary"
        class="chat-composer__send"
        :loading="sending"
        :disabled="disabled || !text.trim()"
        @click="submit"
      >
        <template #icon><SendOutlined /></template>
      </a-button>
    </div>
  </div>
</template>

<style scoped>
.chat-composer__input :deep(textarea) {
  border-radius: 22px !important;
  padding: 10px 14px !important;
  min-height: 44px !important;
  line-height: 1.35 !important;
}

.chat-composer__send {
  width: 44px !important;
  height: 44px !important;
  border-radius: 50% !important;
  padding: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}
</style>
