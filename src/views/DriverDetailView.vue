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
  DriverPointsAccrualItem,
  DriverPointsHistoryItem,
  DriverRidesHistoryItem,
  DriverRidesHistorySummary,
  DriverTaskHistoryItem,
  DriverTierHistoryItem,
  DriverStatus,
  DriverTier,
  YandexEarningsSummary,
  YandexLiveEarningsItem,
  YandexLiveOrderItem,
  YandexLiveStatementItem,
  YandexStatementSummary,
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
const pointsFilter = reactive({ points_type: 'all', operation: 'all', period: 'month' })
const pointsRange = ref<[Dayjs, Dayjs] | undefined>()
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

// ── Points accruals ───────────────────────────────────────────────────────────
const accrualsFilter = reactive({ points_type: 'all', period: 'month' })
const accrualsRange = ref<[Dayjs, Dayjs] | undefined>()
const accrualsPag = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (t: number) => `Всего: ${t}`,
})
const accrualsItems = ref<DriverPointsAccrualItem[]>([])
const accrualsEarned = ref<number | null>(null)
const accrualsLoading = ref(false)

const accrualsColumns = [
  { title: 'Дата', key: 'date', width: 170 },
  { title: 'Тип', key: 'points_type', width: 100 },
  { title: 'Сумма', key: 'amount', width: 90, align: 'right' as const },
  { title: 'Источник', key: 'source', ellipsis: true },
  { title: 'Баланс после', key: 'balance_after', width: 120, align: 'right' as const },
  { title: 'Парк', key: 'park_name', width: 140 },
]

// ── Rides history ─────────────────────────────────────────────────────────────
const rhPeriod = ref('month')
const rhRange = ref<[Dayjs, Dayjs] | undefined>()
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
const thPeriod = ref('month')
const thRange = ref<[Dayjs, Dayjs] | undefined>()
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
const tierHistPeriod = ref('month')
const tierHistRange = ref<[Dayjs, Dayjs] | undefined>()
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

// ── Yandex live ───────────────────────────────────────────────────────────────
const yxPeriod = ref('week')
const yxRange = ref<[Dayjs, Dayjs] | undefined>()
const yxTimeFrom = ref<Dayjs | undefined>()
const yxTimeTo = ref<Dayjs | undefined>()
const yxOrdersFilter = reactive({
  timeField: 'ended_at',
  statuses: [] as string[],
  paymentMethods: [] as string[],
  categories: [] as string[],
  orderTypes: [] as string[],
})
const yxStatementFilter = reactive({
  categoryIds: [] as string[],
  order: '',
  exceptCash: true,
})
const yxEarningsFilter = reactive({
  timeField: 'ended_at',
  statuses: [] as string[],
})
const yxStatementSummary = ref<YandexStatementSummary | null>(null)
const yxEarningsSummary = ref<YandexEarningsSummary | null>(null)
const yxOrders = ref<YandexLiveOrderItem[]>([])
const yxStatement = ref<YandexLiveStatementItem[]>([])
const yxEarnings = ref<YandexLiveEarningsItem[]>([])
const yxOrdersCursor = ref<string | null>(null)
const yxStatementCursor = ref<string | null>(null)
const yxEarningsCursor = ref<string | null>(null)
const yxOrdersLoading = ref(false)
const yxStatementLoading = ref(false)
const yxEarningsLoading = ref(false)
const yxOrdersError = ref<string | null>(null)
const yxStatementError = ref<string | null>(null)
const yxEarningsError = ref<string | null>(null)

const yxOrderColumns = [
  { title: '№', key: 'short_id', width: 90 },
  { title: 'Статус', key: 'status', width: 120 },
  { title: 'Бронь', key: 'booked_at', width: 150 },
  { title: 'Завершён', key: 'ended_at', width: 150 },
  { title: 'Категория', key: 'category', width: 120 },
  { title: 'Оплата', key: 'payment_method', width: 110 },
  { title: 'Тип', key: 'order_type', width: 100 },
  { title: 'Откуда', key: 'pickup', ellipsis: true },
  { title: 'Куда', key: 'dropoff', ellipsis: true },
  { title: 'Авто', key: 'car', width: 140 },
  { title: 'Сумма', key: 'price', width: 110, align: 'right' as const },
]

const yxStatementColumns = [
  { title: 'Дата', key: 'event_at', width: 160 },
  { title: 'Категория', key: 'category', ellipsis: true },
  { title: 'Заказ', key: 'order_short_id', width: 100 },
  { title: 'Сумма', key: 'amount', width: 120, align: 'right' as const },
  { title: 'Описание', key: 'description', ellipsis: true },
]

const yxEarningsColumns = [
  { title: 'Период', key: 'period', width: 200 },
  { title: 'Брутто', key: 'gross', width: 110, align: 'right' as const },
  { title: 'Комиссия', key: 'commission', width: 110, align: 'right' as const },
  { title: 'Нетто', key: 'net', width: 110, align: 'right' as const },
]

