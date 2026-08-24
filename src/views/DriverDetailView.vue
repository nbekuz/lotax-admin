<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloudSyncOutlined,
  EditOutlined,
  GiftOutlined,
  LeftOutlined,
  StarOutlined,
  StopOutlined,
  TrophyOutlined,
  WalletOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useDriversStore } from '@/stores/drivers'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage, formatPhone, isForbiddenError, tierLabel } from '@/utils/labels'
import type { DriverRideItem, DriverStatus, DriverTier } from '@/types/api'
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
const pdnLoading = ref(false)
const pdnError = ref<string | null>(null)
const adjustSaving = ref(false)
const tierSaving = ref(false)
const syncingRides = ref(false)

const ridesPagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (total: number) => `Всего: ${total}`,
})

const rideColumns = [
  { title: 'Дата', key: 'ride_date', dataIndex: 'ride_date', width: 150 },
  { title: 'Откуда', key: 'pickup_address', dataIndex: 'pickup_address', ellipsis: true },
  { title: 'Куда', key: 'dropoff_address', dataIndex: 'dropoff_address', ellipsis: true },
  { title: 'Сумма', key: 'fare_amount', dataIndex: 'fare_amount', width: 110, align: 'right' as const },
  { title: 'Сист.', key: 'points_system_earned', dataIndex: 'points_system_earned', width: 80, align: 'right' as const },
  { title: 'Парк', key: 'points_park_earned', dataIndex: 'points_park_earned', width: 80, align: 'right' as const },
]

const adjustForm = reactive({
  amount: 0,
  description: '',
})

const statusForm = reactive<{ status: DriverStatus }>({
  status: 'active',
})

const tierForm = reactive({
  tier: 'bronze' as DriverTier,
  reason: '',
})
const tierExpiresAt = ref<Dayjs | undefined>(undefined)

const tierOptions = [
  { value: 'bronze', label: tierLabel.bronze },
  { value: 'silver', label: tierLabel.silver },
  { value: 'gold', label: tierLabel.gold },
  { value: 'platinum', label: tierLabel.platinum },
]

