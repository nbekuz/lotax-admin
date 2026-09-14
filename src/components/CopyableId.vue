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
    <div class="copyable-id__block lotax-code">
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
  color: var(--lotax-text-secondary);
}

.copyable-id__block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
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
  color: var(--lotax-text);
  word-break: break-all;
  background: transparent;
  padding: 0;
  border: none;
}

.copyable-id__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: var(--lotax-radius);
  border: 1px solid var(--lotax-border);
  background: var(--lotax-card);
  color: var(--lotax-text-secondary);
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
    background: var(--lotax-bg);
    color: var(--lotax-text);
    border-color: var(--lotax-border-strong);
  }

  .copyable-id__btn:hover .copyable-id__copy-icon {
    transform: rotate(-8deg);
  }
}

.copyable-id__copy-icon {
  transition: transform 180ms ease;
}

.copyable-id__btn.is-copied {
  color: var(--lotax-success);
  border-color: var(--lotax-success);
  background: var(--lotax-success-soft);
}
</style>