// ── Filter option lists ───────────────────────────────────────────────────────
const periodOptions = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' },
  { value: 'period', label: 'Период' },
]

const taskStatusOptions = [
  { value: 'all', label: 'Все статусы' },
  { value: 'completed', label: 'Выполнено' },
  { value: 'active', label: 'Активно' },
  { value: 'failed', label: 'Не выполнено' },
  { value: 'cancelled', label: 'Отменено' },
]

const yxTimeFieldOptions = [
  { value: 'ended_at', label: 'По завершению' },
  { value: 'booked_at', label: 'По брони' },
]

const yxOrderStatusOptions = [
  { value: 'none', label: 'Создан' },
  { value: 'driving', label: 'Едет к клиенту' },
  { value: 'waiting', label: 'Ожидание' },
  { value: 'transporting', label: 'В поездке' },
  { value: 'complete', label: 'Завершён' },
  { value: 'cancelled', label: 'Отменён' },
  { value: 'failed', label: 'Ошибка' },
]

const yxPaymentOptions = [
  { value: 'cash', label: 'Наличные' },
  { value: 'cashless', label: 'Безнал' },
  { value: 'card', label: 'Карта' },
  { value: 'corp', label: 'Корп.' },
]

const hasYandexDriverId = computed(() => Boolean(drivers.current?.yandex_driver_id))
const tiersEnabled = computed(() => drivers.current?.tiers_enabled !== false)

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

function syncPeriod(
  value: [Dayjs, Dayjs] | [string, string],
  setPeriod: (period: string) => void,
  current: string,
  fallback: string,
) {
  if (value?.[0] && value?.[1]) setPeriod('period')
  else if (current === 'period') setPeriod(fallback)
}

function periodQuery(period: string, range?: [Dayjs, Dayjs] | null) {
  if (period === 'period' && range?.[0] && range?.[1]) {
    return {
      date_from: range[0].startOf('day').toISOString(),
      date_to: range[1].endOf('day').toISOString(),
    }
  }
  return { period }
}

function hhmm(value?: Dayjs) {
  return value ? value.format('HH:mm') : undefined
}

function yandexDates() {
  if (yxPeriod.value === 'period' && yxRange.value?.[0] && yxRange.value?.[1]) {
    return {
      date_from: yxRange.value[0].format('YYYY-MM-DD'),
      date_to: yxRange.value[1].format('YYYY-MM-DD'),
    }
  }
  return { period: yxPeriod.value === 'period' ? 'week' : yxPeriod.value }
}

function yandexQuery(
  extra: {
    time_field?: string
    statuses?: string[]
    payment_methods?: string[]
    categories?: string[]
    order_type?: string[]
    category_ids?: string[]
    order?: string
    except_cash_and_pending?: boolean
  } = {},
  cursor?: string | null,
) {
  return {
    ...yandexDates(),
    time_from: hhmm(yxTimeFrom.value),
    time_to: hhmm(yxTimeTo.value),
    cursor: cursor || undefined,
    limit: 50,
    ...extra,
  }
}

function yxField(record: object, ...keys: string[]) {
  const row = record as Record<string, unknown>
  for (const key of keys) {
    const value = row[key]
    if (value != null && value !== '') return String(value)
  }
  return '—'
}

function yxWhen(record: object, ...keys: string[]) {
  const raw = yxField(record, ...keys)
  if (raw === '—') return raw
  const parsed = dayjs(raw)
  return parsed.isValid() ? parsed.format('DD.MM.YYYY HH:mm') : raw
}