const displayTitle = computed(() => {
  return (
    drivers.personalData?.display_name ||
    drivers.current?.display_name ||
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
  const fromName = (d.display_name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('')
  if (fromName) return fromName
  return (d.first_name_masked?.[0] || 'D').toUpperCase()
})

async function load() {
  pdnError.value = null
  activeTab.value = 'profile'
  try {
    await drivers.fetchById(driverId.value)
    if (drivers.current) {
      statusForm.status = drivers.current.status
    }

    if (auth.canViewPdn) {
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
  } catch (e) {
    if (isForbiddenError(e)) {
      message.error('Нет доступа к данным водителей')
      router.replace(auth.homePath)
      return
    }
    message.error(extractErrorMessage(e))
  }
}

async function loadRides() {
  try {
    await drivers.fetchRides(driverId.value, {
      page: ridesPagination.current,
      page_size: ridesPagination.pageSize,
    })
    ridesPagination.total = drivers.ridesTotal
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function onTabChange(key: string | number) {
  if (key === 'rides' && !drivers.rides.length && !drivers.ridesLoading) {
    ridesPagination.current = 1
    void loadRides()
  }
}

function onRidesTableChange(pag: { current?: number; pageSize?: number }) {
  ridesPagination.current = pag.current ?? 1
  ridesPagination.pageSize = pag.pageSize ?? 20
  void loadRides()
}

async function syncRidesFromDetail() {
  syncingRides.value = true
  try {
    const result = await drivers.syncRides(org.selectedParkId)
    message.success(result.message)
    window.setTimeout(() => {
      void loadRides()
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
      expires_at: tierExpiresAt.value
        ? tierExpiresAt.value.toISOString()
        : null,
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

onMounted(load)

watch(driverId, () => {
  load()
})
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
        v-if="auth.canAdjustPoints || auth.canEditStatus || auth.canAdjustTier"
        class="driver-actions"
      >
        <a-button
          v-if="auth.canAdjustPoints"
          type="primary"
          class="driver-btn driver-btn--primary"
          @click="balanceOpen = true"
        >
          <template #icon><WalletOutlined /></template>
          Изменить баланс
        </a-button>
        <a-button
          v-if="auth.canAdjustTier"
          class="driver-btn driver-btn--secondary"
          @click="openTierModal"
        >
          <template #icon><TrophyOutlined /></template>
          Изменить уровень
        </a-button>
        <a-button
          v-if="auth.canEditStatus && drivers.current.status === 'pending'"
          type="primary"
          class="driver-btn driver-btn--primary"
          @click="confirmActivate"
        >
          <template #icon><CheckCircleOutlined /></template>
          Активировать
        </a-button>
        <a-button
          v-if="auth.canEditStatus"
          class="driver-btn driver-btn--secondary"
          @click="statusOpen = true"
        >
          <template #icon><EditOutlined /></template>
          Изменить статус
        </a-button>
        <a-button
          v-if="auth.canEditStatus && drivers.current.status !== 'blocked' && drivers.current.status !== 'pending'"
          class="driver-btn driver-btn--danger"
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
      Водитель ожидает активации директором. Пока статус «ожидает», вход в приложение,
      поездки и баллы недоступны.
    </div>

    <!-- Summary -->
    <section class="summary-card">
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

      <!-- 4. Balance — same visual language as meta blocks -->
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

    <!-- Tabs: profile / rides -->
    <a-tabs v-model:activeKey="activeTab" class="driver-tabs" @change="onTabChange">
      <a-tab-pane key="profile" tab="Профиль">
        <section class="driver-detail__section info-grid">
          <div class="detail-card">
            <div class="mb-6 flex flex-col gap-1">
              <h2 class="lotax-section-title">Профиль</h2>
              <p v-if="auth.canViewPdn" class="lotax-caption">
                Полные ПДн · доступ аудируется
              </p>
              <p v-else class="lotax-caption">
                Персональные данные показаны в маскированном виде
              </p>
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

            <div v-else-if="auth.canViewPdn && drivers.personalData" class="profile-fields">
              <InfoField label="Имя" :value="drivers.personalData.first_name" />
              <InfoField label="Фамилия" :value="drivers.personalData.last_name" />
              <InfoField label="Отчество" :value="drivers.personalData.middle_name" />
              <InfoField label="Телефон" :value="formatPhone(drivers.personalData.phone)" />
              <InfoField label="Отображаемое имя" :value="drivers.personalData.display_name" />
              <InfoField label="Реферал" :value="drivers.current.referral_code" />
              <InfoField
                label="Создан"
                :value="dayjs(drivers.current.created_at).format('DD.MM.YYYY HH:mm')"
              />
            </div>

            <div v-else class="profile-fields">
              <InfoField label="Имя (маска)" :value="drivers.current.first_name_masked" />
              <InfoField label="Фамилия (маска)" :value="drivers.current.last_name_masked" />
              <InfoField label="Телефон (маска)" :value="formatPhone(drivers.current.phone_masked)" />
              <InfoField label="Реферал" :value="drivers.current.referral_code" />
              <InfoField
                label="Создан"
                :value="dayjs(drivers.current.created_at).format('DD.MM.YYYY HH:mm')"
              />
            </div>
          </div>

          <div class="detail-card">
            <h2 class="lotax-section-title mb-6">ID Яндекс</h2>
            <div class="flex flex-col gap-6">
              <CopyableId label="ID водителя" :value="drivers.current.yandex_driver_id" />
              <CopyableId label="ID парка" :value="drivers.current.yandex_park_id" />
            </div>
          </div>
        </section>
      </a-tab-pane>

      <a-tab-pane key="rides" tab="Поездки">
        <section class="detail-card">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="lotax-section-title">Поездки</h2>
              <p class="lotax-caption mt-1">Данные из Yandex после синхронизации</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <a-button class="lotax-btn-secondary" :loading="drivers.ridesLoading" @click="loadRides">
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

          <a-table
            row-key="id"
            :columns="rideColumns"
            :data-source="drivers.rides"
            :loading="drivers.ridesLoading"
            :pagination="ridesPagination"
            :scroll="{ x: 720 }"
            :locale="{ emptyText: ' ' }"
            @change="onRidesTableChange"
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
                {{ dayjs((record as DriverRideItem).ride_date).format('DD.MM.YYYY HH:mm') }}
              </template>
              <template v-else-if="column.key === 'pickup_address'">
                {{ (record as DriverRideItem).pickup_address || '—' }}
              </template>
              <template v-else-if="column.key === 'dropoff_address'">
                {{ (record as DriverRideItem).dropoff_address || '—' }}
              </template>
              <template v-else-if="column.key === 'fare_amount'">
                <span class="tabular-nums">
                  {{
                    (record as DriverRideItem).fare_amount != null
                      ? `${(record as DriverRideItem).fare_amount} ${(record as DriverRideItem).currency}`
                      : '—'
                  }}
                </span>
              </template>
              <template v-else-if="column.key === 'points_system_earned'">
                <span class="tabular-nums">{{ (record as DriverRideItem).points_system_earned }}</span>
              </template>
              <template v-else-if="column.key === 'points_park_earned'">
                <span class="tabular-nums">{{ (record as DriverRideItem).points_park_earned }}</span>
              </template>
            </template>
          </a-table>
        </section>
      </a-tab-pane>
    </a-tabs>

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
              { value: 'pending', label: 'Ожидает активации' },
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
  border-radius: 12px;
  border: 1px solid #ececec;
  background: #fff;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 180ms ease,
    color 180ms ease,
    border-color 180ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .driver-back:hover {
    background: #f3f4f6;
    color: #111111;
    border-color: #d4d4d8;
  }
}

.driver-detail__eyebrow {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}

.driver-detail__title {
  margin: 0;
  font-size: clamp(1.75rem, 1.4rem + 1.4vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: #111111;
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

.driver-btn {
  height: 44px !important;
  border-radius: 14px !important;
  font-weight: 500 !important;
  padding-inline: 16px !important;
  transition:
    transform 180ms ease,
    background 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease !important;
}

@media (max-width: 767px) {
  .driver-btn {
    width: 100% !important;
  }
}

.driver-btn--primary {
  background: #f7931a !important;
  border-color: #f7931a !important;
  box-shadow: 0 1px 2px rgba(247, 147, 26, 0.25) !important;
}

@media (hover: hover) and (pointer: fine) {
  .driver-btn--primary:hover:not(:disabled) {
    background: #e8860f !important;
    border-color: #e8860f !important;
    transform: translateY(-1px);
  }
}

.driver-btn--secondary {
  background: #fff !important;
  border-color: #ececec !important;
  color: #111111 !important;
}

@media (hover: hover) and (pointer: fine) {
  .driver-btn--secondary:hover:not(:disabled) {
    background: #fafafa !important;
    border-color: #d4d4d8 !important;
    transform: translateY(-1px);
  }
}

.driver-btn--danger {
  background: #fff !important;
  border-color: #fecaca !important;
  color: #ef4444 !important;
}

@media (hover: hover) and (pointer: fine) {
  .driver-btn--danger:hover:not(:disabled) {
    background: #fef2f2 !important;
    border-color: #ef4444 !important;
    transform: translateY(-1px);
  }
}

.detail-card {
  padding: 20px;
  border-radius: 24px;
  background: #fff;
  border: 1px solid #ececec;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.05);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

@media (min-width: 768px) {
  .detail-card {
    padding: 28px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .detail-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.07);
  }
}

.summary-card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: center;
  padding: 24px;
  border-radius: 28px;
  background: #fff;
  border: 1px solid #ececec;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.05);
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
  border-radius: 20px;
  background: linear-gradient(180deg, #ffb000 0%, #f7931a 50%, #e67e00 100%);
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(247, 147, 26, 0.28);
}

.summary-card__name {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #111111;
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
  color: #6b7280;
}

.summary-meta__icon--gift {
  background: #fff4e8;
  color: #f7931a;
}

.summary-meta__body {
  min-width: 0;
}

.summary-meta__label {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}

.summary-meta__value {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #111111;
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
  background: #ececec;
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
  background: #eef4ff;
  color: #3b82f6;
}

.summary-balance__icon--park {
  background: #ecfdf3;
  color: #22c55e;
}

.summary-balance__label {
  margin: 0 0 2px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}

.summary-balance__value {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: #111111;
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
</style>
