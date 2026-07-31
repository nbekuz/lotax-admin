<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { CloudSyncOutlined } from '@ant-design/icons-vue'
import { useDriversStore } from '@/stores/drivers'
import { extractErrorMessage } from '@/utils/labels'

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
  <div class="mx-auto max-w-3xl space-y-6">
    <div>
      <h2 class="text-xl font-semibold">Синхронизация с Yandex Fleet</h2>
      <p class="mt-1 text-sm text-neutral-500">
        Эндпоинты только ставят задачу в Celery. Синхронизация выполняется в фоне.
      </p>
    </div>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :md="12">
        <a-card class="!rounded-2xl">
          <template #title>
            <div class="flex items-center gap-2">
              <CloudSyncOutlined />
              Водители
            </div>
          </template>
          <p class="mb-4 text-sm text-neutral-500">
            POST /api/v1/sync/drivers · расписание ~6 ч
          </p>
          <a-button
            type="primary"
            block
            class="!h-11 !rounded-xl !bg-[#1c1c1e] !border-[#1c1c1e]"
            :loading="loadingDrivers"
            @click="syncDrivers"
          >
            Запустить синхронизацию водителей
          </a-button>
        </a-card>
      </a-col>

      <a-col :xs="24" :md="12">
        <a-card class="!rounded-2xl">
          <template #title>
            <div class="flex items-center gap-2">
              <CloudSyncOutlined />
              Поездки
            </div>
          </template>
          <p class="mb-4 text-sm text-neutral-500">
            POST /api/v1/sync/rides · расписание ~15 мин
          </p>
          <a-button
            type="primary"
            block
            class="!h-11 !rounded-xl !bg-[#1c1c1e] !border-[#1c1c1e]"
            :loading="loadingRides"
            @click="syncRides"
          >
            Запустить синхронизацию поездок
          </a-button>
        </a-card>
      </a-col>
    </a-row>

    <a-alert
      v-if="lastTask"
      type="success"
      show-icon
      :message="lastTask.message"
      :description="`task_id: ${lastTask.task_id}`"
    />
  </div>
</template>
