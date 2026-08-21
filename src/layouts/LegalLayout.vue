<script setup lang="ts">
import { RouterLink } from 'vue-router'
import BrandMark from '@/components/BrandMark.vue'

const links = [
  { to: '/privacy', label: 'Конфиденциальность', short: 'Приватность' },
  { to: '/termofuse', label: 'Условия', short: 'Условия' },
  { to: '/delete-account', label: 'Удаление аккаунта', short: 'Удаление' },
  { to: '/help', label: 'Помощь', short: 'Помощь' },
] as const
</script>

<template>
  <div class="legal-shell min-h-screen bg-surface text-ink">
    <header class="legal-header">
      <div class="legal-header__inner">
        <RouterLink
          to="/privacy"
          class="legal-brand"
          aria-label="Lotax — политика конфиденциальности"
        >
          <BrandMark :size="32" layout="inline" />
        </RouterLink>

        <nav class="legal-nav" aria-label="Документы">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="legal-nav__link"
            active-class="is-active"
          >
            <span class="legal-nav__full">{{ link.label }}</span>
            <span class="legal-nav__short">{{ link.short }}</span>
          </RouterLink>
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

<style scoped>
.legal-header {
  position: sticky;
  top: 0;
  z-index: 30;
  border-bottom: 1px solid var(--lotax-border);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.legal-header__inner {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  max-width: 48rem;
  margin: 0 auto;
  padding: 12px 16px 14px;
}

.legal-brand {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  text-decoration: none;
  color: inherit;
}

.legal-nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.legal-nav__link {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 8px 6px;
  border-radius: 999px;
  border: 1px solid var(--lotax-border);
  background: #fff;
  color: var(--lotax-text-secondary);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  transition:
    color 150ms ease,
    background 150ms ease,
    border-color 150ms ease;
}

.legal-nav__link:hover {
  color: var(--lotax-text);
  border-color: #d4d4d8;
}

.legal-nav__link.is-active {
  color: var(--lotax-primary);
  background: var(--lotax-primary-soft);
  border-color: transparent;
}

.legal-nav__full {
  display: none;
}

.legal-nav__short {
  display: inline;
}

@media (min-width: 768px) {
  .legal-header__inner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 24px;
  }

  .legal-nav {
    display: flex;
    width: auto;
    gap: 8px;
  }

  .legal-nav__link {
    min-height: 36px;
    padding: 8px 14px;
    font-size: 13px;
  }

  .legal-nav__full {
    display: inline;
  }

  .legal-nav__short {
    display: none;
  }
}
</style>
