<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  CalendarOutlined,
  EditOutlined,
  EyeOutlined,
  FieldTimeOutlined,
  GiftOutlined,
  LeftOutlined,
  SafetyCertificateOutlined,
  StarOutlined,
  StopOutlined,
  TrophyOutlined,
  WalletOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useDriversStore } from '@/stores/drivers'
import {
  driverStatusLabel,
  driverTierLabel,
  extractErrorMessage,
} from '@/utils/labels'
import type { DriverStatus } from '@/types/api'
import StatusBadge from '@/components/StatusBadge.vue'
import TierBadge from '@/components/TierBadge.vue'
import KpiCard from '@/components/KpiCard.vue'
import CopyableId from '@/components/CopyableId.vue'
import InfoField from '@/components/InfoField.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const drivers = useDriversStore()

const driverId = computed(() => route.params.id as string)
const balanceOpen = ref(false)
const statusOpen = ref(false)
const pdnLoading = ref(false)

const balanceForm = reactive({
  balance_system_points: undefined as number | undefined,
  balance_park_points: undefined as number | undefined,
})

const statusForm = reactive<{ status: DriverStatus }>({
  status: 'active',
})

const initials = computed(() => {
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
  try {
    await drivers.fetchById(driverId.value)
    if (drivers.current) {
      balanceForm.balance_system_points = drivers.current.balance_system_points
      balanceForm.balance_park_points = drivers.current.balance_park_points
      statusForm.status = drivers.current.status
    }
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

async function loadPdn() {
  if (!auth.canViewPdn) {
    message.warning('Доступно только директору')
    return
  }
  pdnLoading.value = true
  try {
    await drivers.fetchPersonalData(driverId.value)
    message.success('ПДн загружены (событие записано в аудит-лог)')
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    pdnLoading.value = false
  }
}

async function saveBalance() {
  if (
    balanceForm.balance_system_points == null &&
    balanceForm.balance_park_points == null
  ) {
    message.warning('Укажите хотя бы одно поле баланса')
    return
  }
  try {
    await drivers.updateBalance(driverId.value, {
      balance_system_points: balanceForm.balance_system_points ?? null,
      balance_park_points: balanceForm.balance_park_points ?? null,
    })
    message.success('Баланс обновлён')
    balanceOpen.value = false
  } catch (e) {
    message.error(extractErrorMessage(e))
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
          {{ drivers.current.display_name || 'Водитель' }}
        </h1>
      </div>

      <div
        v-if="auth.canViewPdn || auth.canEditBalance || auth.canEditStatus"
        class="driver-actions"
      >
        <a-button
          v-if="auth.canEditBalance"
          type="primary"
          class="driver-btn driver-btn--primary"
          @click="balanceOpen = true"
        >
          <template #icon><WalletOutlined /></template>
          Изменить баланс
        </a-button>
        <a-button
          v-if="auth.canViewPdn"
          class="driver-btn driver-btn--secondary"
          :loading="pdnLoading"
          @click="loadPdn"
        >
          <template #icon><EyeOutlined /></template>
          Показать ПДн
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
          v-if="auth.canEditStatus && drivers.current.status !== 'blocked'"
          class="driver-btn driver-btn--danger"
          @click="confirmBlock"
        >
          <template #icon><StopOutlined /></template>
          Заблокировать
        </a-button>
      </div>
    </header>

    <!-- Summary -->
    <section class="summary-card">
      <!-- 1. Identity -->
      <div class="summary-card__identity">
        <div class="summary-card__avatar" aria-hidden="true">{{ initials }}</div>
        <div class="summary-card__meta">
          <h2 class="summary-card__name">
            {{ drivers.current.display_name || 'Водитель' }}
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
          <p class="summary-meta__value">
            {{ dayjs(drivers.current.created_at).format('DD.MM.YYYY HH:mm') }}
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

      <!-- 4. Balance widget -->
      <div class="balance-widget">
        <div class="balance-widget__head">
          <span class="balance-widget__title-icon" aria-hidden="true">
            <WalletOutlined />
          </span>
          <p class="balance-widget__title">Баланс</p>
        </div>

        <div class="balance-widget__grid">
          <div class="balance-mini">
            <div class="balance-mini__icon balance-mini__icon--system" aria-hidden="true">
              <StarOutlined />
            </div>
            <p class="balance-mini__label">System</p>
            <p class="balance-mini__value">
              {{ drivers.current.balance_system_points }}
            </p>
          </div>

          <div class="balance-widget__divider" aria-hidden="true" />

          <div class="balance-mini">
            <div class="balance-mini__icon balance-mini__icon--park" aria-hidden="true">
              <TrophyOutlined />
            </div>
            <p class="balance-mini__label">Park</p>
            <p class="balance-mini__value">
              {{ drivers.current.balance_park_points }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Statistics -->
    <section class="driver-detail__section">
      <h2 class="lotax-section-title mb-4 md:mb-6">Статистика</h2>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
        <KpiCard
          title="Системные баллы"
          :value="drivers.current.balance_system_points"
          hint="Всего начислено"
          tone="blue"
        >
          <template #icon><StarOutlined /></template>
        </KpiCard>
        <KpiCard
          title="Баллы парка"
          :value="drivers.current.balance_park_points"
          hint="Всего начислено"
          tone="green"
        >
          <template #icon><TrophyOutlined /></template>
        </KpiCard>
        <KpiCard
          title="Уровень"
          :value="driverTierLabel[drivers.current.tier]"
          hint="Текущий уровень"
          tone="orange"
        >
          <template #icon><SafetyCertificateOutlined /></template>
        </KpiCard>
        <KpiCard
          title="Статус"
          :value="driverStatusLabel[drivers.current.status]"
          hint="Текущий статус"
          tone="amber"
        >
          <template #icon><FieldTimeOutlined /></template>
        </KpiCard>
      </div>
    </section>

    <!-- Information -->
    <section class="driver-detail__section info-grid">
      <div class="detail-card">
        <h2 class="lotax-section-title mb-6">Профиль</h2>
        <div class="profile-fields">
          <InfoField label="Имя (маска)" :value="drivers.current.first_name_masked" />
          <InfoField label="Фамилия (маска)" :value="drivers.current.last_name_masked" />
          <InfoField label="Телефон (маска)" :value="drivers.current.phone_masked" />
          <InfoField label="Реферал" :value="drivers.current.referral_code" />
          <InfoField
            label="Создан"
            :value="dayjs(drivers.current.created_at).format('DD.MM.YYYY HH:mm')"
          />
        </div>
      </div>

      <div class="detail-card">
        <h2 class="lotax-section-title mb-6">Yandex IDs</h2>
        <div class="flex flex-col gap-6">
          <CopyableId label="Driver ID" :value="drivers.current.yandex_driver_id" />
          <CopyableId label="Park ID" :value="drivers.current.yandex_park_id" />
        </div>
      </div>
    </section>

    <!-- Personal data -->
    <section
      v-if="drivers.personalData"
      class="detail-card detail-card--pdn overflow-hidden !p-0"
    >
      <div class="border-b border-amber-100 bg-amber-50/70 px-5 py-5 md:px-7">
        <h2 class="lotax-section-title">Персональные данные</h2>
        <p class="lotax-caption mt-1">
          Доступ к ПДн аудируется. Используйте только по необходимости.
        </p>
      </div>
      <div class="profile-fields p-5 md:p-7">
        <InfoField label="Имя" :value="drivers.personalData.first_name" />
        <InfoField label="Фамилия" :value="drivers.personalData.last_name" />
        <InfoField label="Отчество" :value="drivers.personalData.middle_name" />
        <InfoField label="Телефон" :value="drivers.personalData.phone" />
        <InfoField label="Display name" :value="drivers.personalData.display_name" />
      </div>
    </section>

    <a-modal
      v-model:open="balanceOpen"
      title="Изменить баланс"
      ok-text="Сохранить"
      cancel-text="Отмена"
      centered
      :width="440"
      @ok="saveBalance"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Системные баллы">
          <a-input-number
            v-model:value="balanceForm.balance_system_points"
            class="!w-full"
            size="large"
            :min="0"
          />
        </a-form-item>
        <a-form-item label="Баллы парка">
          <a-input-number
            v-model:value="balanceForm.balance_park_points"
            class="!w-full"
            size="large"
            :min="0"
          />
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
    grid-template-columns: 1fr 1fr;
    gap: 28px;
  }

  .summary-card > .balance-widget {
    grid-column: 1 / -1;
  }
}

@media (min-width: 1200px) {
  .summary-card {
    grid-template-columns: minmax(220px, 1.2fr) minmax(140px, 0.7fr) minmax(120px, 0.7fr) minmax(280px, 1.4fr);
    gap: 28px;
    align-items: center;
  }

  .summary-card > .balance-widget {
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

.summary-meta__value--code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: 0.02em;
}

.balance-widget {
  padding: 20px;
  border-radius: 18px;
  background: #f8f9fb;
  border: 1px solid #ececec;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .balance-widget:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  }
}

.balance-widget__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.balance-widget__title-icon {
  display: inline-flex;
  color: #f7931a;
  font-size: 16px;
}

.balance-widget__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

.balance-widget__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 480px) {
  .balance-widget__grid {
    grid-template-columns: 1fr auto 1fr;
    align-items: stretch;
    gap: 0;
  }
}

.balance-widget__divider {
  display: none;
}

@media (min-width: 480px) {
  .balance-widget__divider {
    display: block;
    width: 1px;
    margin: 4px 16px;
    background: #ececec;
  }
}

.balance-mini {
  min-width: 0;
  padding: 4px 0;
}

.balance-mini__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-bottom: 10px;
  border-radius: 12px;
  font-size: 16px;
}

.balance-mini__icon--system {
  background: #eef4ff;
  color: #3b82f6;
}

.balance-mini__icon--park {
  background: #ecfdf3;
  color: #22c55e;
}

.balance-mini__label {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
}

.balance-mini__value {
  margin: 0;
  font-size: clamp(2rem, 1.7rem + 0.8vw, 2.75rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  color: #111111;
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

.detail-card--pdn:hover {
  transform: none;
}
</style>
