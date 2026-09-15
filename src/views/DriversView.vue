<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import dayjs from 'dayjs'
import { CloudSyncOutlined, PlusOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useDriversStore } from '@/stores/drivers'
import { useOrgStore } from '@/stores/org'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { extractErrorMessage, formatPhone, driverTierLabel, isForbiddenError, isConflictError, driverStatusLabel } from '@/utils/labels'
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
const selectedRowKeys = ref<string[]>([])
const bulkBusy = ref(false)
const launchBusy = ref(false)
const createForm = reactive({
  phone: '',
  first_name: '',
  last_name: '',
  middle_name: '',
  yandex_driver_id: '',
})

/** API may still send legacy *_masked keys; they now hold full values. Never show `И***`. */
function unmasked(value?: string | null): string | null {
  if (!value) return null
  if (/[*•]/.test(value)) return null
  return value
}

function driverFirstName(d: DriverListItem) {
  return (
    unmasked(d.first_name) ||
    unmasked(d.first_name_masked) ||
    unmasked(d.display_name)?.split(/\s+/)[0] ||
    '—'
  )
}

function driverLastName(d: DriverListItem) {
  return unmasked(d.last_name) || unmasked(d.last_name_masked) || '—'
}

function driverPhone(d: DriverListItem) {
  return unmasked(d.phone) || unmasked(d.phone_masked)
}

