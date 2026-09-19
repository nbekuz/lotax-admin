<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloudSyncOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  GiftOutlined,
  KeyOutlined,
  LeftOutlined,
  StarOutlined,
  StopOutlined,
  TrophyOutlined,
  WalletOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useDriversStore } from '@/stores/drivers'
import { useOrgStore } from '@/stores/org'
import { driversApi } from '@/api/drivers'
import { extractErrorMessage, formatPhone, isForbiddenError, tierLabel } from '@/utils/labels'
import { filenameFromContentDisposition, triggerBlobDownload, messageFromBlobError } from '@/utils/download'
import type {
  DriverPointsHistoryItem,
  DriverRidesHistoryItem,
  DriverRidesHistorySummary,
  DriverTaskHistoryItem,
  DriverTierHistoryItem,
  DriverStatus,
  DriverTier,
} from '@/types/api'
import StatusBadge from '@/components/StatusBadge.vue'
import TierBadge from '@/components/TierBadge.vue'
import CopyableId from '@/components/CopyableId.vue'
import InfoField from '@/components/InfoField.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const drivers = useDriversStore()
const org = useOrgStore()

const driverId = computed(() => route.params.id as string)
const activeTab = ref('profile')
const balanceOpen = ref(false)
const statusOpen = ref(false)
const tierOpen = ref(false)
const passwordOpen = ref(false)
const passwordSaving = ref(false)
const passwordValue = ref('')
const pdnLoading = ref(false)
const pdnError = ref<string | null>(null)
const adjustSaving = ref(false)
const tierSaving = ref(false)
const syncingRides = ref(false)

// ── Points history ────────────────────────────────────────────────────────────
const pointsFilter = reactive({ points_type: 'all', operation: 'all', period: 'all' })
const pointsPag = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (t: number) => `Всего: ${t}`,
})
const pointsItems = ref<DriverPointsHistoryItem[]>([])
const pointsLoading = ref(false)
const exportingPoints = ref(false)

const pointsColumns = [
  { title: 'Дата', key: 'date', width: 170 },
  { title: 'Тип', key: 'points_type', width: 100 },
  { title: 'Операция', key: 'operation', width: 120 },
  { title: 'Сумма', key: 'amount', width: 90, align: 'right' as const },
  { title: 'Баланс после', key: 'balance_after', width: 120, align: 'right' as const },
  { title: 'Описание', key: 'description', ellipsis: true },
]

// ── Rides history ─────────────────────────────────────────────────────────────
const rhPeriod = ref('all')
const rhPag = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (t: number) => `Всего: ${t}`,
})
const rhItems = ref<DriverRidesHistoryItem[]>([])
const rhSummary = ref<DriverRidesHistorySummary | null>(null)
const rhLoading = ref(false)

const rhColumns = [
  { title: 'Дата', key: 'ride_date', width: 150 },
  { title: 'Откуда', key: 'pickup_address', ellipsis: true },
  { title: 'Куда', key: 'dropoff_address', ellipsis: true },
  { title: 'Сумма', key: 'fare_amount', width: 110, align: 'right' as const },
  { title: 'Сист.', key: 'points_system_earned', width: 80, align: 'right' as const },
  { title: 'Парк', key: 'points_park_earned', width: 80, align: 'right' as const },
]

// ── Tasks history ─────────────────────────────────────────────────────────────
const thStatus = ref('all')
const thPag = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (t: number) => `Всего: ${t}`,
})
const thItems = ref<DriverTaskHistoryItem[]>([])
const thLoading = ref(false)

const thColumns = [
  { title: 'Задание', key: 'title', ellipsis: true },
  { title: 'Прогресс', key: 'progress', width: 160 },
  { title: 'Статус', key: 'status', width: 130 },
  { title: 'Награда', key: 'reward', width: 130, align: 'right' as const },
  { title: 'Дата', key: 'task_date', width: 150 },
]

// ── Tier history ──────────────────────────────────────────────────────────────
const tierHistPag = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (t: number) => `Всего: ${t}`,
})
const tierHistItems = ref<DriverTierHistoryItem[]>([])
const tierHistLoading = ref(false)

const tierHistColumns = [
  { title: 'Дата', key: 'created_at', width: 160 },
  { title: 'Уровень', key: 'tier', width: 130 },
  { title: 'Причина', key: 'reason', ellipsis: true },
  { title: 'Срок до', key: 'expires_at', width: 170 },
]

// ── Filter option lists ───────────────────────────────────────────────────────
const periodOptions = [
  { value: 'all', label: 'Весь период' },
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
]

const taskStatusOptions = [
  { value: 'all', label: 'Все статусы' },
  { value: 'completed', label: 'Выполнено' },
  { value: 'active', label: 'Активно' },
  { value: 'cancelled', label: 'Отменено' },
]

// ── Profile adjust forms ──────────────────────────────────────────────────────
const adjustForm = reactive({ amount: 0, description: '' })
const statusForm = reactive<{ status: DriverStatus }>({ status: 'active' })
const tierForm = reactive({ tier: 'bronze' as DriverTier, reason: '' })
const tierExpiresAt = ref<Dayjs | undefined>(undefined)

