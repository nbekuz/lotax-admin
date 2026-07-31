<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { CheckOutlined, CopyOutlined } from '@ant-design/icons-vue'

const props = defineProps<{
  label: string
  value?: string | null
}>()

const copied = ref(false)

async function copy() {
  if (!props.value) return
  try {
    await navigator.clipboard.writeText(props.value)
    copied.value = true
    message.success('Скопировано')
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    message.error('Не удалось скопировать')
  }
}
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="lotax-field-label !mb-0">{{ label }}</p>
      <button
        v-if="value"
        type="button"
        class="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-ink-muted transition-all duration-fast hover:bg-surface hover:text-ink"
        @click="copy"
      >
        <CheckOutlined v-if="copied" class="text-success" />
        <CopyOutlined v-else />
        {{ copied ? 'Скопировано' : 'Копировать' }}
      </button>
    </div>
    <div class="lotax-code">
      {{ value || '—' }}
    </div>
  </div>
</template>
