<script setup lang="ts">
import { RouterLink } from 'vue-router'
import BrandMark from '@/components/BrandMark.vue'
</script>

<template>
  <div class="min-h-screen bg-surface text-ink">
    <header class="border-b border-line bg-white">
      <div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 md:px-6">
        <RouterLink to="/login" class="inline-flex items-center gap-2">
          <BrandMark :size="36" layout="inline" />
        </RouterLink>
        <nav class="flex gap-4 text-[13px] font-medium text-ink-muted">
          <RouterLink class="hover:text-brand" to="/privacy">Конфиденциальность</RouterLink>
          <RouterLink class="hover:text-brand" to="/termofuse">Условия</RouterLink>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <slot />
    </main>
    <footer class="border-t border-line py-6 text-center text-[12px] text-ink-muted">
      © {{ new Date().getFullYear() }} Lotax · Loyalty Taxi Parks
    </footer>
  </div>
</template>