const tierOptions = [
  { value: 'bronze', label: tierLabel.bronze },
  { value: 'silver', label: tierLabel.silver },
  { value: 'gold', label: tierLabel.gold },
  { value: 'platinum', label: tierLabel.platinum },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function unmasked(value?: string | null): string | null {
  if (!value) return null
  if (/[*•]/.test(value)) return null
  return value
}

function workStatusLabel(s?: string | null): string | null {
  if (!s) return null
  if (s === 'working') return 'Работает'
  if (s === 'fired') return 'Уволен'
  return s
}

function pointsTypeRu(t: string) {
  if (t === 'system') return 'Система'
  if (t === 'park') return 'Парк'
  return t
}

function operationRu(op: string) {
  if (op === 'earn') return 'Начисление'
  if (op === 'spend') return 'Списание'
  return op
}

function taskStatusRu(s?: string | null) {
  if (!s) return '—'
  const map: Record<string, string> = {
    completed: 'Выполнено',
    active: 'Активно',
    draft: 'Черновик',
    scheduled: 'Запланировано',
    cancelled: 'Отменено',
  }
  return map[s] || s
}

function pointsItemDate(item: DriverPointsHistoryItem) {
  const d = item.created_at || item.date
  return d ? dayjs(d).format('DD.MM.YYYY HH:mm') : '—'
}

function rideItemDate(item: DriverRidesHistoryItem) {
  const d = item.ride_date || item.date
  return d ? dayjs(d).format('DD.MM.YYYY HH:mm') : '—'
}

function taskItemDate(item: DriverTaskHistoryItem) {
  const d = item.completed_at || item.created_at || item.joined_at
  return d ? dayjs(d).format('DD.MM.YYYY') : '—'
}

const displayTitle = computed(() => {
  const d = drivers.current
  return (
    unmasked(drivers.personalData?.display_name) ||
    unmasked(d?.display_name) ||
    [
      unmasked(d?.first_name) || unmasked(d?.first_name_masked),
      unmasked(d?.last_name) || unmasked(d?.last_name_masked),
    ]
      .filter(Boolean)
      .join(' ') ||
    'Водитель'
  )
})

const initials = computed(() => {
  const pdn = drivers.personalData
  if (pdn) {
    const parts = [pdn.first_name, pdn.last_name].filter(Boolean) as string[]
    if (parts.length) {
      return parts
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || '')
        .join('')
    }
  }
  const d = drivers.current
  if (!d) return '?'
  const parts = [
    unmasked(d.first_name) || unmasked(d.first_name_masked),
    unmasked(d.last_name) || unmasked(d.last_name_masked),
  ].filter(Boolean) as string[]
  if (parts.length) {
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('')
  }
  const fromName = (d.display_name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('')
  if (fromName) return fromName
  return 'D'
})

// ── Load functions ────────────────────────────────────────────────────────────
async function load() {
  pdnError.value = null
  activeTab.value = 'profile'
  // Reset all history state on driver change
  pointsItems.value = []
  rhItems.value = []
  rhSummary.value = null
  thItems.value = []
  tierHistItems.value = []
  try {
    await drivers.fetchById(driverId.value)
    if (drivers.current) {
      statusForm.status = drivers.current.status
    }
  } catch (e) {
    if (isForbiddenError(e)) {
      message.error('Нет доступа к данным водителей')
      router.replace(auth.homePath)
      return
    }
    message.error(extractErrorMessage(e))
  }
}

async function revealPdn() {
  pdnError.value = null
  pdnLoading.value = true
  try {
    await drivers.fetchPersonalData(driverId.value)
  } catch (e) {
    pdnError.value = extractErrorMessage(e, 'Не удалось загрузить ПДн')
    message.error(pdnError.value)
  } finally {
    pdnLoading.value = false
  }
}

function confirmRevealPdn() {
  Modal.confirm({
    title: 'Показать персональные данные?',
    content:
      'ФИО и телефон уже открыты в карточке. Аудит-запрос дополнительно записывается в журнал ПДн.',
    okText: 'Показать',
    cancelText: 'Отмена',
    centered: true,
    async onOk() {
      await revealPdn()
    },
  })
}

function hidePdn() {
  drivers.personalData = null
  pdnError.value = null
}

async function loadPoints() {
  pointsLoading.value = true
  try {
    const { data } = await driversApi.pointsHistory(driverId.value, {
      points_type: pointsFilter.points_type !== 'all' ? pointsFilter.points_type : undefined,
      operation: pointsFilter.operation !== 'all' ? pointsFilter.operation : undefined,
      period: pointsFilter.period !== 'all' ? pointsFilter.period : undefined,
      page: pointsPag.current,
      page_size: pointsPag.pageSize,
    })
    pointsItems.value = data.items
    pointsPag.total = data.total
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    pointsLoading.value = false
  }
}

async function loadRidesHistory() {
  rhLoading.value = true
  try {
    const { data } = await driversApi.ridesHistory(driverId.value, {
      period: rhPeriod.value !== 'all' ? rhPeriod.value : undefined,
      page: rhPag.current,
      page_size: rhPag.pageSize,
    })
    rhItems.value = data.items
    rhPag.total = data.total
    rhSummary.value = data.summary ?? null
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    rhLoading.value = false
  }
}

async function loadTasksHistory() {
  thLoading.value = true
  try {
    const { data } = await driversApi.tasksHistory(driverId.value, {
      status: thStatus.value !== 'all' ? thStatus.value : undefined,
      page: thPag.current,
      page_size: thPag.pageSize,
    })
    thItems.value = data.items
    thPag.total = data.total
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    thLoading.value = false
  }
}

async function loadTierHistory() {
  tierHistLoading.value = true
  try {
    const { data } = await driversApi.tierHistory(driverId.value, {
      page: tierHistPag.current,
      page_size: tierHistPag.pageSize,
    })
    tierHistItems.value = data.items
    tierHistPag.total = data.total
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    tierHistLoading.value = false
  }
}

async function exportPointsExcel() {
  exportingPoints.value = true
  try {
    const resp = await driversApi.exportPoints(driverId.value)
    const contentType =
      (resp.headers['content-type'] as string) ||
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    const blob = new Blob([resp.data as BlobPart], { type: contentType })
    const cd = resp.headers['content-disposition'] as string | undefined
    const filename = filenameFromContentDisposition(cd, `points_export_${driverId.value}.xlsx`)
    triggerBlobDownload(blob, filename)
  } catch (e) {
    message.error(await messageFromBlobError(e, 'Ошибка экспорта'))
  } finally {
    exportingPoints.value = false
  }
}

function onTabChange(key: string | number) {
  if (key === 'points' && !pointsItems.value.length && !pointsLoading.value) {
    pointsPag.current = 1
    void loadPoints()
  } else if (key === 'rides' && !rhItems.value.length && !rhLoading.value) {
    rhPag.current = 1
    void loadRidesHistory()
  } else if (key === 'tasks' && !thItems.value.length && !thLoading.value) {
    thPag.current = 1
    void loadTasksHistory()
  } else if (key === 'tier' && !tierHistItems.value.length && !tierHistLoading.value) {
    tierHistPag.current = 1
    void loadTierHistory()
  }
}

async function syncRidesFromDetail() {
  syncingRides.value = true
  try {
    const result = await drivers.syncRides(org.selectedParkId)
    message.success(result.message)
    window.setTimeout(() => {
      void loadRidesHistory()
    }, 4000)
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось запустить синхронизацию'))
  } finally {
    syncingRides.value = false
  }
}

async function saveBalance() {
  if (!adjustForm.description.trim()) {
    message.warning('Укажите причину корректировки')
    return
  }
  if (!adjustForm.amount) {
    message.warning('Укажите сумму (может быть отрицательной)')
    return
  }
  adjustSaving.value = true
  try {
    await drivers.adjustPoints(driverId.value, {
      points_type: 'park',
      amount: adjustForm.amount,
      description: adjustForm.description.trim(),
    })
    message.success('Баллы скорректированы')
    balanceOpen.value = false
    adjustForm.amount = 0
    adjustForm.description = ''
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    adjustSaving.value = false
  }
}

async function saveStatus() {
  try {
    await drivers.updateStatus(driverId.value, { status: statusForm.status })
    message.success('Статус обновлён')
    statusOpen.value = false
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function openTierModal() {
  tierForm.tier = drivers.current?.tier ?? 'bronze'
  tierForm.reason = ''
  tierExpiresAt.value = undefined
  tierOpen.value = true
}

async function saveTier() {
  if (!tierForm.reason.trim()) {
    message.warning('Укажите причину')
    return
  }
  tierSaving.value = true
  try {
    await drivers.adjustTier(driverId.value, {
      tier: tierForm.tier,
      reason: tierForm.reason.trim(),
      expires_at: tierExpiresAt.value ? tierExpiresAt.value.toISOString() : null,
    })
    message.success('Уровень изменён')
    tierOpen.value = false
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    tierSaving.value = false
  }
}

function confirmActivate() {
  Modal.confirm({
    title: 'Активировать водителя?',
    content:
      'После активации водитель сможет войти в приложение. Поездки и баллы учитываются только у активных.',
    okText: 'Активировать',
    cancelText: 'Отмена',
    centered: true,
    async onOk() {
      statusForm.status = 'active'
      await saveStatus()
    },
  })
}

function confirmBlock() {
  Modal.confirm({
    title: 'Заблокировать водителя?',
    content: 'Водитель не сможет войти в приложение.',
    okText: 'Заблокировать',
    cancelText: 'Отмена',
    okButtonProps: { danger: true },
    centered: true,
    async onOk() {
      statusForm.status = 'blocked'
      await saveStatus()
    },
  })
}

function openPasswordModal() {
  passwordValue.value = ''
  passwordOpen.value = true
}

async function savePassword() {
  const password = passwordValue.value.trim()
  if (!/^\d{4}$/.test(password)) {
    message.warning('Пароль — ровно 4 цифры')
    return
  }
  passwordSaving.value = true
  try {
    await driversApi.setPassword(driverId.value, { password })
    message.success('Пароль обновлён')
    passwordOpen.value = false
    passwordValue.value = ''
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось сменить пароль'))
  } finally {
    passwordSaving.value = false
  }
}

// ── Watchers for filter-driven reload ────────────────────────────────────────
watch(
  [() => pointsFilter.points_type, () => pointsFilter.operation, () => pointsFilter.period],
  () => {
    if (activeTab.value === 'points') {
      pointsPag.current = 1
      void loadPoints()
    }
  },
)

watch(rhPeriod, () => {
  if (activeTab.value === 'rides') {
    rhPag.current = 1
    void loadRidesHistory()
  }
})

watch(thStatus, () => {
  if (activeTab.value === 'tasks') {
    thPag.current = 1
    void loadTasksHistory()
  }
})

onMounted(load)
watch(driverId, () => { load() })
</script>

<template>
  <div v-if="drivers.current" class="driver-detail">
    <!-- Header -->
    <header class="driver-detail__header">
      <div class="driver-detail__intro">
        <button
          type="button"
          class="driver-back"
          @click="router.push('/drivers')"
        >
          <LeftOutlined />
          Назад
        </button>

        <p class="driver-detail__eyebrow">Карточка водителя</p>
        <h1 class="driver-detail__title">
          {{ displayTitle }}
        </h1>
      </div>

      <div
        v-if="auth.canAdjustPoints || auth.canEditStatus || auth.canAdjustTier || auth.isDirector"
        class="driver-actions"
      >
        <a-button
          v-if="auth.canAdjustPoints"
          type="primary"
          class="lotax-btn-primary"
          @click="balanceOpen = true"
        >
          <template #icon><WalletOutlined /></template>
          Изменить баланс
        </a-button>
        <a-button
          v-if="auth.canAdjustTier"
          class="lotax-btn-secondary"
          @click="openTierModal"
        >
          <template #icon><TrophyOutlined /></template>
          Изменить уровень
        </a-button>
        <a-button
          v-if="auth.isDirector"
          class="lotax-btn-secondary"
          @click="openPasswordModal"
        >
          <template #icon><KeyOutlined /></template>
          Сменить пароль
        </a-button>
        <a-button
          v-if="auth.canEditStatus && drivers.current.status === 'pending'"
          type="primary"
          class="lotax-btn-primary"
          @click="confirmActivate"
        >
          <template #icon><CheckCircleOutlined /></template>
          Активировать
        </a-button>
        <a-button
          v-if="auth.canEditStatus"
          class="lotax-btn-secondary"
          @click="statusOpen = true"
        >
          <template #icon><EditOutlined /></template>
          Изменить статус
        </a-button>
        <a-button
          v-if="auth.canEditStatus && drivers.current.status !== 'blocked' && drivers.current.status !== 'pending'"
          class="lotax-btn-danger"
          @click="confirmBlock"
        >
          <template #icon><StopOutlined /></template>
          Заблокировать
        </a-button>
      </div>
    </header>

    <div
      v-if="drivers.current.status === 'pending'"
      class="rounded-xl bg-amber-50 px-4 py-3 text-[14px] text-amber-800 ring-1 ring-inset ring-amber-200"
    >
      Водитель в статусе «Ожидание». Первый вход по паролю переводит в «Активен».
      Пока нет первого входа, поездки и баллы не начисляются.
    </div>

    <!-- Summary -->
    <section class="summary-card lotax-card">
      <!-- 1. Identity -->
      <div class="summary-card__identity">
        <div class="summary-card__avatar" aria-hidden="true">{{ initials }}</div>
        <div class="summary-card__meta">
          <h2 class="summary-card__name">
            {{ displayTitle }}
          </h2>
          <div class="summary-card__badges">
            <TierBadge :tier="drivers.current.tier" />
            <StatusBadge :status="drivers.current.status" />
            <span
              v-if="drivers.current.work_status"
              class="yandex-work-badge"
              :class="{ 'yandex-work-badge--fired': drivers.current.work_status === 'fired' }"
            >
              Яндекс: {{ workStatusLabel(drivers.current.work_status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 2. Created -->
      <div class="summary-meta">
        <div class="summary-meta__icon summary-meta__icon--calendar" aria-hidden="true">
          <CalendarOutlined />
        </div>
        <div class="summary-meta__body">
          <p class="summary-meta__label">Создан</p>
          <p class="summary-meta__value summary-meta__value--nowrap">
            {{ dayjs(drivers.current.created_at).format('DD.MM.YYYY') }}
            <span class="summary-meta__dot">·</span>
            {{ dayjs(drivers.current.created_at).format('HH:mm') }}
          </p>
        </div>
      </div>

      <!-- 3. Referral -->
      <div class="summary-meta">
        <div class="summary-meta__icon summary-meta__icon--gift" aria-hidden="true">
          <GiftOutlined />
        </div>
        <div class="summary-meta__body">
          <p class="summary-meta__label">Реферал</p>
          <p class="summary-meta__value summary-meta__value--code">
            {{ drivers.current.referral_code || '—' }}
          </p>
        </div>
      </div>

      <!-- 4. Balance -->
      <div class="summary-balance">
        <div class="summary-balance__item">
          <div class="summary-balance__icon summary-balance__icon--system" aria-hidden="true">
            <StarOutlined />
          </div>
          <div class="summary-balance__body">
            <p class="summary-balance__label">Система</p>
            <p class="summary-balance__value">
              {{ drivers.current.balance_system_points }}
            </p>
          </div>
        </div>
        <div class="summary-balance__divider" aria-hidden="true" />
        <div class="summary-balance__item">
          <div class="summary-balance__icon summary-balance__icon--park" aria-hidden="true">
            <TrophyOutlined />
          </div>
          <div class="summary-balance__body">
            <p class="summary-balance__label">Парк</p>
            <p class="summary-balance__value">
              {{ drivers.current.balance_park_points }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Tabs: Профиль | Баллы | Поездки | Задания | Уровень -->
    <a-tabs v-model:activeKey="activeTab" class="driver-tabs" @change="onTabChange">

      <!-- ── Профиль ──────────────────────────────────────────────────────── -->
      <a-tab-pane key="profile" tab="Профиль">
        <section class="driver-detail__section info-grid">
          <div class="detail-card lotax-card">
            <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="flex flex-col gap-1">
                <h2 class="lotax-section-title">Профиль</h2>
                <p class="lotax-caption">
                  ФИО и телефон без маски (как в диспетчерской)
                </p>
              </div>
              <div v-if="auth.canViewPdn" class="flex flex-wrap gap-2">
                <a-button
                  v-if="!drivers.personalData"
                  class="lotax-btn-secondary"
                  :loading="pdnLoading"
                  @click="confirmRevealPdn"
                >
                  <template #icon><EyeOutlined /></template>
                  Аудит ПДн
                </a-button>
                <a-button
                  v-else
                  class="lotax-btn-secondary"
                  @click="hidePdn"
                >
                  Скрыть аудит
                </a-button>
              </div>
            </div>

            <div v-if="auth.canViewPdn && pdnLoading" class="flex justify-center py-10">
              <a-spin />
            </div>

            <div
              v-else-if="auth.canViewPdn && pdnError"
              class="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700"
            >
              {{ pdnError }}
            </div>

            <div v-else class="profile-fields">
              <InfoField
                label="Имя"
                :value="
                  unmasked(drivers.personalData?.first_name) ||
                  unmasked(drivers.current.first_name) ||
                  unmasked(drivers.current.first_name_masked) ||
                  '—'
                "
              />
              <InfoField
                label="Фамилия"
                :value="
                  unmasked(drivers.personalData?.last_name) ||
                  unmasked(drivers.current.last_name) ||
                  unmasked(drivers.current.last_name_masked) ||
                  '—'
                "
              />
              <InfoField
                label="Отчество"
                :value="
                  unmasked(drivers.personalData?.middle_name) ||
                  unmasked(drivers.current.middle_name) ||
                  '—'
                "
              />
              <InfoField
                label="Телефон"
                :value="
                  formatPhone(
                    unmasked(drivers.personalData?.phone) ||
                      unmasked(drivers.current.phone) ||
                      unmasked(drivers.current.phone_masked),
                  )
                "
              />
              <InfoField
                label="Отображаемое имя"
                :value="
                  unmasked(drivers.personalData?.display_name) ||
                  unmasked(drivers.current.display_name) ||
                  '—'
                "
              />
              <InfoField label="Реферал" :value="drivers.current.referral_code" />
              <InfoField
                label="Создан"
                :value="dayjs(drivers.current.created_at).format('DD.MM.YYYY HH:mm')"
              />
              <InfoField
                label="Статус Яндекс"
                :value="workStatusLabel(drivers.current.work_status) || '—'"
              />
            </div>
          </div>

          <div class="detail-card lotax-card">
            <h2 class="lotax-section-title mb-6">ID Яндекс</h2>
            <div class="flex flex-col gap-6">
              <CopyableId label="ID водителя" :value="drivers.current.yandex_driver_id" />
              <CopyableId label="ID парка" :value="drivers.current.yandex_park_id" />
            </div>
          </div>
        </section>
      </a-tab-pane>

      <!-- ── Баллы ───────────────────────────────────────────────────────── -->
      <a-tab-pane key="points" tab="Баллы">
        <section class="detail-card lotax-card">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="lotax-section-title">История баллов</h2>
            </div>
            <div class="flex flex-wrap gap-2">
              <a-button
                v-if="auth.isDirector"
                class="lotax-btn-secondary"
                :loading="exportingPoints"
                @click="exportPointsExcel"
              >
                <template #icon><DownloadOutlined /></template>
                Excel
              </a-button>
              <a-button
                class="lotax-btn-secondary"
                :loading="pointsLoading"
                @click="() => { pointsPag.current = 1; loadPoints() }"
              >
                Обновить
              </a-button>
            </div>
          </div>

          <!-- Filters -->
          <div class="mb-4 flex flex-wrap gap-2">
            <a-select
              v-model:value="pointsFilter.points_type"
              size="default"
              class="!w-36"
              :options="[
                { value: 'all', label: 'Все типы' },
                { value: 'system', label: 'Система' },
                { value: 'park', label: 'Парк' },
              ]"
            />
            <a-select
              v-model:value="pointsFilter.operation"
              size="default"
              class="!w-44"
              :options="[
                { value: 'all', label: 'Все операции' },
                { value: 'earn', label: 'Начисление' },
                { value: 'spend', label: 'Списание' },
              ]"
            />
            <a-select
              v-model:value="pointsFilter.period"
              size="default"
              class="!w-40"
              :options="periodOptions"
            />
          </div>

          <a-table
            row-key="id"
            :columns="pointsColumns"
            :data-source="pointsItems"
            :loading="pointsLoading"
            :pagination="pointsPag"
            :scroll="{ x: 780 }"
            :locale="{ emptyText: ' ' }"
            @change="(pag: { current?: number; pageSize?: number }) => {
              pointsPag.current = pag.current ?? 1
              pointsPag.pageSize = pag.pageSize ?? 20
              loadPoints()
            }"
          >
            <template #emptyText>
              <div class="flex flex-col items-center gap-2 py-10">
                <p class="text-[15px] font-medium text-ink">История баллов пуста</p>
              </div>
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'date'">
                {{ pointsItemDate(record as DriverPointsHistoryItem) }}
              </template>
              <template v-else-if="column.key === 'points_type'">
                {{ pointsTypeRu((record as DriverPointsHistoryItem).points_type) }}
              </template>
              <template v-else-if="column.key === 'operation'">
                <span
                  :class="[
                    'tabular-nums font-medium',
                    (record as DriverPointsHistoryItem).operation === 'earn' ? 'text-green-600' : 'text-red-500',
                  ]"
                >
                  {{ operationRu((record as DriverPointsHistoryItem).operation) }}
                </span>
              </template>
              <template v-else-if="column.key === 'amount'">
                <span
                  :class="[
                    'tabular-nums font-semibold',
                    (record as DriverPointsHistoryItem).operation === 'earn' ? 'text-green-600' : 'text-red-500',
                  ]"
                >
                  {{ (record as DriverPointsHistoryItem).operation === 'earn' ? '+' : '−' }}{{ Math.abs((record as DriverPointsHistoryItem).amount) }}
                </span>
              </template>
              <template v-else-if="column.key === 'balance_after'">
                <span class="tabular-nums text-ink-muted">
                  {{ (record as DriverPointsHistoryItem).balance_after ?? '—' }}
                </span>
              </template>
              <template v-else-if="column.key === 'description'">
                {{ (record as DriverPointsHistoryItem).description || (record as DriverPointsHistoryItem).source || '—' }}
              </template>
            </template>
          </a-table>
        </section>
      </a-tab-pane>

      <!-- ── Поездки ─────────────────────────────────────────────────────── -->
      <a-tab-pane key="rides" tab="Поездки">
        <section class="detail-card lotax-card">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="lotax-section-title">История поездок</h2>
              <p class="lotax-caption mt-1">Данные из Yandex после синхронизации</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <a-select
                v-model:value="rhPeriod"
                size="default"
                class="!w-40"
                :options="periodOptions"
              />
              <a-button
                class="lotax-btn-secondary"
                :loading="rhLoading"
                @click="() => { rhPag.current = 1; loadRidesHistory() }"
              >
                Обновить
              </a-button>
              <a-button
                v-if="auth.canSync"
                type="primary"
                class="lotax-btn-primary"
                :loading="syncingRides"
                @click="syncRidesFromDetail"
              >
                <template #icon><CloudSyncOutlined /></template>
                Синхронизировать поездки
              </a-button>
            </div>
          </div>

          <!-- Summary cards (if API returns summary) -->
          <div v-if="rhSummary" class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div v-if="rhSummary.total_rides != null" class="rounded-xl bg-gray-50 px-4 py-3">
              <p class="text-[12px] text-ink-muted">Поездок</p>
              <p class="text-[20px] font-bold tabular-nums text-ink">{{ rhSummary.total_rides }}</p>
            </div>
            <div v-if="rhSummary.total_fare != null" class="rounded-xl bg-gray-50 px-4 py-3">
              <p class="text-[12px] text-ink-muted">Выручка</p>
              <p class="text-[20px] font-bold tabular-nums text-ink">{{ rhSummary.total_fare }}</p>
            </div>
            <div v-if="rhSummary.total_system_points != null" class="rounded-xl bg-gray-50 px-4 py-3">
              <p class="text-[12px] text-ink-muted">Сист. баллы</p>
              <p class="text-[20px] font-bold tabular-nums text-ink">{{ rhSummary.total_system_points }}</p>
            </div>
            <div v-if="rhSummary.total_park_points != null" class="rounded-xl bg-gray-50 px-4 py-3">
              <p class="text-[12px] text-ink-muted">Парк. баллы</p>
              <p class="text-[20px] font-bold tabular-nums text-ink">{{ rhSummary.total_park_points }}</p>
            </div>
          </div>

          <a-table
            row-key="id"
            :columns="rhColumns"
            :data-source="rhItems"
            :loading="rhLoading"
            :pagination="rhPag"
            :scroll="{ x: 720 }"
            :locale="{ emptyText: ' ' }"
            @change="(pag: { current?: number; pageSize?: number }) => {
              rhPag.current = pag.current ?? 1
              rhPag.pageSize = pag.pageSize ?? 20
              loadRidesHistory()
            }"
          >
            <template #emptyText>
              <div class="flex flex-col items-center gap-3 py-10">
                <p class="text-[15px] font-medium text-ink">Поездок пока нет</p>
                <p class="lotax-caption max-w-sm text-center">
                  Сначала нажмите «Синхронизировать поездки»
                </p>
                <a-button
                  v-if="auth.canSync"
                  type="primary"
                  class="lotax-btn-primary"
                  :loading="syncingRides"
                  @click="syncRidesFromDetail"
                >
                  <template #icon><CloudSyncOutlined /></template>
                  Синхронизировать поездки
                </a-button>
              </div>
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'ride_date'">
                {{ rideItemDate(record as DriverRidesHistoryItem) }}
              </template>
              <template v-else-if="column.key === 'pickup_address'">
                {{ (record as DriverRidesHistoryItem).pickup_address || '—' }}
              </template>
              <template v-else-if="column.key === 'dropoff_address'">
                {{ (record as DriverRidesHistoryItem).dropoff_address || '—' }}
              </template>
              <template v-else-if="column.key === 'fare_amount'">
                <span class="tabular-nums">
                  {{
                    (record as DriverRidesHistoryItem).fare_amount != null
                      ? `${(record as DriverRidesHistoryItem).fare_amount} ${(record as DriverRidesHistoryItem).currency || ''}`
                      : '—'
                  }}
                </span>
              </template>
              <template v-else-if="column.key === 'points_system_earned'">
                <span class="tabular-nums">{{ (record as DriverRidesHistoryItem).points_system_earned ?? '—' }}</span>
              </template>
              <template v-else-if="column.key === 'points_park_earned'">
                <span class="tabular-nums">{{ (record as DriverRidesHistoryItem).points_park_earned ?? '—' }}</span>
              </template>
            </template>
          </a-table>
        </section>
      </a-tab-pane>

      <!-- ── Задания ─────────────────────────────────────────────────────── -->
      <a-tab-pane key="tasks" tab="Задания">
        <section class="detail-card lotax-card">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 class="lotax-section-title">История заданий</h2>
            <div class="flex flex-wrap gap-2">
              <a-select
                v-model:value="thStatus"
                size="default"
                class="!w-44"
                :options="taskStatusOptions"
              />
              <a-button
                class="lotax-btn-secondary"
                :loading="thLoading"
                @click="() => { thPag.current = 1; loadTasksHistory() }"
              >
                Обновить
              </a-button>
            </div>
          </div>

          <a-table
            row-key="id"
            :columns="thColumns"
            :data-source="thItems"
            :loading="thLoading"
            :pagination="thPag"
            :scroll="{ x: 700 }"
            :locale="{ emptyText: ' ' }"
            @change="(pag: { current?: number; pageSize?: number }) => {
              thPag.current = pag.current ?? 1
              thPag.pageSize = pag.pageSize ?? 20
              loadTasksHistory()
            }"
          >
            <template #emptyText>
              <div class="flex flex-col items-center gap-2 py-10">
                <p class="text-[15px] font-medium text-ink">История заданий пуста</p>
              </div>
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'title'">
                {{ (record as DriverTaskHistoryItem).title || '—' }}
              </template>
              <template v-else-if="column.key === 'progress'">
                <span class="tabular-nums text-[13px]">
                  <template v-if="(record as DriverTaskHistoryItem).progress != null && (record as DriverTaskHistoryItem).target_value != null">
                    {{ (record as DriverTaskHistoryItem).progress }} / {{ (record as DriverTaskHistoryItem).target_value }}
                    <span class="text-ink-muted ml-1">
                      ({{ Math.min(100, Math.round(((record as DriverTaskHistoryItem).progress! / (record as DriverTaskHistoryItem).target_value!) * 100)) }}%)
                    </span>
                  </template>
                  <template v-else>—</template>
                </span>
              </template>
              <template v-else-if="column.key === 'status'">
                <span
                  :class="[
                    'text-[13px] font-medium',
                    (record as DriverTaskHistoryItem).status === 'completed' ? 'text-green-600' :
                    (record as DriverTaskHistoryItem).status === 'cancelled' ? 'text-red-500' :
                    'text-ink-muted',
                  ]"
                >
                  {{ taskStatusRu((record as DriverTaskHistoryItem).status) }}
                </span>
              </template>
              <template v-else-if="column.key === 'reward'">
                <span v-if="(record as DriverTaskHistoryItem).reward_points != null" class="tabular-nums font-semibold text-green-600">
                  +{{ (record as DriverTaskHistoryItem).reward_points }}
                  <span class="text-[11px] font-normal text-ink-muted">
                    {{ (record as DriverTaskHistoryItem).reward_points_type === 'system' ? 'сист.' : 'парк.' }}
                  </span>
                </span>
                <span v-else>—</span>
              </template>
              <template v-else-if="column.key === 'task_date'">
                {{ taskItemDate(record as DriverTaskHistoryItem) }}
              </template>
            </template>
          </a-table>
        </section>
      </a-tab-pane>

      <!-- ── Уровень ─────────────────────────────────────────────────────── -->
      <a-tab-pane key="tier" tab="Уровень">
        <section class="detail-card lotax-card">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="lotax-section-title">История изменений уровня</h2>
            <a-button
              class="lotax-btn-secondary"
              :loading="tierHistLoading"
              @click="() => { tierHistPag.current = 1; loadTierHistory() }"
            >
              Обновить
            </a-button>
          </div>

          <a-table
            row-key="id"
            :columns="tierHistColumns"
            :data-source="tierHistItems"
            :loading="tierHistLoading"
            :pagination="tierHistPag"
            :scroll="{ x: 620 }"
            :locale="{ emptyText: ' ' }"
            @change="(pag: { current?: number; pageSize?: number }) => {
              tierHistPag.current = pag.current ?? 1
              tierHistPag.pageSize = pag.pageSize ?? 20
              loadTierHistory()
            }"
          >
            <template #emptyText>
              <div class="flex flex-col items-center gap-2 py-10">
                <p class="text-[15px] font-medium text-ink">История уровней пуста</p>
              </div>
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'created_at'">
                {{ (record as DriverTierHistoryItem).created_at
                  ? dayjs((record as DriverTierHistoryItem).created_at!).format('DD.MM.YYYY HH:mm')
                  : '—' }}
              </template>
              <template v-else-if="column.key === 'tier'">
                <TierBadge :tier="(record as DriverTierHistoryItem).tier as 'bronze' | 'silver' | 'gold' | 'platinum'" />
              </template>
              <template v-else-if="column.key === 'reason'">
                {{ (record as DriverTierHistoryItem).reason || '—' }}
              </template>
              <template v-else-if="column.key === 'expires_at'">
                {{ (record as DriverTierHistoryItem).expires_at
                  ? dayjs((record as DriverTierHistoryItem).expires_at!).format('DD.MM.YYYY HH:mm')
                  : 'Без срока' }}
              </template>
            </template>
          </a-table>
        </section>
      </a-tab-pane>

    </a-tabs>

    <!-- Modals (unchanged) -->
    <a-modal
      v-model:open="balanceOpen"
      title="Корректировка баллов"
      ok-text="Применить"
      cancel-text="Отмена"
      centered
      :width="440"
      :confirm-loading="adjustSaving"
      @ok="saveBalance"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Тип баллов">
          <a-input value="Парковые" size="large" disabled />
          <p class="mt-1 text-[13px] text-ink-muted">
            Директор может корректировать только парковые баллы
          </p>
        </a-form-item>
        <a-form-item label="Сумма (+/−)">
          <a-input-number v-model:value="adjustForm.amount" class="!w-full" size="large" />
        </a-form-item>
        <a-form-item label="Причина" required>
          <a-textarea v-model:value="adjustForm.description" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="statusOpen"
      title="Изменить статус"
      ok-text="Сохранить"
      cancel-text="Отмена"
      centered
      :width="440"
      @ok="saveStatus"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Статус">
          <a-select
            v-model:value="statusForm.status"
            size="large"
            class="!w-full"
            :options="[
              { value: 'active', label: 'Активен' },
              { value: 'blocked', label: 'Заблокирован' },
              { value: 'pending', label: 'Ожидание' },
            ]"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="tierOpen"
      title="Изменить уровень"
      ok-text="Применить"
      cancel-text="Отмена"
      centered
      :width="440"
      :confirm-loading="tierSaving"
      @ok="saveTier"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Уровень" required>
          <a-select
            v-model:value="tierForm.tier"
            size="large"
            :options="tierOptions"
          />
        </a-form-item>
        <a-form-item label="Причина" required>
          <a-textarea
            v-model:value="tierForm.reason"
            :rows="3"
            placeholder="Обязательно — например, компенсация сбоя"
          />
        </a-form-item>
        <a-form-item label="Срок действия (необязательно)">
          <a-date-picker
            v-model:value="tierExpiresAt"
            class="!w-full"
            size="large"
            show-time
            format="DD.MM.YYYY HH:mm"
            placeholder="Без срока — пока не снимут вручную"
          />
          <p class="lotax-caption mt-1">
            После даты уровень снова считается автоматически
          </p>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="passwordOpen"
      title="Сменить пароль"
      ok-text="Сохранить"
      cancel-text="Отмена"
      centered
      :width="400"
      :confirm-loading="passwordSaving"
      @ok="savePassword"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Новый пароль (4 цифры)" required>
          <a-input
            v-model:value="passwordValue"
            size="large"
            :maxlength="4"
            inputmode="numeric"
            autocomplete="off"
            placeholder="1234"
            @update:value="
              (v: string) => (passwordValue = String(v).replace(/\D/g, '').slice(0, 4))
            "
          />
          <p class="mt-1 text-[13px] text-ink-muted">
            Водитель входит по телефону и этому паролю. По умолчанию — последние 4 цифры номера.
          </p>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>

  <div v-else class="flex flex-col items-center justify-center gap-3 py-20 md:py-28">
    <a-spin size="large" />
    <p class="lotax-caption">Загрузка карточки водителя…</p>
  </div>
