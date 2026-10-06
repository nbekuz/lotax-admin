<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  AndroidOutlined,
  AppleOutlined,
  MobileOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import { superAdminApi } from '@/api/superAdmin'
import KpiCard from '@/components/KpiCard.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { extractErrorMessage } from '@/utils/labels'
import type { AppUsageOrgItem, AppUsageResponse } from '@/types/api'

const loading = ref(false)
const data = ref<AppUsageResponse | null>(null)
const { isMobile } = useBreakpoint()

const columns = [
  { title: 'Организация', dataIndex: 'organization_name', key: 'name', ellipsis: true },
  { title: 'В системе', key: 'system', width: 120, align: 'right' as const },
  { title: 'В приложении', key: 'app', width: 280 },
  { title: 'За 7 дней', key: 'd7', width: 130, align: 'right' as const },
  { title: 'За 30 дней', key: 'd30', width: 140, align: 'right' as const },
]

const organizations = computed(() =>
  [...(data.value?.organizations ?? [])].sort(
    (a, b) =>
      b.drivers_in_system - a.drivers_in_system ||
      a.organization_name.localeCompare(b.organization_name, 'ru'),
  ),
)

const appShareLabel = computed(() =>
  formatShare(data.value?.drivers_with_app, data.value?.drivers_in_system),
)

function formatCount(value: number | null | undefined) {
  return new Intl.NumberFormat('ru-RU').format(value ?? 0)
}

function sharePercent(part: number, total: number) {
  if (total <= 0 || part <= 0) return 0
  return Math.min(100, (part / total) * 100)
}

function formatShare(part?: number, total?: number) {
  const pct = sharePercent(part ?? 0, total ?? 0)
  const digits = pct > 0 && pct < 10 ? 1 : 0
  return `${new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(pct)}%`
}

function barWidth(part: number, total: number) {
  const pct = sharePercent(part, total)
  if (part > 0 && pct < 2) return 2
  return pct
}

