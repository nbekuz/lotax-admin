<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import dayjs from 'dayjs'
import { CloudSyncOutlined, PlusOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useDriversStore } from '@/stores/drivers'
import { useOrgStore } from '@/stores/org'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { extractErrorMessage, formatPhone, driverTierLabel, isForbiddenError } from '@/utils/labels'
import type { DriverListItem, DriverStatus, DriverTier } from '@/types/api'
import StatusBadge from '@/components/StatusBadge.vue'
import TierBadge from '@/components/TierBadge.vue'

const auth = useAuthStore()
const drivers = useDriversStore()
const org = useOrgStore()
const router = useRouter()
const { isMobile, isLgUp, width } = useBreakpoint()

const searchQ = ref('')
const statusFilter = ref<DriverStatus | 'all'>('all')
const tierFilter = ref<DriverTier | 'all'>('all')
const parkFilter = ref<string | 'all'>('all')
const createOpen = ref(false)
const creating = ref(false)
const createForm = reactive({
  phone: '',
  first_name: '',
  last_name: '',
  middle_name: '',
  yandex_driver_id: '',
})

/** Fixed columns + x-scroll only when viewport is tight (tablet). */
const needsHorizontalScroll = computed(() => !isLgUp.value)

/** Sticky header offset under AdminLayout topbar (antd sticky). */
const stickyConfig = computed(() => ({
  offsetHeader: width.value >= 1280 ? 72 : width.value >= 768 ? 64 : 56,
}))

const columns = computed<TableColumnsType<DriverListItem>>(() => {
  const pin = needsHorizontalScroll.value
  return [
    {
      title: 'Имя',
      dataIndex: 'display_name',
      key: 'display_name',
      ...(pin ? { fixed: 'left' as const, width: 168 } : { ellipsis: true }),
    },
    {
      title: 'Телефон',
      dataIndex: 'phone_masked',
      key: 'phone_masked',
      width: pin ? 148 : 170,
      ...(pin ? { fixed: 'left' as const } : {}),
    },
    {
      title: 'Сист. баллы',
      dataIndex: 'balance_system_points',
      key: 'balance_system_points',
      width: 110,
      align: 'right' as const,
    },
    {
      title: 'Парк',
      dataIndex: 'balance_park_points',
      key: 'balance_park_points',
      width: 90,
      align: 'right' as const,
    },
    {
      title: 'Уровень',
      dataIndex: 'tier',
      key: 'tier',
      width: 120,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 130,
    },
    {
      title: 'Создан',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
    },
  ]
})

const tableScroll = computed(() => {
  if (needsHorizontalScroll.value) {
    return { x: 1000 }
  }
  return undefined
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: false,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (total: number) => `Всего: ${total}`,
})

const statusOptions = [
  { value: 'all', label: 'Все статусы' },
  { value: 'active', label: 'Активен' },
  { value: 'blocked', label: 'Заблокирован' },
  { value: 'pending', label: 'Ожидание' },
]

const tierOptions = [
  { value: 'all', label: 'Все уровни' },
  { value: 'bronze', label: driverTierLabel.bronze },
  { value: 'silver', label: driverTierLabel.silver },
  { value: 'gold', label: driverTierLabel.gold },
  { value: 'platinum', label: driverTierLabel.platinum },
]

const parkOptions = computed(() => [
  { value: 'all', label: 'Все парки' },
  ...org.parks.map((p) => ({ value: p.id, label: p.name })),
])

async function load() {
  try {
    await drivers.fetchList({
      page: pagination.current,
      page_size: pagination.pageSize,
      q: searchQ.value.trim() || null,
      status: statusFilter.value === 'all' ? null : statusFilter.value,
      tier: tierFilter.value === 'all' ? null : tierFilter.value,
      park_id: parkFilter.value === 'all' ? null : parkFilter.value,
    })
    pagination.total = drivers.total
  } catch (e) {
    if (isForbiddenError(e)) {
      message.error('Нет доступа к данным водителей')
      router.replace(auth.homePath)
      return
    }
    message.error(extractErrorMessage(e))
  }
}

