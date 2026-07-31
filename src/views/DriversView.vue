<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import dayjs from 'dayjs'
import { CloudSyncOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useDriversStore } from '@/stores/drivers'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { extractErrorMessage } from '@/utils/labels'
import type { DriverListItem, DriverStatus } from '@/types/api'
import StatusBadge from '@/components/StatusBadge.vue'
import TierBadge from '@/components/TierBadge.vue'

const auth = useAuthStore()
const drivers = useDriversStore()
const router = useRouter()
const { isMobile, isLgUp } = useBreakpoint()

const statusFilter = ref<DriverStatus | 'all'>('all')

/** Fixed columns + x-scroll only when viewport is tight (tablet). */
const needsHorizontalScroll = computed(() => !isLgUp.value)

const columns = computed<TableColumnsType<DriverListItem>>(() => {
  const pin = needsHorizontalScroll.value
  return [
    {
      title: 'Имя',
      dataIndex: 'display_name',
      key: 'display_name',
      ...(pin ? { fixed: 'left' as const, width: 168 } : {}),
    },
    {
      title: 'Телефон',
      dataIndex: 'phone_masked',
      key: 'phone_masked',
      ...(pin ? { fixed: 'left' as const, width: 148 } : {}),
    },
    {
      title: 'Сист. баллы',
      dataIndex: 'balance_system_points',
      key: 'balance_system_points',
      width: pin ? 100 : undefined,
      align: 'right' as const,
    },
    {
      title: 'Парк',
      dataIndex: 'balance_park_points',
      key: 'balance_park_points',
      width: pin ? 80 : undefined,
      align: 'right' as const,
    },
    {
      title: 'Уровень',
      dataIndex: 'tier',
      key: 'tier',
      width: pin ? 110 : undefined,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: pin ? 120 : undefined,
    },
    {
      title: 'Создан',
      dataIndex: 'created_at',
      key: 'created_at',
      width: pin ? 140 : undefined,
    },
  ]
})

const tableScroll = computed(() => {
  if (needsHorizontalScroll.value) {
    return { x: 900, y: 'calc(100vh - 320px)' }
  }
  return { y: 'calc(100vh - 320px)' }
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `Всего: ${total}`,
})

const statusOptions = [
  { value: 'all', label: 'Все статусы' },
  { value: 'active', label: 'Активен' },
  { value: 'blocked', label: 'Заблокирован' },
  { value: 'pending', label: 'Ожидание' },
]