</template>

<style scoped>
.driver-detail {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.driver-detail__header {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 1200px) {
  .driver-detail__header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }
}

.driver-detail__intro {
  min-width: 0;
}

.driver-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  margin-bottom: 16px;
  border-radius: var(--lotax-radius);
  border: 1px solid var(--lotax-border);
  background: var(--lotax-card);
  color: var(--lotax-text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--lotax-transition),
    color var(--lotax-transition),
    border-color var(--lotax-transition);
}

@media (hover: hover) and (pointer: fine) {
  .driver-back:hover {
    background: #f3f4f6;
    color: var(--lotax-text);
    border-color: var(--lotax-border-strong);
  }
}

.driver-detail__eyebrow {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--lotax-text-secondary);
}

.driver-detail__title {
  margin: 0;
  font-size: clamp(1.75rem, 1.4rem + 1.4vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--lotax-text);
  word-break: break-word;
}

.driver-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
}

@media (min-width: 1200px) {
  .driver-actions {
    width: auto;
    justify-content: flex-end;
    max-width: 640px;
  }
}

@media (max-width: 767px) {
  .driver-actions :deep(.ant-btn) {
    width: 100%;
  }
}

.detail-card {
  padding: 20px;
}

@media (min-width: 768px) {
  .detail-card {
    padding: 28px;
  }
}