function accrualsItemDate(item: DriverPointsAccrualItem) {
  const raw = item.date || item.created_at
  return raw ? dayjs(raw).format('DD.MM.YYYY HH:mm') : '—'
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
      ...periodQuery(pointsFilter.period, pointsRange.value),
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

async function loadAccruals() {
  accrualsLoading.value = true
  try {
    const { data } = await driversApi.pointsAccruals(driverId.value, {
      points_type: accrualsFilter.points_type !== 'all' ? accrualsFilter.points_type : undefined,
      ...periodQuery(accrualsFilter.period, accrualsRange.value),
      page: accrualsPag.current,
      page_size: accrualsPag.pageSize,
    })
    accrualsItems.value = data.items
    accrualsPag.total = data.total
    accrualsEarned.value = data.summary?.earned ?? null
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    accrualsLoading.value = false
  }
}

async function loadRidesHistory() {
  rhLoading.value = true
  try {
    const { data } = await driversApi.ridesHistory(driverId.value, {
      ...periodQuery(rhPeriod.value, rhRange.value),
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
      ...periodQuery(thPeriod.value, thRange.value),
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
      ...periodQuery(tierHistPeriod.value, tierHistRange.value),
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

async function loadYandexOrders(append = false) {
  if (!hasYandexDriverId.value) {
    yxOrdersError.value = 'У водителя нет yandex_driver_id — живые заказы недоступны'
    yxOrders.value = []
    yxOrdersCursor.value = null
    return
  }
  yxOrdersLoading.value = true
  yxOrdersError.value = null
  try {
    const { data } = await driversApi.yandexOrders(
      driverId.value,
      yandexQuery(
        {
          time_field: yxOrdersFilter.timeField,
          statuses: yxOrdersFilter.statuses,
          payment_methods: yxOrdersFilter.paymentMethods,
          categories: yxOrdersFilter.categories,
          order_type: yxOrdersFilter.orderTypes,
        },
        append ? yxOrdersCursor.value : null,
      ),
    )
    yxOrders.value = append ? [...yxOrders.value, ...data.items] : data.items
    yxOrdersCursor.value = data.next_cursor ?? data.cursor ?? null
  } catch (e) {
    yxOrdersError.value = extractErrorMessage(e)
    if (!append) yxOrders.value = []
  } finally {
    yxOrdersLoading.value = false
  }
}

async function loadYandexStatement(append = false) {
  if (!hasYandexDriverId.value) {
    yxStatementError.value = 'У водителя нет yandex_driver_id — ведомость недоступна'
    yxStatement.value = []
    yxStatementCursor.value = null
    return
  }
  yxStatementLoading.value = true
  yxStatementError.value = null
  try {
    const { data } = await driversApi.yandexStatement(
      driverId.value,
      yandexQuery(
        {
          category_ids: yxStatementFilter.categoryIds,
          order: yxStatementFilter.order,
          except_cash_and_pending: yxStatementFilter.exceptCash,
        },
        append ? yxStatementCursor.value : null,
      ),
    )
    yxStatementSummary.value = (data.summary as YandexStatementSummary | undefined) ?? null
    yxStatement.value = append ? [...yxStatement.value, ...data.items] : data.items
    yxStatementCursor.value = data.next_cursor ?? data.cursor ?? null
  } catch (e) {
    yxStatementError.value = extractErrorMessage(e)
    if (!append) yxStatement.value = []
  } finally {
    yxStatementLoading.value = false
  }
}

async function loadYandexEarnings(append = false) {
  if (!hasYandexDriverId.value) {
    yxEarningsError.value = 'У водителя нет yandex_driver_id — заработок недоступен'
    yxEarnings.value = []
    yxEarningsCursor.value = null
    return
  }
  yxEarningsLoading.value = true
  yxEarningsError.value = null
  try {
    const { data } = await driversApi.yandexEarnings(
      driverId.value,
      yandexQuery(
        {
          time_field: yxEarningsFilter.timeField,
          statuses: yxEarningsFilter.statuses,
        },
        append ? yxEarningsCursor.value : null,
      ),
    )
    const nested = data.summary
    yxEarningsSummary.value =
      nested && !Array.isArray(nested)
        ? nested
        : data.orders_total != null || data.fare_sum != null || data.by_category
          ? data
          : null
    yxEarnings.value = append ? [...yxEarnings.value, ...(data.items ?? [])] : (data.items ?? [])
    yxEarningsCursor.value = data.next_cursor ?? data.cursor ?? null
  } catch (e) {
    yxEarningsError.value = extractErrorMessage(e)
    if (!append) yxEarnings.value = []
  } finally {
    yxEarningsLoading.value = false
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
  } else if (key === 'accruals' && !accrualsItems.value.length && !accrualsLoading.value) {
    accrualsPag.current = 1
    void loadAccruals()
  } else if (key === 'rides' && !rhItems.value.length && !rhLoading.value) {
    rhPag.current = 1
    void loadRidesHistory()
  } else if (key === 'tasks' && !thItems.value.length && !thLoading.value) {
    thPag.current = 1
    void loadTasksHistory()
  } else if (key === 'tier' && !tierHistItems.value.length && !tierHistLoading.value) {
    tierHistPag.current = 1
    void loadTierHistory()
  } else if (key === 'yx-orders') {
    void loadYandexOrders(false)
  } else if (key === 'yx-statement') {
    void loadYandexStatement(false)
  } else if (key === 'yx-earnings') {
    void loadYandexEarnings(false)
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
  [() => pointsFilter.points_type, () => pointsFilter.operation, () => pointsFilter.period, pointsRange],
  () => {
    if (activeTab.value === 'points') {
      pointsPag.current = 1
      void loadPoints()
    }
  },
)

watch(
  [() => accrualsFilter.points_type, () => accrualsFilter.period, accrualsRange],
  () => {
    if (activeTab.value === 'accruals') {
      accrualsPag.current = 1
      void loadAccruals()
    }
  },
)

watch([rhPeriod, rhRange], () => {
  if (activeTab.value === 'rides') {
    rhPag.current = 1
    void loadRidesHistory()
  }
})

watch([thStatus, thPeriod, thRange], () => {
  if (activeTab.value === 'tasks') {
    thPag.current = 1
    void loadTasksHistory()
  }
})

watch([tierHistPeriod, tierHistRange], () => {
  if (activeTab.value === 'tier') {
    tierHistPag.current = 1
    void loadTierHistory()
  }
})

watch(
  [
    yxPeriod,
    yxRange,
    yxTimeFrom,
    yxTimeTo,
    () => yxOrdersFilter.timeField,
    () => [...yxOrdersFilter.statuses],
    () => [...yxOrdersFilter.paymentMethods],
    () => [...yxOrdersFilter.categories],
    () => [...yxOrdersFilter.orderTypes],
    () => [...yxStatementFilter.categoryIds],
    () => yxStatementFilter.order,
    () => yxStatementFilter.exceptCash,
    () => yxEarningsFilter.timeField,
    () => [...yxEarningsFilter.statuses],
  ],
  () => {
    if (activeTab.value === 'yx-orders') void loadYandexOrders(false)
    else if (activeTab.value === 'yx-statement') void loadYandexStatement(false)
    else if (activeTab.value === 'yx-earnings') void loadYandexEarnings(false)
  },
)

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

    <!-- Профиль, Баллы, Начисления, Поездки, Задания, Уровень, Заказы, Ведомость, Заработок -->
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
              size="middle"
              class="!w-36"
              :options="[
                { value: 'all', label: 'Все типы' },
                { value: 'system', label: 'Система' },
                { value: 'park', label: 'Парк' },
              ]"
            />
            <a-select
              v-model:value="pointsFilter.operation"
              size="middle"
              class="!w-44"
              :options="[
                { value: 'all', label: 'Все операции' },
                { value: 'earn', label: 'Начисление' },
                { value: 'spend', label: 'Списание' },
              ]"
            />
            <a-select
              v-model:value="pointsFilter.period"
              size="middle"
              class="!w-40"
              :options="periodOptions"
            />
            <a-range-picker
              v-model:value="pointsRange"
              allow-clear
              format="DD.MM.YYYY"
              class="!w-[260px]"
              :placeholder="['Дата с', 'Дата по']"
              @change="(v) => syncPeriod(v, (p) => { pointsFilter.period = p }, pointsFilter.period, 'month')"
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

      <!-- ── Начисления ──────────────────────────────────────────────────── -->
      <a-tab-pane key="accruals" tab="Начисления">
        <section class="detail-card lotax-card">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="lotax-section-title">История начисления баллов</h2>
              <p class="lotax-caption mt-1">Только плюсы (начисления)</p>
            </div>
            <a-button
              class="lotax-btn-secondary"
              :loading="accrualsLoading"
              @click="() => { accrualsPag.current = 1; loadAccruals() }"
            >
              Обновить
            </a-button>
          </div>

          <div class="mb-4 flex flex-wrap gap-2">
            <a-select
              v-model:value="accrualsFilter.points_type"
              size="middle"
              class="!w-36"
              :options="[
                { value: 'all', label: 'Все типы' },
                { value: 'system', label: 'Система' },
                { value: 'park', label: 'Парк' },
              ]"
            />
            <a-select
              v-model:value="accrualsFilter.period"
              size="middle"
              class="!w-40"
              :options="periodOptions"
            />
            <a-range-picker
              v-model:value="accrualsRange"
              allow-clear
              format="DD.MM.YYYY"
              class="!w-[260px]"
              :placeholder="['Дата с', 'Дата по']"
              @change="(v) => syncPeriod(v, (p) => { accrualsFilter.period = p }, accrualsFilter.period, 'month')"
            />
          </div>

          <div v-if="accrualsEarned != null" class="mb-4">
            <div class="inline-flex rounded-xl bg-green-50 px-4 py-3">
              <div>
                <p class="text-[12px] text-ink-muted">Начислено</p>
                <p class="text-[20px] font-bold tabular-nums text-green-700">+{{ accrualsEarned }}</p>
              </div>
            </div>
          </div>

          <a-table
            row-key="id"
            :columns="accrualsColumns"
            :data-source="accrualsItems"
            :loading="accrualsLoading"
            :pagination="accrualsPag"
            :scroll="{ x: 780 }"
            :locale="{ emptyText: ' ' }"
            @change="(pag: { current?: number; pageSize?: number }) => {
              accrualsPag.current = pag.current ?? 1
              accrualsPag.pageSize = pag.pageSize ?? 20
              loadAccruals()
            }"
          >
            <template #emptyText>
              <div class="flex flex-col items-center gap-2 py-10">
                <p class="text-[15px] font-medium text-ink">Начислений пока нет</p>
              </div>
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'date'">
                {{ accrualsItemDate(record as DriverPointsAccrualItem) }}
              </template>
              <template v-else-if="column.key === 'points_type'">
                {{ pointsTypeRu((record as DriverPointsAccrualItem).points_type) }}
              </template>
              <template v-else-if="column.key === 'amount'">
                <span class="tabular-nums font-semibold text-green-600">
                  +{{ Math.abs((record as DriverPointsAccrualItem).amount) }}
                </span>
              </template>
              <template v-else-if="column.key === 'source'">
                {{
                  [
                    (record as DriverPointsAccrualItem).source,
                    (record as DriverPointsAccrualItem).tx_type,
                  ].filter(Boolean).join(' · ') || (record as DriverPointsAccrualItem).description || '—'
                }}
              </template>
              <template v-else-if="column.key === 'balance_after'">
                <span class="tabular-nums text-ink-muted">
                  {{ (record as DriverPointsAccrualItem).balance_after ?? '—' }}
                </span>
              </template>
              <template v-else-if="column.key === 'park_name'">
                {{ (record as DriverPointsAccrualItem).park_name || '—' }}
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
                size="middle"
                class="!w-40"
                :options="periodOptions"
              />
              <a-range-picker
                v-model:value="rhRange"
                allow-clear
                format="DD.MM.YYYY"
                class="!w-[260px]"
                :placeholder="['Дата с', 'Дата по']"
                @change="(v) => syncPeriod(v, (p) => { rhPeriod = p }, rhPeriod, 'month')"
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
                size="middle"
                class="!w-44"
                :options="taskStatusOptions"
              />
              <a-select
                v-model:value="thPeriod"
                size="middle"
                class="!w-40"
                :options="periodOptions"
              />
              <a-range-picker
                v-model:value="thRange"
                allow-clear
                format="DD.MM.YYYY"
                class="!w-[260px]"
                :placeholder="['Дата с', 'Дата по']"
                @change="(v) => syncPeriod(v, (p) => { thPeriod = p }, thPeriod, 'month')"
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
                {{ (record as DriverTaskHistoryItem).title || (record as DriverTaskHistoryItem).task_title || '—' }}
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
      <a-tab-pane v-if="tiersEnabled" key="tier" tab="Уровень">
        <section class="detail-card lotax-card">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 class="lotax-section-title">История изменений уровня</h2>
            <div class="flex flex-wrap gap-2">
              <a-select
                v-model:value="tierHistPeriod"
                size="middle"
                class="!w-40"
                :options="periodOptions"
              />
              <a-range-picker
                v-model:value="tierHistRange"
                allow-clear
                format="DD.MM.YYYY"
                class="!w-[260px]"
                :placeholder="['Дата с', 'Дата по']"
                @change="(v) => syncPeriod(v, (p) => { tierHistPeriod = p }, tierHistPeriod, 'month')"
              />
              <a-button
                class="lotax-btn-secondary"
                :loading="tierHistLoading"
                @click="() => { tierHistPag.current = 1; loadTierHistory() }"
              >
                Обновить
              </a-button>
            </div>
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

      <!-- ── Yandex: Заказы ───────────────────────────────────────────────── -->
      <a-tab-pane key="yx-orders" tab="Заказы">
        <section class="detail-card lotax-card">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="lotax-section-title">Заказы Yandex</h2>
              <p class="lotax-caption mt-1">Живые данные · по умолчанию 7 дней</p>
            </div>
            <a-button
              class="lotax-btn-secondary"
              :loading="yxOrdersLoading"
              @click="loadYandexOrders(false)"
            >
              Обновить
            </a-button>
          </div>

          <div class="mb-4 flex flex-wrap items-center gap-2">
            <a-select v-model:value="yxPeriod" size="middle" class="!w-36" :options="periodOptions" />
            <a-range-picker
              v-model:value="yxRange"
              allow-clear
              format="DD.MM.YYYY"
              class="!w-[260px]"
              :placeholder="['Дата с', 'Дата по']"
              @change="(v) => syncPeriod(v, (p) => { yxPeriod = p }, yxPeriod, 'week')"
            />
            <a-time-picker
              v-model:value="yxTimeFrom"
              format="HH:mm"
              placeholder="Время с"
              class="!w-28"
            />
            <a-time-picker
              v-model:value="yxTimeTo"
              format="HH:mm"
              placeholder="Время по"
              class="!w-28"
            />
            <a-select
              v-model:value="yxOrdersFilter.timeField"
              size="middle"
              class="!w-44"
              :options="yxTimeFieldOptions"
            />
            <a-select
              v-model:value="yxOrdersFilter.statuses"
              mode="multiple"
              allow-clear
              size="middle"
              class="!min-w-40"
              placeholder="Статусы"
              :options="yxOrderStatusOptions"
            />
            <a-select
              v-model:value="yxOrdersFilter.paymentMethods"
              mode="multiple"
              allow-clear
              size="middle"
              class="!min-w-36"
              placeholder="Оплата"
              :options="yxPaymentOptions"
            />
            <a-select
              v-model:value="yxOrdersFilter.categories"
              mode="tags"
              size="middle"
              class="!min-w-36"
              placeholder="Категории"
            />
            <a-select
              v-model:value="yxOrdersFilter.orderTypes"
              mode="tags"
              size="middle"
              class="!min-w-32"
              placeholder="Тип заказа"
            />
          </div>

          <div
            v-if="yxOrdersError"
            class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700"
          >
            {{ yxOrdersError }}
          </div>

          <a-table
            v-else
            row-key="id"
            :columns="yxOrderColumns"
            :data-source="yxOrders"
            :loading="yxOrdersLoading"
            :pagination="false"
            :scroll="{ x: 720 }"
            :locale="{ emptyText: ' ' }"
          >
            <template #emptyText>
              <div class="flex flex-col items-center gap-2 py-10">
                <p class="text-[15px] font-medium text-ink">Заказов за период нет</p>
              </div>
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'short_id'">
                {{ yxField(record, 'short_id', 'order_id', 'id') }}
              </template>
              <template v-else-if="column.key === 'status'">
                {{ yxField(record, 'status') }}
              </template>
              <template v-else-if="column.key === 'booked_at'">
                {{ yxWhen(record, 'booked_at', 'created_at') }}
              </template>
              <template v-else-if="column.key === 'ended_at'">
                {{ yxWhen(record, 'ended_at') }}
              </template>
              <template v-else-if="column.key === 'category'">
                {{ yxField(record, 'category') }}
              </template>
              <template v-else-if="column.key === 'payment_method'">
                {{ yxField(record, 'payment_method') }}
              </template>
              <template v-else-if="column.key === 'order_type'">
                {{ yxField(record, 'order_type') }}
              </template>
              <template v-else-if="column.key === 'pickup'">
                {{ yxField(record, 'pickup', 'address_from') }}
              </template>
              <template v-else-if="column.key === 'dropoff'">
                {{ yxField(record, 'dropoff', 'address_to') }}
              </template>
              <template v-else-if="column.key === 'car'">
                {{
                  [yxField(record, 'car'), yxField(record, 'car_number')]
                    .filter((part) => part !== '—')
                    .join(' · ') || '—'
                }}
              </template>
              <template v-else-if="column.key === 'price'">
                <span class="tabular-nums">
                  {{
                    (record as YandexLiveOrderItem).price != null
                      ? `${(record as YandexLiveOrderItem).price} ${(record as YandexLiveOrderItem).currency || ''}`
                      : '—'
                  }}
                </span>
              </template>
            </template>
          </a-table>

          <div v-if="yxOrdersCursor && !yxOrdersError" class="mt-4 flex justify-center">
            <a-button
              class="lotax-btn-secondary"
              :loading="yxOrdersLoading"
              @click="loadYandexOrders(true)"
            >
              Загрузить ещё
            </a-button>
          </div>
        </section>
      </a-tab-pane>

      <!-- ── Yandex: Ведомость ────────────────────────────────────────────── -->
      <a-tab-pane key="yx-statement" tab="Ведомость">
        <section class="detail-card lotax-card">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="lotax-section-title">Ведомость Yandex</h2>
              <p class="lotax-caption mt-1">Живые данные · по умолчанию 7 дней</p>
            </div>
            <a-button
              class="lotax-btn-secondary"
              :loading="yxStatementLoading"
              @click="loadYandexStatement(false)"
            >
              Обновить
            </a-button>
          </div>

          <div class="mb-4 flex flex-wrap items-center gap-2">
            <a-select v-model:value="yxPeriod" size="middle" class="!w-36" :options="periodOptions" />
            <a-range-picker
              v-model:value="yxRange"
              allow-clear
              format="DD.MM.YYYY"
              class="!w-[260px]"
              :placeholder="['Дата с', 'Дата по']"
              @change="(v) => syncPeriod(v, (p) => { yxPeriod = p }, yxPeriod, 'week')"
            />
            <a-time-picker v-model:value="yxTimeFrom" format="HH:mm" placeholder="Время с" class="!w-28" />
            <a-time-picker v-model:value="yxTimeTo" format="HH:mm" placeholder="Время по" class="!w-28" />
            <a-select
              v-model:value="yxStatementFilter.categoryIds"
              mode="tags"
              size="middle"
              class="!min-w-40"
              placeholder="ID категорий"
            />
            <a-input
              v-model:value="yxStatementFilter.order"
              allow-clear
              size="middle"
              class="!w-36"
              placeholder="№ заказа"
            />
            <label class="flex items-center gap-2 text-[13px] text-ink-muted">
              <a-switch v-model:checked="yxStatementFilter.exceptCash" size="small" />
              Без наличных и ожидания
            </label>
          </div>

          <div
            v-if="yxStatementError"
            class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700"
          >
            {{ yxStatementError }}
          </div>

          <div v-if="yxStatementSummary && !yxStatementError" class="mb-4 flex flex-wrap gap-2">
            <div class="rounded-xl bg-green-50 px-4 py-3">
              <p class="text-[12px] text-ink-muted">Начислено</p>
              <p class="text-[18px] font-bold tabular-nums text-green-700">{{ yxStatementSummary.earned ?? '—' }}</p>
            </div>
            <div class="rounded-xl bg-red-50 px-4 py-3">
              <p class="text-[12px] text-ink-muted">Списано</p>
              <p class="text-[18px] font-bold tabular-nums text-red-700">{{ yxStatementSummary.spent ?? '—' }}</p>
            </div>
            <div class="rounded-xl bg-surface px-4 py-3 ring-1 ring-line">
              <p class="text-[12px] text-ink-muted">Итого</p>
              <p class="text-[18px] font-bold tabular-nums">{{ yxStatementSummary.net ?? '—' }}</p>
            </div>
          </div>

          <a-table
            v-if="!yxStatementError"
            row-key="id"
            :columns="yxStatementColumns"
            :data-source="yxStatement"
            :loading="yxStatementLoading"
            :pagination="false"
            :scroll="{ x: 700 }"
            :locale="{ emptyText: ' ' }"
          >
            <template #emptyText>
              <div class="flex flex-col items-center gap-2 py-10">
                <p class="text-[15px] font-medium text-ink">Записей в ведомости нет</p>
              </div>
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'event_at'">
                {{
                  ((record as YandexLiveStatementItem).event_at ||
                    (record as YandexLiveStatementItem).created_at)
                    ? dayjs(
                        ((record as YandexLiveStatementItem).event_at ||
                          (record as YandexLiveStatementItem).created_at) as string,
                      ).format('DD.MM.YYYY HH:mm')
                    : '—'
                }}
              </template>
              <template v-else-if="column.key === 'category'">
                {{
                  (record as YandexLiveStatementItem).category_name ||
                  (record as YandexLiveStatementItem).category_id ||
                  '—'
                }}
              </template>
              <template v-else-if="column.key === 'amount'">
                <span class="tabular-nums">
                  {{
                    (record as YandexLiveStatementItem).amount != null
                      ? `${(record as YandexLiveStatementItem).amount} ${(record as YandexLiveStatementItem).currency || ''}`
                      : '—'
                  }}
                </span>
              </template>
              <template v-else-if="column.key === 'order_short_id'">
                {{ yxField(record, 'order_short_id') }}
              </template>
              <template v-else-if="column.key === 'description'">
                {{ (record as YandexLiveStatementItem).description || '—' }}
              </template>
            </template>
          </a-table>

          <div v-if="yxStatementCursor && !yxStatementError" class="mt-4 flex justify-center">
            <a-button
              class="lotax-btn-secondary"
              :loading="yxStatementLoading"
              @click="loadYandexStatement(true)"
            >
              Загрузить ещё
            </a-button>
          </div>
        </section>
      </a-tab-pane>

      <!-- ── Yandex: Заработок ────────────────────────────────────────────── -->
      <a-tab-pane key="yx-earnings" tab="Заработок">
        <section class="detail-card lotax-card">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="lotax-section-title">Заработок Yandex</h2>
              <p class="lotax-caption mt-1">Живые данные · по умолчанию 7 дней</p>
            </div>
            <a-button
              class="lotax-btn-secondary"
              :loading="yxEarningsLoading"
              @click="loadYandexEarnings(false)"
            >
              Обновить
            </a-button>
          </div>

          <div class="mb-4 flex flex-wrap items-center gap-2">
            <a-select v-model:value="yxPeriod" size="middle" class="!w-36" :options="periodOptions" />
            <a-range-picker
              v-model:value="yxRange"
              allow-clear
              format="DD.MM.YYYY"
              class="!w-[260px]"
              :placeholder="['Дата с', 'Дата по']"
              @change="(v) => syncPeriod(v, (p) => { yxPeriod = p }, yxPeriod, 'week')"
            />
            <a-time-picker v-model:value="yxTimeFrom" format="HH:mm" placeholder="Время с" class="!w-28" />
            <a-time-picker v-model:value="yxTimeTo" format="HH:mm" placeholder="Время по" class="!w-28" />
            <a-select
              v-model:value="yxEarningsFilter.timeField"
              size="middle"
              class="!w-44"
              :options="yxTimeFieldOptions"
            />
            <a-select
              v-model:value="yxEarningsFilter.statuses"
              mode="multiple"
              allow-clear
              size="middle"
              class="!min-w-40"
              placeholder="Статусы"
              :options="yxOrderStatusOptions"
            />
          </div>

          <div
            v-if="yxEarningsError"
            class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700"
          >
            {{ yxEarningsError }}
          </div>

          <div v-if="yxEarningsSummary && !yxEarningsError" class="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3">
            <div class="rounded-xl bg-surface px-4 py-3 ring-1 ring-line">
              <p class="text-[12px] text-ink-muted">Заказы</p>
              <p class="text-[18px] font-bold tabular-nums">{{ yxEarningsSummary.orders_total ?? '—' }}</p>
            </div>
            <div class="rounded-xl bg-surface px-4 py-3 ring-1 ring-line">
              <p class="text-[12px] text-ink-muted">Завершено</p>
              <p class="text-[18px] font-bold tabular-nums">{{ yxEarningsSummary.completed_orders ?? '—' }}</p>
            </div>
            <div class="rounded-xl bg-surface px-4 py-3 ring-1 ring-line">
              <p class="text-[12px] text-ink-muted">Отменено</p>
              <p class="text-[18px] font-bold tabular-nums">{{ yxEarningsSummary.cancelled_orders ?? '—' }}</p>
            </div>
            <div class="rounded-xl bg-surface px-4 py-3 ring-1 ring-line">
              <p class="text-[12px] text-ink-muted">Сумма поездок</p>
              <p class="text-[18px] font-bold tabular-nums">{{ yxEarningsSummary.fare_sum ?? '—' }}</p>
            </div>
            <div class="rounded-xl bg-surface px-4 py-3 ring-1 ring-line">
              <p class="text-[12px] text-ink-muted">Операции</p>
              <p class="text-[18px] font-bold tabular-nums">{{ yxEarningsSummary.transactions_total ?? '—' }}</p>
            </div>
            <div class="rounded-xl bg-surface px-4 py-3 ring-1 ring-line">
              <p class="text-[12px] text-ink-muted">Сумма операций</p>
              <p class="text-[18px] font-bold tabular-nums">{{ yxEarningsSummary.transactions_sum ?? '—' }}</p>
            </div>
          </div>

          <a-table
            v-if="yxEarningsSummary?.by_category?.length && !yxEarningsError"
            class="mb-4"
            row-key="category_id"
            :pagination="false"
            :data-source="yxEarningsSummary.by_category"
            :columns="[
              { title: 'Категория', dataIndex: 'category_name', key: 'category_name' },
              { title: 'Сумма', dataIndex: 'amount', key: 'amount', width: 120 },
              { title: 'Кол-во', dataIndex: 'count', key: 'count', width: 100 },
            ]"
          />

          <a-table
            v-if="!yxEarningsError"
            row-key="id"
            :columns="yxEarningsColumns"
            :data-source="yxEarnings"
            :loading="yxEarningsLoading"
            :pagination="false"
            :scroll="{ x: 620 }"
            :locale="{ emptyText: ' ' }"
          >
            <template #emptyText>
              <div class="flex flex-col items-center gap-2 py-10">
                <p class="text-[15px] font-medium text-ink">Данных о заработке нет</p>
              </div>
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'period'">
                {{
                  (record as YandexLiveEarningsItem).date
                    ? dayjs((record as YandexLiveEarningsItem).date as string).format('DD.MM.YYYY')
                    : [
                        (record as YandexLiveEarningsItem).period_from
                          ? dayjs((record as YandexLiveEarningsItem).period_from as string).format('DD.MM')
                          : null,
                        (record as YandexLiveEarningsItem).period_to
                          ? dayjs((record as YandexLiveEarningsItem).period_to as string).format('DD.MM.YYYY')
                          : null,
                      ].filter(Boolean).join(' – ') || '—'
                }}
              </template>
              <template v-else-if="column.key === 'gross'">
                <span class="tabular-nums">{{ (record as YandexLiveEarningsItem).gross ?? '—' }}</span>
              </template>
              <template v-else-if="column.key === 'commission'">
                <span class="tabular-nums">{{ (record as YandexLiveEarningsItem).commission ?? '—' }}</span>
              </template>
              <template v-else-if="column.key === 'net'">
                <span class="tabular-nums font-semibold">
                  {{ (record as YandexLiveEarningsItem).net ?? '—' }}
                  <span class="text-[11px] font-normal text-ink-muted">
                    {{ (record as YandexLiveEarningsItem).currency || '' }}
                  </span>
                </span>
              </template>
            </template>
          </a-table>

          <div v-if="yxEarningsCursor && !yxEarningsError" class="mt-4 flex justify-center">
            <a-button
              class="lotax-btn-secondary"
              :loading="yxEarningsLoading"
              @click="loadYandexEarnings(true)"
            >
              Загрузить ещё
            </a-button>
          </div>
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

.driver-tabs :deep(.ant-tabs-nav-wrap) {
  overflow: visible;
}

.driver-tabs :deep(.ant-tabs-nav-list) {
  flex-wrap: wrap;
  transform: none !important;
}

.driver-tabs :deep(.ant-tabs-nav-operations) {
  display: none;
}
</style>