function driverFullName(d: DriverListItem) {
  return (
    unmasked(d.display_name) ||
    [driverFirstName(d), driverLastName(d)].filter((p) => p && p !== '—').join(' ') ||
    '—'
  )
}

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
      key: 'first_name',
      ...(pin ? { fixed: 'left' as const, width: 110 } : { ellipsis: true }),
    },
    {
      title: 'Фамилия',
      key: 'last_name',
      ...(pin ? { fixed: 'left' as const, width: 110 } : { ellipsis: true }),
    },
    {
      title: 'Телефон',
      key: 'phone',
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
  { value: 'all', label: 'Все' },
  { value: 'pending', label: driverStatusLabel.pending },
  { value: 'active', label: driverStatusLabel.active },
  { value: 'blocked', label: driverStatusLabel.blocked },
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

const launchResetDone = computed(
  () => Boolean(org.selectedPark?.launch_reset_done),
)

function bulkTarget() {
  if (selectedRowKeys.value.length) {
    return { driver_ids: selectedRowKeys.value, park_id: null as string | null }
  }
  return {
    driver_ids: null as string[] | null,
    park_id: org.selectedParkId,
  }
}

function confirmResetPoints() {
  let status: DriverStatus | null =
    statusFilter.value === 'all' ? null : statusFilter.value
  if (selectedRowKeys.value.length) {
    const rows = drivers.items.filter((d) => selectedRowKeys.value.includes(d.id))
    const statuses = new Set(rows.map((d) => d.status))
    if (statuses.size !== 1) {
      message.warning('Для сброса баллов выберите водителей с одним статусом')
      return
    }
    status = rows[0]?.status ?? null
  }
  if (!status) {
    message.warning('Выберите водителей или отфильтруйте список по статусу')
    return
  }
  confirmBulk(status, 'Сбросить баллы', { reset: true })
}

function confirmBulk(
  status: DriverStatus,
  title: string,
  extra?: { reset?: boolean },
) {
  const target = bulkTarget()
  if (!target.driver_ids?.length && !target.park_id) {
    message.warning('Выберите водителей или парк')
    return
  }
  const reset = Boolean(extra?.reset)
  const scope = target.driver_ids?.length
    ? `${target.driver_ids.length} выбранных`
    : 'весь текущий парк'
  Modal.confirm({
    title,
    content: reset
      ? `Сбросить системные и парковые баллы: ${scope}.`
      : `Сменить статус на «${driverStatusLabel[status]}»: ${scope}.`,
    okText: 'Подтвердить',
    cancelText: 'Отмена',
    centered: true,
    async onOk() {
      bulkBusy.value = true
      try {
        const result = await drivers.bulkStatus({
          status,
          park_id: target.park_id,
          driver_ids: target.driver_ids,
          reset_system_points: reset,
          reset_park_points: reset,
          confirm: true,
        })
        message.success(result.message || 'Готово')
        selectedRowKeys.value = []
        await load()
      } catch (e) {
        message.error(extractErrorMessage(e))
        throw e
      } finally {
        bulkBusy.value = false
      }
    },
  })
}

function confirmLaunchReset() {
  if (!org.selectedParkId) {
    message.warning('Выберите парк в шапке')
    return
  }
  if (launchResetDone.value) {
    message.warning('Старт парка уже выполнен')
    return
  }
  Modal.confirm({
    title: 'Старт парка (один раз)',
    content:
      'Водители текущего парка перейдут в «Ожидание», баллы обнулятся. Повторно выполнить нельзя.',
    okText: 'Запустить',
    cancelText: 'Отмена',
    centered: true,
    async onOk() {
      launchBusy.value = true
      try {
        const result = await drivers.launchReset({
          park_id: org.selectedParkId!,
          reset_system_points: true,
          reset_park_points: true,
          confirm: true,
        })
        message.success(result.message || 'Старт парка выполнен')
        await org.fetchParks()
        await load()
      } catch (e) {
        if (isConflictError(e)) {
          message.warning('Старт парка уже был выполнен')
          await org.fetchParks()
          return
        }
        message.error(extractErrorMessage(e))
        throw e
      } finally {
        launchBusy.value = false
      }
    },
  })
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

function onSelectChange(keys: (string | number)[]) {
  selectedRowKeys.value = keys.map(String)
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
  <div class="drivers-page flex flex-col gap-4 md:gap-5">
    <div
      class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="min-w-0">
        <h1 class="lotax-page-title">Водители</h1>
        <p class="lotax-page-subtitle !mt-1.5 !max-w-xl">
          После синхронизации — статус «Ожидание»; первый вход по паролю активирует.
          Массовые действия — только у директора.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2 shrink-0">
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

    <div class="drivers-toolbar lotax-card !p-3">
      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <a-input
          v-model:value="searchQ"
          allow-clear
          class="sm:!w-64 sm:!flex-none"
          size="large"
          placeholder="Поиск: имя, телефон, ID…"
        />
        <a-select
          v-model:value="statusFilter"
          class="sm:!w-40"
          size="large"
          :options="statusOptions"
        />
        <a-select
          v-model:value="tierFilter"
          class="sm:!w-40"
          size="large"
          :options="tierOptions"
        />
        <a-select
          v-if="org.parks.length > 1"
          v-model:value="parkFilter"
          class="sm:!w-48"
          size="large"
          :options="parkOptions"
        />
      </div>
    </div>

    <div
      v-if="auth.canEditStatus"
      class="drivers-bulk flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white px-3 py-2.5"
    >
      <span class="mr-1 text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
        Массово
      </span>
      <a-button
        class="lotax-btn-secondary !h-9"
        :loading="bulkBusy"
        @click="confirmBulk('pending', 'В ожидание')"
      >
        В ожидание
      </a-button>
      <a-button
        class="lotax-btn-secondary !h-9"
        :loading="bulkBusy"
        @click="confirmBulk('active', 'Активировать')"
      >
        Активировать
      </a-button>
      <a-button
        class="lotax-btn-secondary !h-9"
        :loading="bulkBusy"
        @click="confirmBulk('blocked', 'Заблокировать')"
      >
        Заблокировать
      </a-button>
      <a-button
        class="lotax-btn-secondary !h-9"
        :loading="bulkBusy"
        @click="confirmResetPoints"
      >
        Сбросить баллы
      </a-button>
      <a-button
        type="primary"
        class="lotax-btn-primary !h-9"
        :loading="launchBusy"
        :disabled="launchResetDone || !org.selectedParkId"
        @click="confirmLaunchReset"
      >
        Старт парка
      </a-button>
      <span v-if="selectedRowKeys.length" class="ml-auto text-[13px] text-ink-muted">
        Выбрано: {{ selectedRowKeys.length }}
      </span>
      <span v-else-if="launchResetDone" class="ml-auto text-[13px] text-ink-muted">
        Старт парка уже выполнен
      </span>
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
                {{ driverFullName(driver) }}
              </h3>
              <p class="mt-0.5 font-mono text-[12px] text-ink-muted">
                {{ formatPhone(driverPhone(driver)) }}
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
          {{
            statusFilter === 'pending'
              ? 'Нет водителей в статусе «Ожидание». Они появляются после синхронизации с Яндекс.'
              : 'Сначала нажмите «Синхронизировать водителей» или измените фильтр'
          }}
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
        :row-selection="auth.canEditStatus ? {
          selectedRowKeys,
          onChange: onSelectChange,
        } : undefined"
        :locale="{
          emptyText:
            statusFilter === 'pending'
              ? 'Нет водителей в статусе «Ожидание»'
              : 'Водители не найдены',
        }"
        :custom-row="(record: DriverListItem) => ({
          onClick: () => openDriver(record),
          class: 'cursor-pointer transition-colors duration-fast',
        })"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'first_name'">
            <a
              class="font-medium text-ink transition-colors duration-fast md:hover:text-brand"
              @click.prevent="openDriver(record as DriverListItem)"
            >
              {{ driverFirstName(record as DriverListItem) }}
            </a>
          </template>
          <template v-else-if="column.key === 'last_name'">
            {{ driverLastName(record as DriverListItem) }}
          </template>
          <template v-else-if="column.key === 'phone'">
            <span class="font-mono text-[13px] text-ink-muted">
              {{ formatPhone(driverPhone(record as DriverListItem)) }}
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
.drivers-toolbar :deep(.ant-input-affix-wrapper),
.drivers-toolbar :deep(.ant-select-selector) {
  border-radius: 12px !important;
}

.drivers-bulk :deep(.ant-btn) {
  border-radius: 10px !important;
}

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
