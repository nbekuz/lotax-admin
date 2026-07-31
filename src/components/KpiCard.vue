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
  min-height: 150px;
  height: 100%;
  padding: 24px;
  border-radius: 24px;
  background: #fff;
  border: 1px solid #ececec;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

@media (min-width: 1440px) {
  .kpi-card {
    min-height: 160px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .kpi-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.08);
  }

  .kpi-card:hover .kpi-card__icon {
    transform: scale(1.06);
  }

  .kpi-card:hover .kpi-card__trend {
    transform: scale(1.05);
  }
}

.kpi-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  font-size: 22px;
  transition: transform 180ms ease;
}

.kpi-card__body {
  margin-top: 16px;
  min-width: 0;
  flex: 1;
}

.kpi-card__title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.3;
  color: #6b7280;
}

.kpi-card__value {
  margin: 0;
  font-size: clamp(2rem, 1.6rem + 1.2vw, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.05;
  color: #111111;
  word-break: break-word;
}

.kpi-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}

.kpi-card__hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.3;
  color: #6b7280;
  min-width: 0;
}

.kpi-card__trend {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  font-size: 15px;
  pointer-events: none;
  transition: transform 180ms ease;
}

/* Blue */
.kpi-tone-blue .kpi-card__icon {
  background: #eef4ff;
  color: #3b82f6;
}

.kpi-tone-blue .kpi-card__trend {
  background: #eef4ff;
  color: #3b82f6;
}

/* Green */
.kpi-tone-green .kpi-card__icon {
  background: #ecfdf3;
  color: #22c55e;
}

.kpi-tone-green .kpi-card__trend {
  background: #ecfdf3;
  color: #22c55e;
}

/* Orange */
.kpi-tone-orange .kpi-card__icon {
  background: #fff4e8;
  color: #f7931a;
}

.kpi-tone-orange .kpi-card__trend {
  background: #fff4e8;
  color: #f7931a;
}

/* Amber */
.kpi-tone-amber .kpi-card__icon {
  background: #fff9e5;
  color: #f59e0b;
}

.kpi-tone-amber .kpi-card__trend {
  background: #fff9e5;
  color: #f59e0b;
}
</style>
