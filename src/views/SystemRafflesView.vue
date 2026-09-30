<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import {
  systemRafflesApi,
  type SystemRaffleListItem,
  type SystemRaffleTicket,
} from '@/api/systemRaffles'
import PageHeader from '@/components/PageHeader.vue'
import {
  filenameFromContentDisposition,
  messageFromBlobError,
  triggerBlobDownload,
} from '@/utils/download'
import { extractErrorMessage } from '@/utils/labels'

const loading = ref(false)
const items = ref<SystemRaffleListItem[]>([])
const selected = ref<SystemRaffleListItem | null>(null)
const tickets = ref<SystemRaffleTicket[]>([])
const ticketsLoading = ref(false)
const exporting = ref(false)
const query = ref('')

async function load() {
  loading.value = true
  try {
    const { data } = await systemRafflesApi.list()
    items.value = data.items ?? []
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loading.value = false
  }
}

async function openRaffle(item: SystemRaffleListItem) {
  selected.value = item
  query.value = ''
  ticketsLoading.value = true
  try {
    const { data } = await systemRafflesApi.tickets(item.id)
    tickets.value = data.items ?? []
  } catch (e) {
    tickets.value = []
    message.error(extractErrorMessage(e))
  } finally {
    ticketsLoading.value = false
  }
}

function matches(ticket: SystemRaffleTicket) {
  const q = query.value.trim().toLowerCase()
  if (!q) return true
  const name = `${ticket.driver_first_name ?? ''} ${ticket.driver_last_name ?? ''} ${ticket.driver_display_name}`.toLowerCase()
  return (
    String(ticket.ticket_no) === q ||
    name.includes(q) ||
    ticket.driver_phone.toLowerCase().includes(q)
  )
}

async function download() {
  if (!selected.value) return
  exporting.value = true
  try {
    const response = await systemRafflesApi.exportXlsx(selected.value.id)
    const filename = filenameFromContentDisposition(
      response.headers['content-disposition'] as string | undefined,
      `coupons_${selected.value.id}.xlsx`,
    )
    triggerBlobDownload(response.data, filename)
  } catch (e) {
    message.error(await messageFromBlobError(e, 'Не удалось скачать'))
  } finally {
    exporting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <PageHeader
      title="Купоны LOTAX"
      subtitle="Системные розыгрыши. В таблице только водители вашего парка."
    >
      <template #actions>
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex justify-center py-16">
      <a-spin size="large" />
    </div>

    <div v-else class="grid gap-3 md:grid-cols-2">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="lotax-card p-4 text-left"
        :class="selected?.id === item.id ? 'ring-2 ring-brand' : ''"
        @click="openRaffle(item)"
      >
        <p class="text-[16px] font-semibold text-ink">{{ item.title }}</p>
        <p class="mt-1 text-[13px] text-ink-muted">
          {{ item.raffle_date ? dayjs(item.raffle_date).format('DD.MM.YYYY HH:mm') : 'Дата не задана' }}
          · купонов: {{ item.tickets_in_org }}
        </p>
        <p v-if="item.prize_places?.length" class="mt-2 text-[13px] text-ink">
          <span v-for="place in item.prize_places" :key="place.place" class="mr-3">
            {{ place.place }} — {{ place.prize }}
          </span>
        </p>
      </button>
      <p v-if="!items.length" class="text-[14px] text-ink-muted">Системных розыгрышей нет</p>
    </div>

    <section v-if="selected" class="lotax-card !p-0">
      <div class="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-[16px] font-semibold text-ink">{{ selected.title }}</h2>
          <p class="text-[13px] text-ink-muted">№ купона, ФИО, телефон — только свои водители</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a-input v-model:value="query" allow-clear placeholder="№, имя или телефон" class="!w-56" />
          <a-button class="lotax-btn-secondary" :loading="exporting" @click="download">
            <template #icon><DownloadOutlined /></template>
            Excel
          </a-button>
        </div>
      </div>
      <a-table
        row-key="ticket_no"
        :loading="ticketsLoading"
        :pagination="false"
        :data-source="tickets.filter(matches)"
        :columns="[
          { title: '№', dataIndex: 'ticket_no', width: 70 },
          { title: 'ФИО', dataIndex: 'driver_display_name' },
          { title: 'Телефон', dataIndex: 'driver_phone', width: 160 },
          { title: 'Дата', key: 'purchased_at', width: 150 },
          { title: 'Баллы', dataIndex: 'points_spent', width: 90 },
          { title: 'Парк', dataIndex: 'park_name' },
        ]"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'purchased_at'">
            {{ dayjs(record.purchased_at).format('DD.MM.YYYY HH:mm') }}
          </template>
        </template>
      </a-table>
    </section>
  </div>
</template>
