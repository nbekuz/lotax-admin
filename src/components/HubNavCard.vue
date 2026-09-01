<script setup lang="ts">
import type { Component } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'

defineProps<{
  title: string
  description: string
  icon: Component
  badge?: string | number
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="lotax-card lotax-card-hover group flex w-full items-center gap-4 p-5 text-left transition"
    @click="$emit('click')"
  >
    <div
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand"
    >
      <component :is="icon" class="text-[22px]" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="text-[16px] font-semibold text-ink">{{ title }}</span>
        <a-badge v-if="badge" :count="badge" :overflow-count="99" />
      </div>
      <p class="mt-1 text-[14px] leading-snug text-ink-muted">
        {{ description }}
      </p>
    </div>
    <RightOutlined
      class="shrink-0 text-[14px] text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand"
    />
  </button>
</template>
