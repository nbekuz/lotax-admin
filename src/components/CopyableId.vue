<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { CheckOutlined, CopyOutlined } from '@ant-design/icons-vue'

const props = defineProps<{
  label: string
  value?: string | null
}>()

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function copy() {
  if (!props.value) return
  try {
    await navigator.clipboard.writeText(props.value)
    copied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    message.error('Не удалось скопировать')
  }
}
</script>

<template>
  <div class="copyable-id">
    <p class="copyable-id__label">{{ label }}</p>
    <div class="copyable-id__block">
      <code class="copyable-id__value">{{ value || '—' }}</code>
      <button
        v-if="value"
        type="button"
        class="copyable-id__btn"
        :class="{ 'is-copied': copied }"
        :aria-label="copied ? 'Скопировано' : 'Копировать'"
        @click="copy"
      >
        <CheckOutlined v-if="copied" />
        <CopyOutlined v-else class="copyable-id__copy-icon" />
        <span>{{ copied ? 'Скопировано' : 'Копировать' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.copyable-id__label {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}

.copyable-id__block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f8f9fb;
  border: 1px solid #ececec;
}

@media (min-width: 768px) {
  .copyable-id__block {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
}

.copyable-id__value {
  display: block;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #111111;
  word-break: break-all;
}

.copyable-id__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid #ececec;
  background: #fff;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  width: 100%;
  transition:
    background 180ms ease,
    color 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}

@media (min-width: 768px) {
  .copyable-id__btn {
    width: auto;
  }
}

@media (hover: hover) and (pointer: fine) {
  .copyable-id__btn:hover {
    background: #f3f4f6;
    color: #111111;
    border-color: #d4d4d8;
  }

  .copyable-id__btn:hover .copyable-id__copy-icon {
    transform: rotate(-8deg);
  }
}

.copyable-id__copy-icon {
  transition: transform 180ms ease;
}

.copyable-id__btn.is-copied {
  color: #22c55e;
  border-color: #bbf7d0;
  background: #f0fdf4;
}
</style>
