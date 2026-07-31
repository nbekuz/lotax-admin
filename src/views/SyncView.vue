<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { CarOutlined, CloudSyncOutlined, RocketOutlined } from '@ant-design/icons-vue'
import { useDriversStore } from '@/stores/drivers'
import { extractErrorMessage } from '@/utils/labels'
import CopyableId from '@/components/CopyableId.vue'

const drivers = useDriversStore()
const loadingDrivers = ref(false)
const loadingRides = ref(false)
const lastTask = ref<{ message: string; task_id: string } | null>(null)

async function syncDrivers() {
  loadingDrivers.value = true
  try {
    lastTask.value = await drivers.syncDrivers()
    message.success(lastTask.value.message)
  } catch (e) {
    message.error(extractErrorMessage(e, 'Celery/Redis недоступен'))
  } finally {
    loadingDrivers.value = false
  }
}

async function syncRides() {
  loadingRides.value = true
  try {
    lastTask.value = await drivers.syncRides()
    message.success(lastTask.value.message)
  } catch (e) {
    message.error(extractErrorMessage(e, 'Celery/Redis недоступен'))
  } finally {
    loadingRides.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-5 md:gap-6 xl:gap-8">
    <div>
      <h1 class="lotax-page-title">Синхронизация</h1>
      <p class="lotax-caption mt-1 max-w-2xl">
        Эндпоинты только ставят задачу в Celery. Синхронизация с Yandex Fleet выполняется в фоне.
      </p>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div class="lotax-card lotax-card-hover p-4 md:p-6">
        <div class="mb-5 flex items-start gap-3">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
          >
            <CarOutlined class="text-lg" />
          </div>
          <div class="min-w-0">
            <h2 class="lotax-section-title">Водители</h2>
            <p class="lotax-caption mt-1 break-all">
              POST /api/v1/sync/drivers · расписание ~6 ч
            </p>
          </div>
        </div>
        <a-button
          type="primary"
          block
          class="lotax-btn-primary"
          :loading="loadingDrivers"
          @click="syncDrivers"
        >
          <template #icon><CloudSyncOutlined /></template>
          Запустить синхронизацию водителей
        </a-button>
      </div>

      <div class="lotax-card lotax-card-hover p-4 md:p-6">
        <div class="mb-5 flex items-start gap-3">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"
          >
            <RocketOutlined class="text-lg" />
          </div>
          <div class="min-w-0">
            <h2 class="lotax-section-title">Поездки</h2>
            <p class="lotax-caption mt-1 break-all">
              POST /api/v1/sync/rides · расписание ~15 мин
            </p>
          </div>
        </div>
        <a-button
          type="primary"
          block
          class="lotax-btn-primary"
          :loading="loadingRides"
          @click="syncRides"
        >
          <template #icon><CloudSyncOutlined /></template>
          Запустить синхронизацию поездок
        </a-button>
      </div>
    </div>

    <div v-if="lastTask" class="lotax-card border-emerald-200 bg-emerald-50/40 p-4 md:p-6">
      <p class="break-words text-[14px] font-medium text-emerald-800 md:text-[15px]">
        {{ lastTask.message }}
      </p>
      <div class="mt-4">
        <CopyableId label="task_id" :value="lastTask.task_id" />
      </div>
    </div>
  </div>
</template>
