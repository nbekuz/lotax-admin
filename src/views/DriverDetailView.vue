<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  ArrowLeftOutlined,
  EditOutlined,
  EyeOutlined,
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
  <div v-if="drivers.current" class="flex flex-col gap-5 md:gap-6 xl:gap-8">
    <!-- Header -->
    <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div class="min-w-0">
        <button
          type="button"
          class="mb-3 inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-[13px] font-medium text-ink-muted transition-all duration-fast md:mb-4 md:hover:bg-white md:hover:text-ink"
          @click="router.push('/drivers')"
        >
          <ArrowLeftOutlined />
          Назад к списку
        </button>
        <h1 class="lotax-page-title break-words">
          {{ drivers.current.display_name || 'Водитель' }}
        </h1>
      </div>

      <div
        v-if="auth.canViewPdn || auth.canEditBalance || auth.canEditStatus"
        class="lotax-actions-mobile lotax-btn-stack rounded-2xl border border-line bg-white p-2 shadow-card md:inline-flex md:w-auto"
      >
        <a-button
          v-if="auth.canViewPdn"
          class="lotax-btn-secondary"
          :loading="pdnLoading"
          @click="loadPdn"
        >
          <template #icon><EyeOutlined /></template>
          Показать ПДн
        </a-button>
        <a-button
          v-if="auth.canEditBalance"
          class="lotax-btn-secondary"
          @click="balanceOpen = true"
        >
          <template #icon><WalletOutlined /></template>
          Изменить баланс
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
          v-if="auth.canEditStatus && drivers.current.status !== 'blocked'"
          class="lotax-btn-danger"
          @click="confirmBlock"
        >
          <template #icon><StopOutlined /></template>
          Заблокировать
        </a-button>
      </div>
    </div>

    <!-- Summary card -->
    <section class="lotax-card p-4 md:p-6 xl:p-7">
      <div class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-6">
        <div class="flex min-w-0 items-center gap-3 md:gap-4">
          <div
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFB000] via-brand to-[#E67E00] text-lg font-semibold text-white shadow-card md:h-16 md:w-16 md:text-xl"
          >
            {{ initials }}
          </div>
          <div class="min-w-0">
            <div class="truncate text-[18px] font-semibold tracking-tight text-ink md:text-[20px]">
              {{ drivers.current.display_name || 'Водитель' }}
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <TierBadge :tier="drivers.current.tier" />
              <StatusBadge :status="drivers.current.status" />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          <InfoField
            label="Создан"
            :value="dayjs(drivers.current.created_at).format('DD.MM.YYYY HH:mm')"
          />
          <InfoField label="Реферал" :value="drivers.current.referral_code" />
          <div>
            <p class="lotax-field-label">Баланс</p>
            <p class="text-[18px] font-semibold tracking-tight text-ink md:text-[20px]">
              {{ drivers.current.balance_system_points }}
              <span class="text-[12px] font-medium text-ink-muted md:text-[13px]">сист.</span>
              <span class="mx-1.5 text-ink-muted">·</span>
              {{ drivers.current.balance_park_points }}
              <span class="text-[12px] font-medium text-ink-muted md:text-[13px]">парк</span>
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Statistics: 1 / 2 / 4 cols -->
    <section>
      <h2 class="lotax-section-title mb-3 md:mb-4">Статистика</h2>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Системные баллы" :value="drivers.current.balance_system_points">
          <template #icon><StarOutlined /></template>
        </KpiCard>
        <KpiCard title="Баллы парка" :value="drivers.current.balance_park_points">
          <template #icon><TrophyOutlined /></template>
        </KpiCard>
        <KpiCard title="Уровень" :value="driverTierLabel[drivers.current.tier]">
          <template #icon><SafetyCertificateOutlined /></template>
        </KpiCard>
        <KpiCard title="Статус" :value="driverStatusLabel[drivers.current.status]">
          <template #icon><EditOutlined /></template>
        </KpiCard>
      </div>
    </section>

    <!-- Info cards: mobile stack, tablet 2, desktop 2 -->
    <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="lotax-card p-4 md:p-6">
        <h2 class="lotax-section-title mb-4 md:mb-5">Профиль</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
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

      <div class="lotax-card p-4 md:p-6">
        <h2 class="lotax-section-title mb-4 md:mb-5">Yandex IDs</h2>
        <div class="flex flex-col gap-4">
          <CopyableId label="Driver ID" :value="drivers.current.yandex_driver_id" />
          <CopyableId label="Park ID" :value="drivers.current.yandex_park_id" />
        </div>
      </div>
    </section>

    <!-- Personal data -->
    <section v-if="drivers.personalData" class="lotax-card overflow-hidden border-amber-200 p-0">
      <div class="border-b border-amber-100 bg-amber-50/70 px-4 py-4 md:px-6">
        <h2 class="lotax-section-title">Персональные данные</h2>
        <p class="lotax-caption mt-1">
          Доступ к ПДн аудируется. Используйте только по необходимости.
        </p>
      </div>
      <div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:gap-5 md:p-6">
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