.summary-card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: center;
  padding: 24px;
  border-radius: var(--lotax-radius-xl);
}

@media (min-width: 768px) {
  .summary-card {
    padding: 32px;
    grid-template-columns: 1.4fr 1fr;
    gap: 28px 32px;
  }

  .summary-card > .summary-balance {
    grid-column: 1 / -1;
  }
}

@media (min-width: 1200px) {
  .summary-card {
    grid-template-columns: minmax(200px, 1.3fr) minmax(160px, 0.85fr) minmax(120px, 0.75fr) minmax(240px, 1.3fr);
    gap: 24px 28px;
  }

  .summary-card > .summary-balance {
    grid-column: auto;
  }
}

.summary-card__identity {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  min-width: 0;
}

@media (min-width: 768px) {
  .summary-card__identity {
    flex-direction: row;
    align-items: center;
    gap: 18px;
  }
}

.summary-card__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: var(--lotax-radius-xl);
  background: var(--lotax-primary);
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  box-shadow: 0 8px 24px var(--lotax-primary-strong);
}

.summary-card__name {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--lotax-text);
  word-break: break-word;
}

.summary-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.summary-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.summary-meta__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 14px;
  font-size: 18px;
}

.summary-meta__icon--calendar {
  background: #f3f4f6;
  color: var(--lotax-text-secondary);
}

