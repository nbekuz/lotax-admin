<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  GiftOutlined,
  LeftOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue'
import {
  systemRafflesApi,
  type SystemRaffleListItem,
  type SystemRaffleTicket,
} from '@/api/systemRaffles'
import { extractErrorMessage } from '@/utils/labels'

const route = useRoute()
const router = useRouter()

const raffleId = computed(() => String(route.params.id || ''))
const loading = ref(false)
const raffle = ref<SystemRaffleListItem | null>(null)
const rewardTitle = ref('')
const tickets = ref<SystemRaffleTicket[]>([])
const query = ref('')

const ticketQuery = computed(() => query.value.trim().replace(/^№\s*/, ''))

const filtered = computed(() => {
  const q = ticketQuery.value
  if (!q) return tickets.value
  return tickets.value.filter((ticket) => String(ticket.ticket_no).includes(q))
})

const exact = computed(() => {
  const q = ticketQuery.value
  if (!q) return null
  return tickets.value.find((ticket) => String(ticket.ticket_no) === q) ?? null
})

function prizeLine(item: SystemRaffleListItem | null) {
  const places = [...(item?.prize_places ?? [])].sort((a, b) => a.place - b.place)
  if (!places.length) return ''
  return places
    .slice(0, 4)
    .map((row) => `${row.place} — ${row.prize}`)
    .join(' · ')
}

async function load() {
  if (!raffleId.value) return
  loading.value = true
  try {
    const [listResult, ticketResult] = await Promise.all([
      systemRafflesApi.list(),
      systemRafflesApi.tickets(raffleId.value),
    ])
    raffle.value = (listResult.data.items ?? []).find((item) => item.id === raffleId.value) ?? null
    rewardTitle.value = ticketResult.data.reward_title || raffle.value?.title || 'Розыгрыш'
    tickets.value = ticketResult.data.items ?? []
  } catch (e) {
    raffle.value = null
    tickets.value = []
    message.error(extractErrorMessage(e))
  } finally {
    loading.value = false
  }
}

function rowClass(record: SystemRaffleTicket) {
  if (exact.value && record.ticket_no === exact.value.ticket_no) {
    return 'raffle-ticket-hit'
  }
  return ''
}

