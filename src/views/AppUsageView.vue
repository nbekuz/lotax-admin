<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { MobileOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { superAdminApi } from '@/api/superAdmin'
import KpiCard from '@/components/KpiCard.vue'
import PageHeader from '@/components/PageHeader.vue'
import { extractErrorMessage } from '@/utils/labels'
import type { AppUsageOrgItem, AppUsageResponse } from '@/types/api'

const loading = ref(false)
const data = ref<AppUsageResponse | null>(null)

const columns = [
  { title: 'Организация', dataIndex: 'organization_name', key: 'name', ellipsis: true },
  { title: 'В системе', dataIndex: 'drivers_in_system', key: 'system', width: 130 },
  { title: 'В приложении', dataIndex: 'drivers_with_app', key: 'app', width: 150 },
  { title: 'За 7 дней', dataIndex: 'drivers_seen_7d', key: 'd7', width: 120 },
  { title: 'За 30 дней', dataIndex: 'drivers_seen_30d', key: 'd30', width: 130 },
]

function formatCount(value: number | null | undefined) {
  return new Intl.NumberFormat('ru-RU').format(value ?? 0)
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
        <template #icon><MobileOutlined /></template>
      </KpiCard>
      <KpiCard
        title="В приложении"
        :value="formatCount(data?.drivers_with_app)"
        hint="Вошли хотя бы раз"
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

    <p v-if="data" class="lotax-caption">
      Активных устройств: {{ formatCount(data.active_devices) }}
      · iOS {{ formatCount(data.devices_ios) }}
      · Android {{ formatCount(data.devices_android) }}
      · одно устройство — не один водитель
    </p>

    <div class="lotax-card !p-0">
      <a-table
        row-key="organization_id"
        :columns="columns"
        :data-source="(data?.organizations ?? []) as AppUsageOrgItem[]"
        :loading="loading"
        :pagination="false"
        :locale="{ emptyText: 'Организаций нет' }"
      >
        <template #bodyCell="{ column, text }">
          <template v-if="column.key !== 'name'">
            {{ formatCount(Number(text) || 0) }}
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>