.summary-meta__icon--gift {
  background: var(--lotax-primary-soft);
  color: var(--lotax-primary);
}

.summary-meta__body {
  min-width: 0;
}

.summary-meta__label {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--lotax-text-secondary);
}

.summary-meta__value {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--lotax-text);
  word-break: break-word;
}

.summary-meta__value--nowrap {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.summary-meta__dot {
  margin: 0 4px;
  color: #d1d5db;
  font-weight: 500;
}

.summary-meta__value--code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.02em;
}

/* Balance — aligned with meta blocks, no separate gray box */
.summary-balance {
  display: flex;
  align-items: center;
  gap: 0;
  min-width: 0;
}

.summary-balance__item {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.summary-balance__divider {
  width: 1px;
  height: 40px;
  margin: 0 16px;
  flex-shrink: 0;
  background: var(--lotax-border);
}

.summary-balance__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 14px;
  font-size: 18px;
}

.summary-balance__icon--system {
  background: var(--lotax-info-soft);
  color: var(--lotax-info);
}

.summary-balance__icon--park {
  background: var(--lotax-success-soft);
  color: var(--lotax-success);
}

.summary-balance__label {
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 500;
  color: var(--lotax-text-secondary);
}

.summary-balance__value {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--lotax-text);
  font-variant-numeric: tabular-nums;
}

@media (min-width: 1200px) {
  .summary-balance__value {
    font-size: 26px;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 1200px) {
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 32px;
  }
}

.profile-fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 768px) {
  .profile-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Yandex work status badge */
.yandex-work-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: #dcfce7;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.yandex-work-badge--fired {
  background: #fee2e2;
  color: #dc2626;
  border-color: #fecaca;
}
</style>