async function load() {
  try {
    await drivers.fetchList({
      page: pagination.current,
      page_size: pagination.pageSize,
      status: statusFilter.value === 'all' ? null : statusFilter.value,
    })
    pagination.total = drivers.total
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function onTableChange(pag: { current?: number; pageSize?: number }) {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 20
  load()
}

function openDriver(record: DriverListItem) {
  router.push({ name: 'driver-detail', params: { id: record.id } })
}

function onMobilePageChange(page: number) {
  pagination.current = page
  load()
}

watch(statusFilter, () => {
  pagination.current = 1
  load()
})

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <h1 class="lotax-page-title">Водители</h1>
        <p class="lotax-caption mt-1">
          Список с маскированными персональными данными
        </p>
      </div>

      <div
        class="lotax-filter-stack md:flex md:flex-wrap md:items-center md:gap-2"
      >
        <a-select
          v-model:value="statusFilter"
          class="md:!w-44"
          size="large"
          :options="statusOptions"
        />
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button
          v-if="auth.canSync"
          type="primary"
          class="lotax-btn-primary"
          @click="router.push('/sync')"
        >
          <template #icon><CloudSyncOutlined /></template>
          Синхронизация
        </a-button>
      </div>
    </div>

    <!-- Mobile: card list -->
    <div v-if="isMobile" class="flex flex-col gap-4">
      <div v-if="drivers.loading" class="flex justify-center py-16">
        <a-spin size="large" />
      </div>

      <template v-else-if="drivers.items.length">
        <article
          v-for="driver in drivers.items"
          :key="driver.id"
          class="lotax-card driver-mobile-card p-4 active:scale-[0.99]"
          role="button"
          tabindex="0"
          @click="openDriver(driver)"
          @keydown.enter="openDriver(driver)"
        >
          <div class="mb-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate text-[16px] font-semibold text-ink">
                {{ driver.display_name || '—' }}
              </h3>
              <p class="mt-0.5 font-mono text-[12px] text-ink-muted">
                {{ driver.phone_masked || '—' }}
              </p>
            </div>
            <RightOutlined class="mt-1 shrink-0 text-ink-muted" />
          </div>

          <div class="mb-3 flex flex-wrap gap-2">
            <StatusBadge :status="driver.status" />
            <TierBadge :tier="driver.tier" />
          </div>

          <div class="grid grid-cols-2 gap-3 border-t border-line pt-3">
            <div>
              <p class="text-[12px] text-ink-muted">Сист. баллы</p>
              <p class="text-[15px] font-semibold tabular-nums text-ink">
                {{ driver.balance_system_points }}
              </p>
            </div>
            <div>
              <p class="text-[12px] text-ink-muted">Парк</p>
              <p class="text-[15px] font-semibold tabular-nums text-ink">
                {{ driver.balance_park_points }}
              </p>
            </div>
          </div>

          <a-button
            type="primary"
            class="lotax-btn-primary mt-4"
            block
            @click.stop="openDriver(driver)"
          >
            Открыть
          </a-button>
        </article>

        <div class="flex justify-center py-2">
          <a-pagination
            :current="pagination.current"
            :page-size="pagination.pageSize"
            :total="pagination.total"
            :show-size-changer="false"
            size="small"
            @change="onMobilePageChange"
          />
        </div>
      </template>

      <div
        v-else
        class="lotax-card flex flex-col items-center justify-center gap-2 px-4 py-16 text-center"
      >
        <p class="text-[15px] font-medium text-ink">Водители не найдены</p>
        <p class="lotax-caption">Измените фильтр или обновите список</p>
      </div>
    </div>

    <!-- Tablet / Desktop: table -->
    <div
      v-else
      class="lotax-card drivers-table-card !p-0"
      :class="{ 'drivers-table-card--fluid': !needsHorizontalScroll }"
    >
      <a-table
        row-key="id"
        class="drivers-table"
        :columns="columns"
        :data-source="drivers.items"
        :loading="drivers.loading"
        :pagination="pagination"
        :scroll="tableScroll"
        :locale="{
          emptyText: 'Водители не найдены',
        }"
        :custom-row="(record: DriverListItem) => ({
          onClick: () => openDriver(record),
          class: 'cursor-pointer transition-colors duration-fast',
        })"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'display_name'">
            <a
              class="font-medium text-ink transition-colors duration-fast md:hover:text-brand"
              @click.prevent="openDriver(record as DriverListItem)"
            >
              {{ (record as DriverListItem).display_name || '—' }}
            </a>
            <div class="text-[13px] text-ink-muted">
              {{ (record as DriverListItem).first_name_masked }}
              {{ (record as DriverListItem).last_name_masked }}
            </div>
          </template>
          <template v-else-if="column.key === 'phone_masked'">
            <span class="font-mono text-[13px] text-ink-muted">
              {{ (record as DriverListItem).phone_masked || '—' }}
            </span>
          </template>
          <template v-else-if="column.key === 'balance_system_points'">
            <span class="font-semibold tabular-nums">
              {{ (record as DriverListItem).balance_system_points }}
            </span>
          </template>
          <template v-else-if="column.key === 'balance_park_points'">
            <span class="font-semibold tabular-nums">
              {{ (record as DriverListItem).balance_park_points }}
            </span>
          </template>
          <template v-else-if="column.key === 'tier'">
            <TierBadge :tier="(record as DriverListItem).tier" />
          </template>
          <template v-else-if="column.key === 'status'">
            <StatusBadge :status="(record as DriverListItem).status" />
          </template>
          <template v-else-if="column.key === 'created_at'">
            <span class="text-[13px] text-ink-muted">
              {{ dayjs((record as DriverListItem).created_at).format('DD.MM.YYYY HH:mm') }}
            </span>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<style scoped>
.driver-mobile-card {
  animation: lotax-fade-in 180ms ease;
}

@keyframes lotax-fade-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.drivers-table-card {
  overflow: hidden;
}

/* Desktop: no phantom horizontal scroll — table fills width */
.drivers-table-card--fluid :deep(.ant-table-container),
.drivers-table-card--fluid :deep(.ant-table-content),
.drivers-table-card--fluid :deep(.ant-table-body),
.drivers-table-card--fluid :deep(.ant-table-header) {
  overflow-x: hidden !important;
}

.drivers-table-card--fluid :deep(.ant-table table) {
  width: 100% !important;
  table-layout: fixed !important;
}

.drivers-table-card--fluid :deep(.ant-table-thead > tr > th),
.drivers-table-card--fluid :deep(.ant-table-tbody > tr > td) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.ant-table) {
  border: none !important;
  border-radius: 0 !important;
}

:deep(.ant-table-thead > tr > th) {
  background: #fafafa !important;
  position: sticky;
  top: 0;
  z-index: 3;
  padding: 8px 12px !important;
}

:deep(.ant-table-tbody > tr > td) {
  padding: 8px 12px !important;
}

:deep(.ant-table-cell-fix-left) {
  background: #fff !important;
  z-index: 2;
}

:deep(.ant-table-thead .ant-table-cell-fix-left) {
  background: #fafafa !important;
  z-index: 4;
}

:deep(.ant-table-cell-fix-left-last::after) {
  box-shadow: inset -8px 0 8px -8px rgba(17, 17, 17, 0.08) !important;
}

@media (hover: hover) and (pointer: fine) {
  :deep(.ant-table-tbody > tr:hover > .ant-table-cell-fix-left) {
    background: #fafbfc !important;
  }
}

:deep(.ant-pagination) {
  padding: 12px 16px 16px;
  margin: 0 !important;
}
</style>