function resetPageAndLoad() {
  pagination.current = 1
  void load()
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

async function submitCreate() {
  if (!org.selectedParkId) {
    message.warning('Выберите парк в шапке')
    return
  }
  if (!createForm.phone.trim() || !createForm.first_name.trim() || !createForm.last_name.trim()) {
    message.warning('Заполните телефон, имя и фамилию')
    return
  }
  creating.value = true
  try {
    const driver = await drivers.createManual({
      park_id: org.selectedParkId,
      phone: createForm.phone.trim(),
      first_name: createForm.first_name.trim(),
      last_name: createForm.last_name.trim(),
      middle_name: createForm.middle_name.trim() || null,
      yandex_driver_id: createForm.yandex_driver_id.trim() || null,
    })
    message.success('Водитель добавлен')
    createOpen.value = false
    createForm.phone = ''
    createForm.first_name = ''
    createForm.last_name = ''
    createForm.middle_name = ''
    createForm.yandex_driver_id = ''
    router.push({ name: 'driver-detail', params: { id: driver.id } })
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    creating.value = false
  }
}

watch([statusFilter, tierFilter, parkFilter], resetPageAndLoad)

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQ, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(resetPageAndLoad, 350)
})

watch(
  () => org.selectedParkId,
  (id) => {
    if (id && parkFilter.value === 'all') {
      parkFilter.value = id
    }
  },
)

onMounted(async () => {
  if (auth.isParkAdmin && !org.parks.length) {
    try {
      await org.fetchParks()
    } catch {
      /* ignore */
    }
  }
  if (org.selectedParkId) {
    parkFilter.value = org.selectedParkId
  }
  await load()
})
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
        <a-input
          v-model:value="searchQ"
          allow-clear
          class="md:!w-56"
          size="large"
          placeholder="Поиск: имя, телефон, ID…"
        />
        <a-select
          v-model:value="statusFilter"
          class="md:!w-40"
          size="large"
          :options="statusOptions"
        />
        <a-select
          v-model:value="tierFilter"
          class="md:!w-40"
          size="large"
          :options="tierOptions"
        />
        <a-select
          v-if="org.parks.length > 1"
          v-model:value="parkFilter"
          class="md:!w-48"
          size="large"
          :options="parkOptions"
        />
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button
          v-if="auth.canCreateDriver"
          type="primary"
          class="lotax-btn-primary"
          @click="createOpen = true"
        >
          <template #icon><PlusOutlined /></template>
          Добавить
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
                {{ formatPhone(driver.phone_masked) }}
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
        class="lotax-card flex flex-col items-center justify-center gap-3 px-4 py-16 text-center"
      >
        <p class="text-[15px] font-medium text-ink">Водители не найдены</p>
        <p class="lotax-caption max-w-sm">
          Сначала нажмите «Синхронизировать водителей» или измените фильтр
        </p>
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
        :sticky="stickyConfig"
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
          </template>
          <template v-else-if="column.key === 'phone_masked'">
            <span class="font-mono text-[13px] text-ink-muted">
              {{ formatPhone((record as DriverListItem).phone_masked) }}
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
            <span class="whitespace-nowrap text-[13px] tabular-nums text-ink-muted">
              {{ dayjs((record as DriverListItem).created_at).format('DD.MM.YYYY · HH:mm') }}
            </span>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="createOpen"
      title="Добавить водителя"
      ok-text="Создать"
      cancel-text="Отмена"
      :confirm-loading="creating"
      centered
      :width="480"
      @ok="submitCreate"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Телефон" required>
          <a-input v-model:value="createForm.phone" size="large" placeholder="+79001234567" />
        </a-form-item>
        <a-form-item label="Имя" required>
          <a-input v-model:value="createForm.first_name" size="large" />
        </a-form-item>
        <a-form-item label="Фамилия" required>
          <a-input v-model:value="createForm.last_name" size="large" />
        </a-form-item>
        <a-form-item label="Отчество">
          <a-input v-model:value="createForm.middle_name" size="large" />
        </a-form-item>
        <a-form-item label="Yandex driver ID">
          <a-input v-model:value="createForm.yandex_driver_id" size="large" />
        </a-form-item>
        <p class="lotax-caption">
          Парк: {{ org.selectedPark?.name || 'не выбран' }}
        </p>
      </a-form>
    </a-modal>
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

/* sticky uchun overflow:hidden bo‘lmasligi kerak */
.drivers-table-card {
  overflow: visible;
}

.drivers-table-card--fluid :deep(.ant-table table) {
  width: 100% !important;
}

:deep(.ant-table) {
  border: none !important;
  border-radius: 0 !important;
}

:deep(.ant-table-thead > tr > th) {
  background: #fafafa !important;
  padding: 10px 12px !important;
}

:deep(.ant-table-tbody > tr > td) {
  padding: 10px 12px !important;
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

:deep(.ant-table-pagination.ant-pagination) {
  display: flex !important;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin: 0 !important;
  padding: 12px 16px 16px !important;
  border-top: 1px solid var(--lotax-border);
}

:deep(.ant-pagination-options) {
  margin-inline-start: 0 !important;
}
</style>
