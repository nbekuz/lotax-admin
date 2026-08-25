<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import {
  CarOutlined,
  DownloadOutlined,
  GiftOutlined,
  ReloadOutlined,
  StarOutlined,
  TrophyOutlined,
  WalletOutlined,
} from '@ant-design/icons-vue'
import { reportsApi } from '@/api/reports'
import KpiCard from '@/components/KpiCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import {
  filenameFromContentDisposition,
  messageFromBlobError,
  triggerBlobDownload,
} from '@/utils/download'
import {
  driverStatusLabel,
  extractErrorMessage,
  isForbiddenError,
  reportActivityKindLabel,
} from '@/utils/labels'
import type {
  DriverStatus,
  OrderStatus,
  ReportSummary,
} from '@/types/api'

const auth = useAuthStore()
const org = useOrgStore()
const router = useRouter()

const loading = ref(false)
const exporting = ref<'excel' | 'csv' | null>(null)
const summary = ref<ReportSummary | null>(null)
const activeTab = ref('drivers')
const parkId = ref<string | undefined>(undefined)
const dateRange = ref<[Dayjs, Dayjs]>([
  dayjs().startOf('month'),
  dayjs(),
])

const parkOptions = computed(() =>
  org.parks.map((p) => ({ value: p.id, label: p.name })),
)

const query = computed(() => ({
  start_date: dateRange.value[0].format('YYYY-MM-DD'),
  end_date: dateRange.value[1].format('YYYY-MM-DD'),
  park_id: parkId.value || null,
}))

const orderStatusLabel: Record<string, string> = {
  pending: 'На модерации',
  approved: 'Одобрена',
  rejected: 'Отклонена',
  cancelled: 'Отменена',
  fulfilled: 'Выполнена',
}

function formatMoney(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return String(value ?? '—')
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatInt(value: number | string | null | undefined) {
  const n = typeof value === 'string' ? Number(value) : value
  if (n == null || Number.isNaN(n)) return '0'
  return new Intl.NumberFormat('ru-RU').format(n)
}

function statusLabel(status?: string | null) {
  if (!status) return '—'
  return driverStatusLabel[status as DriverStatus] ?? status
}

function kindLabel(kind: string) {
  return reportActivityKindLabel[kind as 'task' | 'competition'] ?? kind
}

function validateRange(): boolean {
  const [start, end] = dateRange.value
  if (!start || !end) {
    message.warning('Укажите период')
    return false
  }
  if (end.isBefore(start, 'day')) {
    message.warning('Дата окончания не может быть раньше даты начала')
    return false
  }
  return true
}

async function load() {
  if (!validateRange()) return
  loading.value = true
  try {
    const { data } = await reportsApi.summary(query.value)
    summary.value = data
  } catch (e) {
    if (isForbiddenError(e)) {
      message.error('Нет доступа к отчёту')
      router.replace(auth.homePath)
      return
    }
    message.error(extractErrorMessage(e, 'Не удалось загрузить отчёт'))
  } finally {
    loading.value = false
  }
}

async function exportFile(kind: 'excel' | 'csv') {
  if (!validateRange()) return
  exporting.value = kind
  try {
    const response =
      kind === 'excel'
        ? await reportsApi.exportExcel(query.value)
        : await reportsApi.exportCsv(query.value)
    const fallback =
      kind === 'excel'
        ? `report_${query.value.start_date}_${query.value.end_date}.xlsx`
        : `report_${query.value.start_date}_${query.value.end_date}.csv`
    const filename = filenameFromContentDisposition(
      response.headers['content-disposition'] as string | undefined,
      fallback,
    )
    const mime =
      kind === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv;charset=utf-8'
    const blob =
      response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: mime })
    triggerBlobDownload(blob, filename)
  } catch (e) {
    if (isForbiddenError(e)) {
      message.error('Нет доступа к выгрузке')
      return
    }
    message.error(await messageFromBlobError(e, 'Не удалось скачать файл'))
  } finally {
    exporting.value = null
  }
}

const driverColumns = [
  { title: 'Водитель', dataIndex: 'display_name', key: 'display_name', ellipsis: true },
  { title: 'Статус', key: 'status', width: 140 },
  { title: 'Поездки', dataIndex: 'rides', key: 'rides', width: 110, align: 'right' as const },
  { title: 'Сист. баллы', dataIndex: 'system_points', key: 'system_points', width: 120, align: 'right' as const },
  { title: 'Парк. баллы', dataIndex: 'park_points', key: 'park_points', width: 120, align: 'right' as const },
]

const orderColumns = [
  { title: 'Водитель', dataIndex: 'driver_display_name', key: 'driver_display_name', ellipsis: true },
  { title: 'Статус', key: 'status', width: 150 },
  { title: 'Тип баллов', key: 'points_type', width: 130 },
  { title: 'Списано', dataIndex: 'points_spent', key: 'points_spent', width: 110, align: 'right' as const },
  { title: 'Создана', key: 'created_at', width: 160 },
]

const activityColumns = [
  { title: 'Название', dataIndex: 'title', key: 'title', ellipsis: true },
  { title: 'Тип', key: 'kind', width: 140 },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: 140 },
  { title: 'Начало', key: 'start_at', width: 160 },
  { title: 'Окончание', key: 'end_at', width: 160 },
]

