<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { GiftOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons-vue'
import {
  systemRafflesApi,
  type SystemRaffleListItem,
} from '@/api/systemRaffles'
import PageHeader from '@/components/PageHeader.vue'
import TierBadge from '@/components/TierBadge.vue'
import { extractErrorMessage, rewardTypeLabel } from '@/utils/labels'
import type { DriverTier } from '@/types/api'

const router = useRouter()
const loading = ref(false)
const items = ref<SystemRaffleListItem[]>([])

const total = computed(() => items.value.length)
const activeCount = computed(() => items.value.filter((item) => item.is_active).length)
const ticketCount = computed(() =>
  items.value.reduce((sum, item) => sum + (item.tickets_in_org || 0), 0),
)

function stockLabel(item: SystemRaffleListItem) {
  if (item.stock_total == null) return 'Без лимита'
  const left = item.stock_remaining ?? item.stock_total
  return `${left} / ${item.stock_total}`
}

function prizeSummary(item: SystemRaffleListItem) {
  const places = [...(item.prize_places ?? [])].sort((a, b) => a.place - b.place)
  if (!places.length) return ''
  const unique = new Set(places.map((row) => row.prize))
  if (unique.size === 1) {
    return places.length === 1
      ? `${places[0].place}. ${places[0].prize}`
      : `${places.length} одинаковых · ${places[0].prize}`
  }
  const shown = places.slice(0, 4).map((row) => `${row.place}. ${row.prize}`)
  const extra = places.length - shown.length
  return extra > 0 ? `${shown.join(' · ')} · ещё ${extra}` : shown.join(' · ')
}

function tierOf(item: SystemRaffleListItem): DriverTier {
  const tier = item.min_tier
  if (tier === 'silver' || tier === 'gold' || tier === 'platinum' || tier === 'bronze') {
    return tier
  }
  return 'bronze'
}

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

function openDrivers(item: SystemRaffleListItem) {
  router.push({ name: 'system-raffle-drivers', params: { id: item.id } })
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <PageHeader
      title="Купоны LOTAX"
      subtitle="Системные розыгрыши. Билеты — только водители вашего парка."
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

    <template v-else>
      <div v-if="items.length" class="grid grid-cols-3 gap-3 sm:max-w-xl">
        <div class="lotax-card px-3 py-3 sm:px-4">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Всего
          </p>
          <p class="mt-1 text-[20px] font-semibold tabular-nums text-ink">
            {{ total }}
          </p>
        </div>
        <div class="lotax-card px-3 py-3 sm:px-4">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Активны
          </p>
          <p class="mt-1 text-[20px] font-semibold tabular-nums text-[var(--lotax-success)]">
            {{ activeCount }}
          </p>
        </div>
        <div class="lotax-card px-3 py-3 sm:px-4">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Билеты
          </p>
          <p class="mt-1 text-[20px] font-semibold tabular-nums text-ink">
            {{ ticketCount }}
          </p>
        </div>
      </div>

      <div v-if="!items.length" class="lotax-card lotax-empty">
        <div class="lotax-empty__icon">
          <GiftOutlined />
        </div>
        <p class="text-[16px] font-semibold text-ink">Розыгрышей пока нет</p>
        <p class="lotax-caption mt-1 max-w-sm">
          Когда супер-админ запустит купон LOTAX, он появится здесь.
        </p>
      </div>

      <div v-else class="flex flex-col gap-3">
        <article
          v-for="item in items"
          :key="item.id"
          class="lotax-card lotax-card-hover overflow-hidden"
        >
          <div class="flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-5">
            <div
              class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[var(--lotax-bg)] ring-1 ring-line sm:h-[72px] sm:w-[72px]"
            >
              <img
                v-if="item.image_url"
                :src="item.image_url"
                alt=""
                class="h-full w-full object-cover"
              />
              <GiftOutlined v-else class="text-[22px] text-ink-muted" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-start gap-2">
                <h3 class="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-ink sm:text-[16px]">
                  {{ item.title }}
                </h3>
                <span
                  class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset"
                  :class="
                    item.is_active
                      ? 'bg-[var(--lotax-success-soft)] text-[var(--lotax-success)] ring-[var(--lotax-success)]/20'
                      : 'bg-[var(--lotax-bg)] text-ink-muted ring-line'
                  "
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :class="item.is_active ? 'bg-[var(--lotax-success)]' : 'bg-ink-muted'"
                    aria-hidden="true"
                  />
                  {{ item.is_active ? 'Активна' : 'Неактивна' }}
                </span>
              </div>

              <p
                v-if="item.description"
                class="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-muted"
              >
                {{ item.description }}
              </p>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <span
                  v-if="item.points_cost"
                  class="inline-flex items-center rounded-full bg-[var(--lotax-primary-soft)] px-2.5 py-1 text-[12px] font-semibold tabular-nums text-[var(--lotax-primary)]"
                >
                  {{ item.points_cost }} б.
                </span>
                <span
                  class="inline-flex items-center rounded-full bg-[var(--lotax-bg)] px-2.5 py-1 text-[12px] font-medium text-ink ring-1 ring-inset ring-line"
                >
                  {{ rewardTypeLabel.raffle_coupon }}
                </span>
                <TierBadge :tier="tierOf(item)" />
                <span
                  class="inline-flex items-center rounded-full bg-[var(--lotax-bg)] px-2.5 py-1 text-[12px] font-medium text-ink-muted ring-1 ring-inset ring-line"
                >
                  Запас · {{ stockLabel(item) }}
                </span>
                <span
                  class="inline-flex items-center rounded-full bg-[var(--lotax-bg)] px-2.5 py-1 text-[12px] font-medium text-ink ring-1 ring-inset ring-line"
                >
                  Билетов · {{ item.tickets_in_org }}
                </span>
                <span
                  v-if="item.raffle_date"
                  class="inline-flex items-center rounded-full bg-[var(--lotax-info-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--lotax-info)] ring-1 ring-inset ring-[var(--lotax-info)]/15"
                >
                  Розыгрыш {{ dayjs(item.raffle_date).format('DD.MM.YYYY HH:mm') }}
                </span>
              </div>

              <p v-if="prizeSummary(item)" class="mt-2 text-[13px] leading-relaxed text-ink">
                {{ prizeSummary(item) }}
              </p>
              <p class="mt-1 text-[12px] leading-relaxed text-ink-muted">
                Номер билета ищите на странице «Водители» — только ваши водители.
              </p>
            </div>

            <div class="flex shrink-0 flex-wrap items-center gap-2 border-t border-line pt-3 md:border-t-0 md:pt-0">
              <a-button
                type="primary"
                class="lotax-btn-primary"
                @click="openDrivers(item)"
              >
                <template #icon><TeamOutlined /></template>
                Водители
              </a-button>
            </div>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>
