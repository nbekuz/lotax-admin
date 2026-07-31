<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useAuthStore } from '@/stores/auth'
import { useDriversStore } from '@/stores/drivers'
import {
  driverStatusColor,
  driverStatusLabel,
  driverTierColor,
  driverTierLabel,
  extractErrorMessage,
} from '@/utils/labels'
import type { DriverListItem, DriverStatus } from '@/types/api'

const auth = useAuthStore()
const drivers = useDriversStore()
const router = useRouter()

const statusFilter = ref<DriverStatus | 'all'>('all')

const columns = computed<TableColumnsType<DriverListItem>>(() => [
  {
    title: 'Имя',
    dataIndex: 'display_name',
    key: 'display_name',
  },
  {
    title: 'Телефон',
    dataIndex: 'phone_masked',
    key: 'phone_masked',
  },
  {
    title: 'Сист. баллы',
    dataIndex: 'balance_system_points',
    key: 'balance_system_points',
    width: 120,
  },
  {
    title: 'Парк',
    dataIndex: 'balance_park_points',
    key: 'balance_park_points',
    width: 100,
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
    width: 140,
  },
  {
    title: 'Создан',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 160,
  },
])

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `Всего: ${total}`,
})

async function load() {
  try {
    await drivers.fetchList({
      page: pagination.current,
      page_size: pagination.pageSize,
      status: statusFilter.value === 'all' ? null : statusFilter.value,
    })
    pagination.total = drivers.total
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function onTableChange(pag: { current?: number; pageSize?: number }) {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 20
  load()
}

function openDriver(record: DriverListItem) {
  router.push({ name: 'driver-detail', params: { id: record.id } })
}

watch(statusFilter, () => {
  pagination.current = 1
  load()
})

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold">Водители</h2>
        <p class="text-sm text-neutral-500">
          Список с маскированными персональными данными
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a-select
          v-model:value="statusFilter"
          class="!w-44"
          :options="[
            { value: 'all', label: 'Все статусы' },
            { value: 'active', label: 'Активен' },
            { value: 'blocked', label: 'Заблокирован' },
            { value: 'pending', label: 'Ожидание' },
          ]"
        />
        <a-button @click="load">Обновить</a-button>
        <a-button
          v-if="auth.canSync"
          type="primary"
          class="!bg-[#1c1c1e] !border-[#1c1c1e]"
          @click="router.push('/sync')"
        >
          Синхронизация
        </a-button>
      </div>
    </div>

    <a-table
      row-key="id"
      :columns="columns"
      :data-source="drivers.items"
      :loading="drivers.loading"
      :pagination="pagination"
      :scroll="{ x: 900 }"
      :custom-row="(record: DriverListItem) => ({
        onClick: () => openDriver(record),
        class: 'cursor-pointer',
      })"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'display_name'">
          <a
            class="font-medium text-amber-700"
            @click.prevent="openDriver(record as DriverListItem)"
          >
            {{ (record as DriverListItem).display_name || '—' }}
          </a>
          <div class="text-xs text-neutral-400">
            {{ (record as DriverListItem).first_name_masked }}
            {{ (record as DriverListItem).last_name_masked }}
          </div>
        </template>
        <template v-else-if="column.key === 'tier'">
          <a-tag :color="driverTierColor[(record as DriverListItem).tier]">
            {{ driverTierLabel[(record as DriverListItem).tier] }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="driverStatusColor[(record as DriverListItem).status]">
            {{ driverStatusLabel[(record as DriverListItem).status] }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'created_at'">
          {{ dayjs((record as DriverListItem).created_at).format('DD.MM.YYYY HH:mm') }}
        </template>
      </template>
    </a-table>
  </div>
</template>
