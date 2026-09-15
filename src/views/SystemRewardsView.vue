<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import {
  DownloadOutlined,
  EditOutlined,
  GiftOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'
import { superAdminApi } from '@/api/superAdmin'
import PageHeader from '@/components/PageHeader.vue'
import TierBadge from '@/components/TierBadge.vue'
import {
  filenameFromContentDisposition,
  messageFromBlobError,
  triggerBlobDownload,
} from '@/utils/download'
import { extractErrorMessage, rewardTypeLabel, tierLabel } from '@/utils/labels'
import type { DriverTier, RewardAdminItem, RewardType } from '@/types/api'

const loading = ref(false)
const items = ref<RewardAdminItem[]>([])
const modalOpen = ref(false)
const saving = ref(false)
const editing = ref<RewardAdminItem | null>(null)
const exportingId = ref<string | null>(null)

const form = reactive({
  title: '',
  description: '',
  type: 'merchandise' as RewardType,
  points_type: 'system' as const,
  points_cost: 500,
  stock_total: undefined as number | undefined,
  min_tier: 'bronze' as DriverTier,
  sort_order: 0,
  is_active: true,
  one_per_driver: false,
})

const raffleDate = ref<Dayjs | undefined>(undefined)
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

const typeOptions = [
  { value: 'free_shift', label: rewardTypeLabel.free_shift },
  { value: 'certificate', label: rewardTypeLabel.certificate },
  { value: 'fuel_card', label: rewardTypeLabel.fuel_card },
  { value: 'car_wash', label: rewardTypeLabel.car_wash },
  { value: 'merchandise', label: rewardTypeLabel.merchandise },
  { value: 'raffle_coupon', label: rewardTypeLabel.raffle_coupon },
  { value: 'other', label: rewardTypeLabel.other },
]

const tierOptions = [
  { value: 'bronze', label: tierLabel.bronze },
  { value: 'silver', label: tierLabel.silver },
  { value: 'gold', label: tierLabel.gold },
  { value: 'platinum', label: tierLabel.platinum },
]

const isRaffle = computed(() => form.type === 'raffle_coupon')
const activeCount = computed(() => items.value.filter((i) => i.is_active).length)
const raffleCount = computed(
  () => items.value.filter((i) => i.type === 'raffle_coupon').length,
)

function typeLabel(type: string) {
  return rewardTypeLabel[type as RewardType] ?? type
}

function stockLabel(item: RewardAdminItem) {
  if (item.stock_total == null) return 'Без лимита'
  const left = item.stock_remaining ?? item.stock_total
  return `${left} / ${item.stock_total}`
}

async function load() {
  loading.value = true
  try {
    const { data } = await superAdminApi.listRewards()
    items.value = data.items
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.title = ''
  form.description = ''
  form.type = 'merchandise'
  form.points_cost = 500
  form.stock_total = undefined
  form.min_tier = 'bronze'
  form.sort_order = 0
  form.is_active = true
  form.one_per_driver = false
  raffleDate.value = undefined
  imageFile.value = null
  imagePreview.value = null
  modalOpen.value = true
}

function openEdit(item: RewardAdminItem) {
  editing.value = item
  form.title = item.title
  form.description = item.description || ''
  form.type = item.type as RewardType
  form.points_cost = item.points_cost
  form.stock_total = item.stock_total ?? undefined
  form.min_tier = item.min_tier
  form.sort_order = item.sort_order
  form.is_active = item.is_active
  form.one_per_driver = Boolean(item.one_per_driver)
  raffleDate.value = item.raffle_date ? dayjs(item.raffle_date) : undefined
  imageFile.value = null
  imagePreview.value = item.image_url || null
  modalOpen.value = true
}

function onImageSelect(file: File) {
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  return false
}

async function save() {
  if (!form.title.trim()) {
    message.warning('Укажите название')
    return
  }
  if (form.type === 'raffle_coupon' && !raffleDate.value) {
    message.warning('Укажите дату розыгрыша')
    return
  }
  saving.value = true
  try {
    const raffle_date =
      form.type === 'raffle_coupon' && raffleDate.value
        ? raffleDate.value.toISOString()
        : null
    const one_per_driver =
      form.type === 'raffle_coupon' ? false : form.one_per_driver
    if (editing.value) {
      await superAdminApi.updateReward(editing.value.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        points_cost: form.points_cost,
        stock_total: form.stock_total ?? null,
        min_tier: form.min_tier,
        sort_order: form.sort_order,
        is_active: form.is_active,
        one_per_driver,
        raffle_date,
        image: imageFile.value,
      })
      message.success('Обновлено')
    } else {
      await superAdminApi.createReward({
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        // Backend forces system for super-admin raffle.
        points_type: 'system',
        points_cost: form.points_cost,
        stock_total: form.stock_total ?? null,
        min_tier: form.min_tier,
        sort_order: form.sort_order,
        is_active: form.is_active,
        one_per_driver,
        raffle_date,
        image: imageFile.value,
      })
      message.success('Создано')
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

async function downloadRaffle(item: RewardAdminItem, format: 'csv' | 'xlsx') {
  exportingId.value = `${item.id}:${format}`
  try {
    const response = await superAdminApi.raffleExport(item.id, format)
    const fallback =
      format === 'xlsx'
        ? `raffle_${item.id}.xlsx`
        : `raffle_${item.id}.csv`
    const filename = filenameFromContentDisposition(
      response.headers['content-disposition'] as string | undefined,
      fallback,
    )
    const mime =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv;charset=utf-8'
    const blob =
      response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: mime })
    triggerBlobDownload(blob, filename)
  } catch (e) {
    message.error(await messageFromBlobError(e, 'Не удалось скачать файл'))
  } finally {
    exportingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <PageHeader
      title="Системный каталог LOTAX"
      subtitle="Награды за системные баллы · видны всем водителям"
    >
      <template #actions>
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button type="primary" class="lotax-btn-primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          Добавить
        </a-button>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex justify-center py-16"><a-spin size="large" /></div>

    <template v-else>
      <div
        v-if="items.length"
        class="grid grid-cols-3 gap-3 sm:max-w-xl"
      >
        <div class="lotax-card px-3 py-3 sm:px-4">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Всего
          </p>
          <p class="mt-1 text-[20px] font-semibold tabular-nums text-ink">
            {{ items.length }}
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
            Розыгрыши
          </p>
          <p class="mt-1 text-[20px] font-semibold tabular-nums text-ink">
            {{ raffleCount }}
          </p>
        </div>
      </div>

      <div
        v-if="!items.length"
        class="lotax-card lotax-empty"
      >
        <div class="lotax-empty__icon">
          <GiftOutlined />
        </div>
        <p class="text-[16px] font-semibold text-ink">Каталог пуст</p>
        <p class="lotax-caption mt-1 max-w-sm">
          Добавьте первую системную награду — мерч, сертификат или розыгрыш.
        </p>
        <a-button
          type="primary"
          class="lotax-btn-primary mt-4"
          @click="openCreate"
        >
          <template #icon><PlusOutlined /></template>
          Добавить награду
        </a-button>
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
                  class="inline-flex items-center rounded-full bg-[var(--lotax-primary-soft)] px-2.5 py-1 text-[12px] font-semibold tabular-nums text-[var(--lotax-primary)]"
                >
                  {{ item.points_cost }} б.
                </span>
                <span
                  class="inline-flex items-center rounded-full bg-[var(--lotax-bg)] px-2.5 py-1 text-[12px] font-medium text-ink ring-1 ring-inset ring-line"
                >
                  {{ typeLabel(item.type) }}
                </span>
                <TierBadge :tier="item.min_tier" />
                <span
                  class="inline-flex items-center rounded-full bg-[var(--lotax-bg)] px-2.5 py-1 text-[12px] font-medium text-ink-muted ring-1 ring-inset ring-line"
                >
                  Запас · {{ stockLabel(item) }}
                </span>
                <span
                  v-if="item.raffle_date"
                  class="inline-flex items-center rounded-full bg-[var(--lotax-info-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--lotax-info)] ring-1 ring-inset ring-[var(--lotax-info)]/15"
                >
                  Розыгрыш {{ dayjs(item.raffle_date).format('DD.MM.YYYY') }}
                </span>
              </div>
            </div>

            <div
              class="flex shrink-0 flex-wrap items-center gap-2 border-t border-line pt-3 md:border-t-0 md:pt-0"
            >
              <a-dropdown
                v-if="item.type === 'raffle_coupon'"
                :trigger="['click']"
              >
                <a-button
                  class="lotax-btn-secondary"
                  :loading="exportingId?.startsWith(item.id)"
                >
                  <template #icon><DownloadOutlined /></template>
                  <span class="hidden sm:inline">Скачать</span>
                </a-button>
                <template #overlay>
                  <a-menu
                    @click="({ key }: { key: string | number }) => downloadRaffle(item, String(key) as 'csv' | 'xlsx')"
                  >
                    <a-menu-item key="csv">CSV</a-menu-item>
                    <a-menu-item key="xlsx">Excel (XLSX)</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
              <a-button
                type="primary"
                class="lotax-btn-primary"
                @click="openEdit(item)"
              >
                <template #icon><EditOutlined /></template>
                Изменить
              </a-button>
            </div>
          </div>
        </article>
      </div>
    </template>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? 'Редактировать' : 'Новая системная награда'"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="saving"
      centered
      :width="560"
      destroy-on-close
      @ok="save"
    >
      <a-form layout="vertical" class="reward-modal-form">
        <a-form-item label="Название" required>
          <a-input v-model:value="form.title" placeholder="Например: Футболка LOTAX" />
        </a-form-item>
        <a-form-item label="Описание">
          <a-textarea
            v-model:value="form.description"
            :rows="2"
            :auto-size="{ minRows: 2, maxRows: 4 }"
          />
        </a-form-item>
        <a-form-item label="Изображение">
          <a-upload
            accept="image/jpeg,image/png,image/webp,image/gif"
            :show-upload-list="false"
            :before-upload="onImageSelect"
          >
            <a-button class="lotax-btn-secondary">Выбрать файл</a-button>
          </a-upload>
          <p class="lotax-caption mt-1">JPEG / PNG / WEBP / GIF · multipart</p>
          <img
            v-if="imagePreview"
            :src="imagePreview"
            alt=""
            class="mt-2 h-20 w-20 rounded-lg object-cover ring-1 ring-line"
          />
        </a-form-item>
        <div class="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <a-form-item label="Тип">
            <a-select
              v-model:value="form.type"
              :options="typeOptions"
              :disabled="Boolean(editing)"
            />
          </a-form-item>
          <a-form-item label="Тип баллов">
            <a-select
              :value="'system'"
              disabled
              :options="[{ value: 'system', label: 'Системные (LOTAX)' }]"
            />
          </a-form-item>
          <a-form-item :label="isRaffle ? 'Стоимость билета' : 'Стоимость'">
            <a-input-number
              v-model:value="form.points_cost"
              class="!w-full"
              :min="1"
              addon-after="б."
            />
          </a-form-item>
          <a-form-item :label="isRaffle ? 'Запас билетов (пусто — без лимита)' : 'Запас (пусто — без лимита)'">
            <a-input-number
              v-model:value="form.stock_total"
              class="!w-full"
              :min="0"
              placeholder="Без лимита"
            />
          </a-form-item>
          <a-form-item label="Мин. уровень">
            <a-select v-model:value="form.min_tier" :options="tierOptions" />
          </a-form-item>
          <a-form-item label="Порядок сортировки">
            <a-input-number v-model:value="form.sort_order" class="!w-full" :min="0" />
          </a-form-item>
        </div>
        <a-form-item v-if="isRaffle" label="Дата розыгрыша">
          <a-date-picker
            v-model:value="raffleDate"
            class="!w-full"
            show-time
            format="DD.MM.YYYY HH:mm"
          />
          <p class="lotax-caption mt-1">
            Без лимита на водителя · системные баллы · экспорт для рандомайзера
          </p>
        </a-form-item>
        <a-form-item label="Статус">
          <div class="flex items-center gap-2">
            <a-switch v-model:checked="form.is_active" />
            <span class="text-[13px] text-ink-muted">
              {{ form.is_active ? 'Активна' : 'Неактивна' }}
            </span>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
