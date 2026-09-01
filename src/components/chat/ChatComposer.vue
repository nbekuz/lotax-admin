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
  <div class="border-t border-line bg-white px-4 py-3">
    <div class="flex items-end gap-2">
      <a-textarea
        v-model:value="text"
        :disabled="disabled || sending"
        :auto-size="{ minRows: 1, maxRows: 5 }"
        placeholder="Введите сообщение…"
        class="!rounded-2xl"
        @press-enter.exact.prevent="submit"
      />
      <a-button
        type="primary"
        class="!h-11 !w-11 !rounded-xl"
        :loading="sending"
        :disabled="disabled || !text.trim()"
        @click="submit"
      >
        <template #icon><SendOutlined /></template>
      </a-button>
    </div>
  </div>
</template>