watch(raffleId, () => {
  query.value = ''
  load()
})

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <div>
      <button
        type="button"
        class="mb-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[14px] font-medium text-ink-muted transition hover:bg-[var(--lotax-bg)] hover:text-ink"
        @click="router.push({ name: 'system-raffles' })"
      >
        <LeftOutlined />
        К купонам LOTAX
      </button>

      <header class="lotax-page-header">
        <div class="min-w-0 flex-1">
          <h1 class="lotax-page-title">{{ rewardTitle || 'Билеты' }}</h1>
          <p class="lotax-page-subtitle">
            Кто купил билет в вашем парке. Ищите по номеру, который выпал на эфире.
          </p>
        </div>
        <div class="lotax-btn-stack shrink-0">
          <a-button class="lotax-btn-secondary" @click="load">
            <template #icon><ReloadOutlined /></template>
            Обновить
          </a-button>
        </div>
      </header>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <a-spin size="large" />
    </div>

    <template v-else>
      <article v-if="raffle" class="lotax-card overflow-hidden">
        <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div
            class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[var(--lotax-bg)] ring-1 ring-line"
          >
            <img
              v-if="raffle.image_url"
              :src="raffle.image_url"
              alt=""
              class="h-full w-full object-cover"
            />
            <GiftOutlined v-else class="text-[22px] text-ink-muted" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-[15px] font-semibold text-ink">{{ raffle.title }}</p>
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset"
                :class="
                  raffle.is_active
                    ? 'bg-[var(--lotax-success-soft)] text-[var(--lotax-success)] ring-[var(--lotax-success)]/20'
                    : 'bg-[var(--lotax-bg)] text-ink-muted ring-line'
                "
              >
                {{ raffle.is_active ? 'Активна' : 'Неактивна' }}
              </span>
            </div>
            <p class="mt-1 text-[13px] text-ink-muted">
              <span v-if="raffle.raffle_date">
                Розыгрыш {{ dayjs(raffle.raffle_date).format('DD.MM.YYYY HH:mm') }}
              </span>
              <span v-else>Дата не задана</span>
              · билетов у вас: {{ tickets.length }}
            </p>
            <p v-if="prizeLine(raffle)" class="mt-1 text-[13px] text-ink">
              {{ prizeLine(raffle) }}
            </p>
          </div>
        </div>
      </article>

      <section class="lotax-card !p-0">
        <div class="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-end sm:justify-between">
          <div class="min-w-0">
            <h2 class="text-[16px] font-semibold text-ink">Билеты</h2>
            <p class="text-[13px] text-ink-muted">
              {{
                ticketQuery
                  ? `Найдено ${filtered.length} из ${tickets.length}`
                  : `Всего ${tickets.length}`
              }}
            </p>
          </div>
          <a-input
            v-model:value="query"
            allow-clear
            size="large"
            placeholder="Номер билета"
            class="!w-full sm:!w-72"
          >
            <template #prefix>
              <SearchOutlined class="text-ink-muted" />
            </template>
          </a-input>
        </div>

        <div
          v-if="exact"
          class="mx-4 mt-4 flex flex-col gap-1 rounded-2xl bg-[var(--lotax-primary-soft)] px-4 py-3 ring-1 ring-inset ring-[var(--lotax-primary)]/20 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="text-[12px] font-semibold uppercase tracking-wide text-[var(--lotax-primary)]">
              Билет № {{ exact.ticket_no }}
            </p>
            <p class="text-[16px] font-semibold text-ink">{{ exact.driver_display_name }}</p>
            <p class="text-[13px] text-ink-muted">
              {{ exact.driver_phone || 'Телефон не указан' }}
              <span v-if="exact.park_name"> · {{ exact.park_name }}</span>
            </p>
          </div>
          <p class="text-[13px] text-ink-muted">
            {{ dayjs(exact.purchased_at).format('DD.MM.YYYY HH:mm') }}
            · {{ exact.points_spent }} б.
          </p>
        </div>

        <a-table
          class="raffle-drivers-table"
          row-key="ticket_no"
          :pagination="filtered.length > 20 ? { pageSize: 20, showSizeChanger: false } : false"
          :data-source="filtered"
          :row-class-name="rowClass"
          :columns="[
            { title: '№', dataIndex: 'ticket_no', width: 120 },
            { title: 'ФИО', dataIndex: 'driver_display_name' },
            { title: 'Телефон', dataIndex: 'driver_phone', width: 170 },
            { title: 'Дата', key: 'purchased_at', width: 160 },
            { title: 'Баллы', dataIndex: 'points_spent', width: 90 },
            { title: 'Парк', dataIndex: 'park_name' },
          ]"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'ticket_no'">
              <span class="font-semibold tabular-nums text-ink">{{ record.ticket_no }}</span>
            </template>
            <template v-else-if="column.key === 'purchased_at'">
              {{ dayjs(record.purchased_at).format('DD.MM.YYYY HH:mm') }}
            </template>
          </template>
          <template #emptyText>
            <div class="px-4 py-10 text-center">
              <p class="text-[15px] font-semibold text-ink">
                {{ ticketQuery ? 'Такого номера нет' : 'Билетов пока нет' }}
              </p>
              <p class="lotax-caption mt-1">
                {{
                  ticketQuery
                    ? 'Среди ваших водителей билет с этим номером не найден.'
                    : 'Ваши водители этот купон ещё не покупали.'
                }}
              </p>
            </div>
          </template>
        </a-table>
      </section>
    </template>
  </div>
</template>

<style scoped>
:deep(.raffle-ticket-hit > td) {
  background: var(--lotax-primary-soft) !important;
}
</style>