onMounted(async () => {
  if (!auth.canViewReports) return
  if (!org.parks.length) {
    try {
      await org.fetchParks(1, 50)
    } catch {
      /* ignore */
    }
  }
  await load()
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="lotax-page-title">Отчёт</h1>
        <p class="lotax-caption mt-1">Сводка по водителям, поездкам и баллам за период</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a-range-picker
          v-model:value="dateRange"
          size="large"
          format="DD.MM.YYYY"
          :allow-clear="false"
        />
        <a-select
          v-model:value="parkId"
          class="!w-48"
          size="large"
          allow-clear
          placeholder="Все парки"
          :options="parkOptions"
        />
        <a-button class="lotax-btn-secondary" :loading="loading" @click="load">
          <template #icon><ReloadOutlined /></template>
          Показать
        </a-button>
        <a-button
          class="lotax-btn-secondary"
          :loading="exporting === 'excel'"
          :disabled="loading"
          @click="exportFile('excel')"
        >
          <template #icon><DownloadOutlined /></template>
          Excel
        </a-button>
        <a-button
          class="lotax-btn-secondary"
          :loading="exporting === 'csv'"
          :disabled="loading"
          @click="exportFile('csv')"
        >
          <template #icon><DownloadOutlined /></template>
          CSV
        </a-button>
      </div>
    </div>

    <div v-if="loading && !summary" class="flex justify-center py-20">
      <a-spin size="large" />
    </div>

    <template v-else-if="summary">
      <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Водители"
          :value="formatInt(summary.drivers_active)"
          :hint="`из ${formatInt(summary.drivers_total)} всего`"
          tone="blue"
        >
          <template #icon><CarOutlined /></template>
        </KpiCard>
        <KpiCard
          title="Поездки"
          :value="formatInt(summary.rides_count)"
          hint="за выбранный период"
          tone="orange"
        >
          <template #icon><CarOutlined /></template>
        </KpiCard>
        <KpiCard
          title="Сумма поездок"
          :value="formatMoney(summary.fare_total)"
          hint="за выбранный период"
          tone="green"
        >
          <template #icon><WalletOutlined /></template>
        </KpiCard>
        <KpiCard
          title="Системные баллы"
          :value="formatInt(summary.system_points_issued)"
          hint="начислено"
          tone="amber"
        >
          <template #icon><StarOutlined /></template>
        </KpiCard>
        <KpiCard
          title="Баллы парка"
          :value="formatInt(summary.park_points_issued)"
          hint="начислено"
          tone="blue"
        >
          <template #icon><TrophyOutlined /></template>
        </KpiCard>
        <KpiCard
          title="Заявки на награды"
          :value="formatInt(summary.reward_orders_pending)"
          :hint="`из ${formatInt(summary.reward_orders_total)} всего`"
          tone="orange"
        >
          <template #icon><GiftOutlined /></template>
        </KpiCard>
      </section>

      <section class="lotax-card p-4 md:p-6">
        <a-tabs v-model:activeKey="activeTab">
          <a-tab-pane key="drivers" tab="Водители">
            <a-table
              row-key="driver_id"
              :columns="driverColumns"
              :data-source="summary.drivers"
              :pagination="{ pageSize: 20, showSizeChanger: true }"
              :scroll="{ x: 720 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  {{ statusLabel(record.status) }}
                </template>
              </template>
            </a-table>
          </a-tab-pane>
          <a-tab-pane key="orders" :tab="`Награды (${summary.reward_orders_total})`">
            <a-table
              row-key="order_id"
              :columns="orderColumns"
              :data-source="summary.reward_orders"
              :pagination="{ pageSize: 20, showSizeChanger: true }"
              :scroll="{ x: 720 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  {{ orderStatusLabel[record.status as OrderStatus] || record.status || '—' }}
                </template>
                <template v-else-if="column.key === 'points_type'">
                  {{ record.points_type === 'system' ? 'Системные' : record.points_type === 'park' ? 'Парковые' : record.points_type || '—' }}
                </template>
                <template v-else-if="column.key === 'created_at'">
                  {{ record.created_at ? dayjs(record.created_at).format('DD.MM.YYYY HH:mm') : '—' }}
                </template>
              </template>
            </a-table>
          </a-tab-pane>
          <a-tab-pane
            key="activity"
            :tab="`Задания и соревнования (${summary.tasks_count + summary.competitions_count})`"
          >
            <a-table
              row-key="id"
              :columns="activityColumns"
              :data-source="summary.tasks_and_competitions"
              :pagination="{ pageSize: 20, showSizeChanger: true }"
              :scroll="{ x: 720 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'kind'">
                  {{ kindLabel(record.kind) }}
                </template>
                <template v-else-if="column.key === 'start_at'">
                  {{ record.start_at ? dayjs(record.start_at).format('DD.MM.YYYY HH:mm') : '—' }}
                </template>
                <template v-else-if="column.key === 'end_at'">
                  {{ record.end_at ? dayjs(record.end_at).format('DD.MM.YYYY HH:mm') : '—' }}
                </template>
              </template>
            </a-table>
          </a-tab-pane>
        </a-tabs>
      </section>
    </template>
  </div>
</template>
