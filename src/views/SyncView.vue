<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  CarOutlined,
  CloudSyncOutlined,
  RocketOutlined,
} from '@ant-design/icons-vue'
import { useDriversStore } from '@/stores/drivers'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage } from '@/utils/labels'
import CopyableId from '@/components/CopyableId.vue'

const drivers = useDriversStore()
const org = useOrgStore()
const router = useRouter()

const loadingDrivers = ref(false)
const loadingRides = ref(false)
const lastTask = ref<{ message: string; task_id: string } | null>(null)

const parkId = computed(() => org.selectedParkId)
const park = computed(() => org.selectedPark)

const yandexReady = computed(() => {
  const p = park.value
  if (!p) return false
  return Boolean(
    p.yandex_park_id && p.yandex_client_id && p.has_yandex_api_key,
  )
})

async function refreshDriversSoon() {
  // Celery queue — list may fill after a short delay
  window.setTimeout(() => {
    void drivers.fetchList({
      page: 1,
      park_id: parkId.value,
    })
  }, 4000)
}

async function syncDrivers() {
  loadingDrivers.value = true
  try {
    lastTask.value = await drivers.syncDrivers(parkId.value)
    message.success(lastTask.value.message)
    await refreshDriversSoon()
  } catch (e) {
    message.error(extractErrorMessage(e, 'Celery/Redis недоступен'))
  } finally {
    loadingDrivers.value = false
  }
}

async function syncRides() {
  loadingRides.value = true
  try {
    lastTask.value = await drivers.syncRides(parkId.value)
    message.success(lastTask.value.message)
  } catch (e) {
    message.error(extractErrorMessage(e, 'Celery/Redis недоступен'))
  } finally {
    loadingRides.value = false
  }
}

onMounted(async () => {
  if (!org.parks.length) {
    try {
      await org.fetchParks()
    } catch {
      /* ignore */
    }
  }
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-5 md:gap-6 xl:gap-8">
    <div>
      <h1 class="lotax-page-title">Синхронизация</h1>
      <p class="lotax-caption mt-1 max-w-2xl">
        Эндпоинты только ставят задачу в Celery. Синхронизация с Яндекс.Таксопарк выполняется в фоне.
      </p>
    </div>

    <div class="lotax-card p-4 md:p-5">
      <p class="text-[13px] text-ink-muted">Парк</p>
      <p class="mt-1 text-[15px] font-semibold text-ink">
        {{ park?.name || 'Не выбран — синхронизация по всем паркам org' }}
      </p>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset"
          :class="
            yandexReady
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-amber-50 text-amber-800 ring-amber-200'
          "
        >
          {{
            !parkId
              ? 'Парк не выбран'
              : yandexReady
                ? 'Yandex ключи заданы'
                : 'Yandex ключи неполные'
          }}
        </span>
        <a-button
          v-if="parkId && !yandexReady"
          type="link"
          class="!px-0"
          @click="router.push('/organization/yandex')"
        >
          Настроить Yandex
        </a-button>
      </div>
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
              POST /sync/drivers · расписание ~6 ч
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
          Синхронизировать водителей
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
              POST /sync/rides · расписание ~15 мин
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
          Синхронизировать поездки
        </a-button>
      </div>
    </div>

    <div v-if="lastTask" class="lotax-card border-emerald-200 bg-emerald-50/40 p-4 md:p-6">
      <p class="break-words text-[14px] font-medium text-emerald-800 md:text-[15px]">
        {{ lastTask.message }}
      </p>
      <div class="mt-4">
        <CopyableId label="ID задачи" :value="lastTask.task_id" />
      </div>
      <p class="lotax-caption mt-3">
        Список водителей обновится через несколько секунд.
        <a-button type="link" class="!px-1" @click="router.push('/drivers')">
          Открыть водителей
        </a-button>
      </p>
    </div>
  </div>
</template>
