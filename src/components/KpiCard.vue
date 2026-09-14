<script setup lang="ts">
import { computed } from 'vue'
import { RiseOutlined } from '@ant-design/icons-vue'

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

const toneClass = computed(() => {
  const map = {
    blue: 'kpi-tone-blue',
    green: 'kpi-tone-green',
    orange: 'kpi-tone-orange',
    amber: 'kpi-tone-amber',
  }
  return map[props.tone]
})
</script>

<template>
  <article class="kpi-card" :class="toneClass">
    <div class="kpi-card__icon" aria-hidden="true">
      <slot name="icon" />
    </div>

    <div class="kpi-card__body">
      <p class="kpi-card__title">{{ title }}</p>
      <p class="kpi-card__value">{{ value }}</p>
    </div>

    <div class="kpi-card__footer">
      <p class="kpi-card__hint">{{ hint || '\u00A0' }}</p>
      <span class="kpi-card__trend" aria-hidden="true">
        <RiseOutlined />
      </span>
    </div>
  </article>
</template>

<style scoped>
.kpi-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 140px;
  height: 100%;
  padding: 20px;
  border-radius: var(--lotax-radius-lg);
  background: var(--lotax-card);
  border: 1px solid var(--lotax-border);
  box-shadow: var(--lotax-shadow);
  transition:
    transform var(--lotax-transition),
    box-shadow var(--lotax-transition),
    border-color var(--lotax-transition);
}

@media (min-width: 1440px) {
  .kpi-card {
    min-height: 148px;
    padding: 22px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--lotax-shadow-hover);
    border-color: var(--lotax-border-strong);
  }

  .kpi-card:hover .kpi-card__icon {
    transform: scale(1.04);
  }
}

.kpi-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  font-size: 20px;
  transition: transform var(--lotax-transition);
}

.kpi-card__body {
  margin-top: 14px;
  min-width: 0;
  flex: 1;
}

.kpi-card__title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  color: var(--lotax-text-secondary);
}

.kpi-card__value {
  margin: 0;
  font-size: clamp(1.75rem, 1.45rem + 1vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.1;
  color: var(--lotax-text);
  word-break: break-word;
}

.kpi-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

.kpi-card__hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.35;
  color: var(--lotax-text-secondary);
  min-width: 0;
}

.kpi-card__trend {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  font-size: 14px;
  pointer-events: none;
}

.kpi-tone-blue .kpi-card__icon,
.kpi-tone-blue .kpi-card__trend {
  background: var(--lotax-info-soft);
  color: var(--lotax-info);
}

.kpi-tone-green .kpi-card__icon,
.kpi-tone-green .kpi-card__trend {
  background: var(--lotax-success-soft);
  color: var(--lotax-success);
}

.kpi-tone-orange .kpi-card__icon,
.kpi-tone-orange .kpi-card__trend {
  background: var(--lotax-primary-soft);
  color: var(--lotax-primary);
}

.kpi-tone-amber .kpi-card__icon,
.kpi-tone-amber .kpi-card__trend {
  background: var(--lotax-warning-soft);
  color: var(--lotax-warning);
}
</style>
