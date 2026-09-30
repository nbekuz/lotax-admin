<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    value: string | number
    hint?: string
    tone?: 'blue' | 'green' | 'orange' | 'amber'
  }>(),
  {
    hint: undefined,
    tone: 'blue',
  },
)

const toneClass = computed(() => `kpi-tone-${props.tone}`)
</script>

<template>
  <article class="kpi-card" :class="toneClass">
    <div class="kpi-card__icon" aria-hidden="true">
      <slot name="icon" />
    </div>
    <div class="min-w-0">
      <p class="kpi-card__title">{{ title }}</p>
      <p class="kpi-card__value">{{ value }}</p>
      <p v-if="hint" class="kpi-card__hint">{{ hint }}</p>
    </div>
  </article>
</template>

<style scoped>
.kpi-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 84px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--lotax-card);
  border: 1px solid var(--lotax-border);
  box-shadow: var(--lotax-shadow);
}

.kpi-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  font-size: 16px;
}

.kpi-card__title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--lotax-text-secondary);
}

.kpi-card__value {
  margin: 2px 0 0;
  font-size: 1.5rem;
  font-weight: 650;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--lotax-text);
}

.kpi-card__hint {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--lotax-text-tertiary);
}

.kpi-tone-blue .kpi-card__icon {
  background: var(--lotax-info-soft);
  color: var(--lotax-info);
}

.kpi-tone-green .kpi-card__icon {
  background: var(--lotax-success-soft);
  color: var(--lotax-success);
}

.kpi-tone-orange .kpi-card__icon,
.kpi-tone-amber .kpi-card__icon {
  background: var(--lotax-primary-soft);
  color: var(--lotax-primary);
}
</style>