async function load() {
  loading.value = true
  try {
    const { data: body } = await superAdminApi.appUsage()
    data.value = body
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось загрузить статистику'))
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <PageHeader title="Водители в приложении">
      <template #description>
        <p class="lotax-page-subtitle">
          Парк в системе — ещё не установка. «В приложении» — водитель хотя бы раз вошёл и
          сохранил устройство. 7 и 30 дней — приложение открывали за этот срок.
        </p>
      </template>
      <template #actions>
        <a-button class="lotax-btn-secondary" :loading="loading" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title="В системе"
        :value="formatCount(data?.drivers_in_system)"
        hint="Водители парков, без архива"
      >
        <template #icon><TeamOutlined /></template>
      </KpiCard>
      <KpiCard
        title="В приложении"
        :value="formatCount(data?.drivers_with_app)"
        :hint="`${appShareLabel} от базы`"
        tone="green"
      >
        <template #icon><MobileOutlined /></template>
      </KpiCard>
      <KpiCard
        title="За 7 дней"
        :value="formatCount(data?.drivers_seen_7d)"
        hint="Открывали приложение"
        tone="orange"
      >
        <template #icon><MobileOutlined /></template>
      </KpiCard>
      <KpiCard
        title="За 30 дней"
        :value="formatCount(data?.drivers_seen_30d)"
        hint="Открывали приложение"
        tone="amber"
      >
        <template #icon><MobileOutlined /></template>
      </KpiCard>
    </div>

    <section class="lotax-card overflow-hidden">
      <div class="flex flex-col gap-3 border-b border-line px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
        <div class="min-w-0">
          <h2 class="m-0 text-[16px] font-semibold text-ink">По организациям</h2>
          <p class="lotax-caption mb-0 mt-1">
            Полоска — доля водителей, которые хотя бы раз открыли приложение.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="device-pill">
            <MobileOutlined />
            Устройств {{ formatCount(data?.active_devices) }}
          </span>
          <span class="device-pill">
            <AppleOutlined />
            iOS {{ formatCount(data?.devices_ios) }}
          </span>
          <span class="device-pill">
            <AndroidOutlined />
            Android {{ formatCount(data?.devices_android) }}
          </span>
        </div>
      </div>

      <div v-if="isMobile" class="p-4">
        <a-spin :spinning="loading">
          <p v-if="!loading && organizations.length === 0" class="py-10 text-center text-ink-muted">
            Организаций нет
          </p>
          <div v-else class="flex flex-col gap-3">
            <article
              v-for="org in organizations"
              :key="org.organization_id"
              class="rounded-xl bg-surface p-4 ring-1 ring-inset ring-line"
            >
              <h3 class="m-0 truncate text-[16px] font-semibold text-ink">
                {{ org.organization_name }}
              </h3>
              <p class="mb-3 mt-1 text-[13px] text-ink-muted">
                В системе {{ formatCount(org.drivers_in_system) }}
              </p>
              <div class="usage-share">
                <div class="usage-share__top">
                  <span class="usage-share__num">{{ formatCount(org.drivers_with_app) }}</span>
                  <span class="usage-share__pct">{{ formatShare(org.drivers_with_app, org.drivers_in_system) }}</span>
                </div>
                <div class="usage-share__track">
                  <div
                    class="usage-share__fill"
                    :style="{ width: `${barWidth(org.drivers_with_app, org.drivers_in_system)}%` }"
                  />
                </div>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2">
                <div class="period-chip">
                  <span class="period-chip__label">7 дней</span>
                  <span class="period-chip__value">{{ formatCount(org.drivers_seen_7d) }}</span>
                </div>
                <div class="period-chip">
                  <span class="period-chip__label">30 дней</span>
                  <span class="period-chip__value">{{ formatCount(org.drivers_seen_30d) }}</span>
                </div>
              </div>
            </article>
          </div>
        </a-spin>
      </div>

      <a-table
        v-else
        row-key="organization_id"
        :columns="columns"
        :data-source="organizations"
        :loading="loading"
        :pagination="false"
        :locale="{ emptyText: 'Организаций нет' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span class="font-medium text-ink">{{ (record as AppUsageOrgItem).organization_name }}</span>
          </template>
          <template v-else-if="column.key === 'system'">
            <span class="tabular-nums text-ink-muted">
              {{ formatCount((record as AppUsageOrgItem).drivers_in_system) }}
            </span>
          </template>
          <template v-else-if="column.key === 'app'">
            <div class="usage-share">
              <div class="usage-share__top">
                <span class="usage-share__num">
                  {{ formatCount((record as AppUsageOrgItem).drivers_with_app) }}
                </span>
                <span class="usage-share__pct">
                  {{
                    formatShare(
                      (record as AppUsageOrgItem).drivers_with_app,
                      (record as AppUsageOrgItem).drivers_in_system,
                    )
                  }}
                </span>
              </div>
              <div class="usage-share__track">
                <div
                  class="usage-share__fill"
                  :style="{
                    width: `${barWidth(
                      (record as AppUsageOrgItem).drivers_with_app,
                      (record as AppUsageOrgItem).drivers_in_system,
                    )}%`,
                  }"
                />
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'd7'">
            <div class="period-value">
              <span class="period-value__num">
                {{ formatCount((record as AppUsageOrgItem).drivers_seen_7d) }}
              </span>
              <span v-if="(record as AppUsageOrgItem).drivers_with_app > 0" class="period-value__of">
                из {{ formatCount((record as AppUsageOrgItem).drivers_with_app) }}
              </span>
            </div>
          </template>
          <template v-else-if="column.key === 'd30'">
            <div class="period-value">
              <span class="period-value__num">
                {{ formatCount((record as AppUsageOrgItem).drivers_seen_30d) }}
              </span>
              <span v-if="(record as AppUsageOrgItem).drivers_with_app > 0" class="period-value__of">
                из {{ formatCount((record as AppUsageOrgItem).drivers_with_app) }}
              </span>
            </div>
          </template>
        </template>
      </a-table>
    </section>
  </div>
</template>

<style scoped>
.device-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  background: var(--lotax-bg);
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--lotax-text);
  box-shadow: inset 0 0 0 1px var(--lotax-border);
}

.period-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-radius: 10px;
  background: var(--lotax-card);
  padding: 8px 10px;
  box-shadow: inset 0 0 0 1px var(--lotax-border);
}

.period-chip__label {
  font-size: 12px;
  color: var(--lotax-text-tertiary);
}

.period-chip__value {
  font-size: 16px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  color: var(--lotax-text);
}

.usage-share {
  display: flex;
  min-width: 168px;
  flex-direction: column;
  gap: 6px;
}

.usage-share__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.usage-share__num {
  font-size: 15px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  color: var(--lotax-text);
}

.usage-share__pct {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--lotax-success);
}

.usage-share__track {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--lotax-bg);
  box-shadow: inset 0 0 0 1px var(--lotax-border);
}

.usage-share__fill {
  height: 100%;
  border-radius: inherit;
  background: var(--lotax-success);
}

.period-value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.2;
}

.period-value__num {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  color: var(--lotax-text);
}

.period-value__of {
  margin-top: 2px;
  font-size: 12px;
  color: var(--lotax-text-tertiary);
}
</style>
