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
    class="lotax-card lotax-card-hover group flex w-full items-center gap-4 p-4 text-left md:p-5"
    @click="$emit('click')"
  >
    <div
      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand md:h-12 md:w-12 md:rounded-2xl"
    >
      <component :is="icon" class="text-[20px] md:text-[22px]" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="text-[15px] font-semibold tracking-tight text-ink md:text-[16px]">
          {{ title }}
        </span>
        <a-badge v-if="badge" :count="badge" :overflow-count="99" />
      </div>
      <p class="mt-1 text-[13px] leading-snug text-ink-muted md:text-[14px]">
        {{ description }}
      </p>
    </div>
    <RightOutlined
      class="shrink-0 text-[13px] text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand"
    />
  </button>
</template>
