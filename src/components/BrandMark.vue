<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Logo size in px */
    size?: number
    /** Show wordmark under/beside logo */
    showWordmark?: boolean
    /** Layout: stacked (login) or inline (sidebar) */
    layout?: 'stack' | 'inline'
  }>(),
  {
    size: 48,
    showWordmark: true,
    layout: 'stack',
  },
)
</script>

<template>
  <div
    class="flex shrink-0 items-center overflow-visible"
    :class="layout === 'stack' ? 'flex-col gap-2' : 'flex-row gap-3'"
  >
    <img
      src="@/assets/logo.png"
      alt=""
      class="block shrink-0 object-contain"
      :width="size"
      :height="size"
      :style="{ width: `${size}px`, height: `${size}px` }"
    />
    <div
      v-if="showWordmark"
      class="shrink-0"
      :class="layout === 'stack' ? 'text-center' : ''"
    >
      <div
        class="font-bold tracking-tight leading-none whitespace-nowrap"
        :class="layout === 'stack' ? 'text-[32px]' : 'text-lg'"
        aria-label="Lotax"
      >
        <span class="text-[#111111]">Lo</span><span class="lotax-tax">tax</span>
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.lotax-tax {
  background-image: linear-gradient(180deg, #ffb000 0%, #f7931a 48%, #e67e00 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
</style>
