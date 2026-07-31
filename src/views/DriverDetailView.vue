<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useDriversStore } from '@/stores/drivers'
import {
  driverStatusColor,
  driverStatusLabel,
  driverTierColor,
  driverTierLabel,
  extractErrorMessage,
} from '@/utils/labels'
import type { DriverStatus } from '@/types/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const drivers = useDriversStore()

const driverId = computed(() => route.params.id as string)
const balanceOpen = ref(false)
const statusOpen = ref(false)
const pdnLoading = ref(false)

const balanceForm = reactive({
  balance_system_points: null as number | null,
  balance_park_points: null as number | null,
})

const statusForm = reactive<{ status: DriverStatus }> ({
  status: 'active',
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
      balance_system_points: balanceForm.balance_system_points,
      balance_park_points: balanceForm.balance_park_points,
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
    async onOk() {
      statusForm.status = 'blocked'
      await saveStatus()
    },
  })
}

onMounted(load)
</script>

<template>
  <div v-if="drivers.current" class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <a-button @click="router.push('/drivers')">
          <template #icon><ArrowLeftOutlined /></template>
          Назад
        </a-button>
        <div>
          <h2 class="text-xl font-semibold">
            {{ drivers.current.display_name || 'Водитель' }}
          </h2>
          <p class="text-sm text-neutral-500">ID: {{ drivers.current.id }}</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <a-button
          v-if="auth.canViewPdn"
          :loading="pdnLoading"
          @click="loadPdn"
        >
          Показать ПДн
        </a-button>
        <a-button v-if="auth.canEditBalance" @click="balanceOpen = true">
          Изменить баланс
        </a-button>
        <a-button v-if="auth.canEditStatus" @click="statusOpen = true">
          Изменить статус
        </a-button>
        <a-button
          v-if="auth.canEditStatus && drivers.current.status !== 'blocked'"
          danger
          @click="confirmBlock"
        >
          Заблокировать
        </a-button>
      </div>
    </div>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :md="12" :lg="8">
        <a-card title="Профиль" class="h-full !rounded-2xl">
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="Имя (маска)">
              {{ drivers.current.first_name_masked || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="Фамилия (маска)">
              {{ drivers.current.last_name_masked || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="Телефон (маска)">
              {{ drivers.current.phone_masked || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="Реферал">
              {{ drivers.current.referral_code || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="Создан">
              {{ dayjs(drivers.current.created_at).format('DD.MM.YYYY HH:mm') }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>

      <a-col :xs="24" :md="12" :lg="8">
        <a-card title="Баланс и статус" class="h-full !rounded-2xl">
          <div class="mb-4 flex gap-2">
            <a-tag :color="driverTierColor[drivers.current.tier]">
              {{ driverTierLabel[drivers.current.tier] }}
            </a-tag>
            <a-tag :color="driverStatusColor[drivers.current.status]">
              {{ driverStatusLabel[drivers.current.status] }}
            </a-tag>
          </div>
          <a-statistic
            title="Системные баллы"
            :value="drivers.current.balance_system_points"
            class="mb-4"
          />
          <a-statistic
            title="Баллы парка"
            :value="drivers.current.balance_park_points"
          />
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="8">
        <a-card title="Yandex IDs" class="h-full !rounded-2xl">
          <a-descriptions :column="1" size="small">
            <a-descriptions-item label="Driver ID">
              {{ drivers.current.yandex_driver_id || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="Park ID">
              {{ drivers.current.yandex_park_id || '—' }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>

    <a-card
      v-if="drivers.personalData"
      title="Персональные данные (расшифровано)"
      class="!rounded-2xl !border-amber-200"
    >
      <a-alert
        type="warning"
        show-icon
        class="mb-4"
        message="Доступ к ПДн аудируется. Используйте только по необходимости."
      />
      <a-descriptions bordered :column="{ xs: 1, md: 2 }">
        <a-descriptions-item label="Имя">
          {{ drivers.personalData.first_name || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="Фамилия">
          {{ drivers.personalData.last_name || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="Отчество">
          {{ drivers.personalData.middle_name || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="Телефон">
          {{ drivers.personalData.phone || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="Display name">
          {{ drivers.personalData.display_name || '—' }}
        </a-descriptions-item>
      </a-descriptions>
    </a-card>

    <a-modal
      v-model:open="balanceOpen"
      title="Изменить баланс"
      ok-text="Сохранить"
      cancel-text="Отмена"
      @ok="saveBalance"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Системные баллы">
          <a-input-number
            v-model:value="balanceForm.balance_system_points"
            class="!w-full"
            :min="0"
          />
        </a-form-item>
        <a-form-item label="Баллы парка">
          <a-input-number
            v-model:value="balanceForm.balance_park_points"
            class="!w-full"
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
      @ok="saveStatus"
    >
      <a-form layout="vertical" class="mt-4">
        <a-form-item label="Статус">
          <a-select
            v-model:value="statusForm.status"
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

  <div v-else class="flex justify-center py-20">
    <a-spin size="large" />
  </div>
</template>
