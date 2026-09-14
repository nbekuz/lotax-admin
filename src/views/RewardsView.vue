<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import { DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { adminRewardIconsApi } from '@/api/adminRewardIcons'
import { adminRewardsApi } from '@/api/adminRewards'
import ScopeFields, { type ScopeFieldsValue } from '@/components/ScopeFields.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import {
  filenameFromContentDisposition,
  messageFromBlobError,
  triggerBlobDownload,
} from '@/utils/download'
import { extractErrorMessage, rewardTypeLabel, tierLabel } from '@/utils/labels'
import {
  defaultSpecificScope,
  scopeFromApi,
  scopeLabel,
  validateScopeFields,
} from '@/utils/scope'
import type {
  DriverTier,
  RewardAdminItem,
  RewardIconItem,
  RewardType,
} from '@/types/api'

const auth = useAuthStore()
const org = useOrgStore()
const loading = ref(false)
const items = ref<RewardAdminItem[]>([])
const icons = ref<RewardIconItem[]>([])
const modalOpen = ref(false)
const saving = ref(false)
const editing = ref<RewardAdminItem | null>(null)

const form = reactive({
  title: '',
  description: '',
  type: 'car_wash' as RewardType,
  points_cost: 100,
  stock_total: undefined as number | undefined,
  min_tier: 'bronze' as DriverTier,
  sort_order: 0,
  is_active: true,
  one_per_driver: false,
  icon_id: undefined as string | undefined,
})

const scope = ref<ScopeFieldsValue>(defaultSpecificScope())
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

const parkId = computed(() => org.selectedParkId)
const canEdit = computed(() => auth.canManageRewards)
const isRaffle = computed(() => form.type === 'raffle_coupon')
const exportingId = ref<string | null>(null)

const selectedIcon = computed(() =>
  icons.value.find((i) => i.id === form.icon_id) ?? null,
)

function typeLabel(type: string) {
  return rewardTypeLabel[type as RewardType] ?? type
}

function iconUrl(item: RewardAdminItem) {
  return item.icon?.image_url || null
}

function iconTitle(item: RewardAdminItem) {
  return item.icon?.title || null
}

async function loadIcons() {
  try {
    const { data } = await adminRewardIconsApi.list({ page: 1, page_size: 100 })
    icons.value = data.items ?? []
  } catch {
    icons.value = []
  }
}

async function load() {
  if (!parkId.value) {
    items.value = []
    return
  }
  loading.value = true
  try {
    const { data } = await adminRewardsApi.list({ park_id: parkId.value })
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
  form.type = 'car_wash'
  form.points_cost = 100
  form.stock_total = undefined
  form.min_tier = 'bronze'
  form.sort_order = 0
  form.is_active = true
  form.one_per_driver = false
  form.icon_id = undefined
  raffleDate.value = undefined
  scope.value = defaultSpecificScope(parkId.value)
  imageFile.value = null
  imagePreview.value = null
  void loadIcons()
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
  form.icon_id = item.icon_id || item.icon?.id || undefined
  raffleDate.value = item.raffle_date ? dayjs(item.raffle_date) : undefined
  scope.value = scopeFromApi(item.scope, item.park_id)
  imageFile.value = null
  imagePreview.value = item.image_url || null
  void loadIcons()
  modalOpen.value = true
}

function onImageSelect(file: File) {
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
  return false
}

async function save() {
  if (!parkId.value || !form.title.trim()) {
    message.warning('Укажите название')
    return
  }
  if (form.type === 'raffle_coupon' && !raffleDate.value) {
    message.warning('Укажите дату розыгрыша')
    return
  }
  const scopeError = validateScopeFields(scope.value)
  if (scopeError) {
    message.warning(scopeError)
    return
  }
  saving.value = true
  try {
    const raffle_date =
      form.type === 'raffle_coupon' && raffleDate.value
        ? raffleDate.value.toISOString()
        : null
    // Raffle: backend forces one_per_driver=false; never send true from UI.
    const one_per_driver =
      form.type === 'raffle_coupon' ? false : form.one_per_driver
    if (editing.value) {
      const hadIcon = Boolean(editing.value.icon_id || editing.value.icon?.id)
      const clear_icon = hadIcon && !form.icon_id
      await adminRewardsApi.update(editing.value.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        points_cost: form.points_cost,
        stock_total: form.stock_total ?? null,
        min_tier: form.min_tier,
        sort_order: form.sort_order,
        is_active: form.is_active,
        one_per_driver,
        raffle_date,
        icon_id: form.icon_id || null,
        clear_icon: clear_icon || undefined,
        scope_type: scope.value.scope_type,
        park_group_id: scope.value.park_group_id,
        park_ids: scope.value.park_ids,
        image: imageFile.value,
      })
      message.success('Награда обновлена')
    } else {
      await adminRewardsApi.create({
        park_id: parkId.value,
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        // Backend forces park; omit system/park UI selector.
        points_type: 'park',
        points_cost: form.points_cost,
        stock_total: form.stock_total ?? null,
        min_tier: form.min_tier,
        sort_order: form.sort_order,
        is_active: form.is_active,
        one_per_driver,
        raffle_date,
        icon_id: form.icon_id || null,
        scope_type: scope.value.scope_type,
        park_group_id: scope.value.park_group_id,
        park_ids: scope.value.park_ids,
        image: imageFile.value,
      })
      message.success('Награда создана')
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

async function deactivate(item: RewardAdminItem) {
  try {
    await adminRewardsApi.remove(item.id)
    message.success('Награда деактивирована')
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

async function downloadRaffle(item: RewardAdminItem, format: 'csv' | 'xlsx') {
  exportingId.value = `${item.id}:${format}`
  try {
    const response = await adminRewardsApi.raffleExport(item.id, format)
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

watch(parkId, load)
onMounted(async () => {
  if (!org.parks.length) await org.fetchParks()
  await Promise.all([load(), loadIcons()])
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <PageHeader title="Награды парка">
      <template #description>
        <p class="lotax-page-subtitle">
          Парковые баллы · иконка из
          <router-link class="text-brand underline" :to="{ name: 'reward-icons' }">
            каталога организации
          </router-link>
        </p>
      </template>
      <template #actions>
        <a-button class="lotax-btn-secondary" @click="$router.push({ name: 'reward-icons' })">
          Иконки
        </a-button>
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button
          v-if="canEdit"
          type="primary"
          class="lotax-btn-primary"
          :disabled="!parkId"
          @click="openCreate"
        >
          <template #icon><PlusOutlined /></template>
          Добавить
        </a-button>
      </template>
    </PageHeader>

    <div v-if="!parkId" class="lotax-card p-8 text-center">Выберите парк в шапке</div>
    <div v-else-if="loading" class="flex justify-center py-16"><a-spin size="large" /></div>
    <div v-else-if="!items.length" class="lotax-card p-8 text-center lotax-caption">
      Наград пока нет
    </div>
    <div v-else class="flex flex-col gap-3">
      <article
        v-for="item in items"
        :key="item.id"
        class="lotax-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex min-w-0 items-start gap-3">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-line"
          >
            <img
              v-if="iconUrl(item)"
              :src="iconUrl(item)!"
              alt=""
              class="h-full w-full object-contain p-1"
            />
            <img
              v-else-if="item.image_url"
              :src="item.image_url"
              alt=""
              class="h-full w-full object-cover"
            />
            <span v-else class="text-[12px] text-ink-muted">—</span>
          </div>
          <div class="min-w-0">
            <div class="font-semibold text-ink">{{ item.title }}</div>
            <div class="text-[13px] text-ink-muted">
              {{ item.points_cost }} парк. б. · {{ typeLabel(item.type) }} ·
              от {{ tierLabel[item.min_tier] }} ·
              {{ item.is_active ? 'активна' : 'неактивна' }}
              · {{ scopeLabel(item.scope) }}
              <template v-if="iconTitle(item)"> · {{ iconTitle(item) }}</template>
              <template v-if="item.one_per_driver && item.type !== 'raffle_coupon'">
                · 1 на водителя
              </template>
              <template v-if="item.raffle_date">
                · розыгрыш {{ dayjs(item.raffle_date).format('DD.MM.YYYY') }}
              </template>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <a-dropdown v-if="item.type === 'raffle_coupon'" :trigger="['click']">
            <a-button
              class="lotax-btn-secondary"
              :loading="exportingId?.startsWith(item.id)"
            >
              <template #icon><DownloadOutlined /></template>
              Скачать для рандомайзера
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
          <template v-if="canEdit">
            <a-button class="lotax-btn-secondary" @click="openEdit(item)">Изменить</a-button>
            <a-button v-if="item.is_active" danger @click="deactivate(item)">Выкл.</a-button>
          </template>
        </div>
      </article>
    </div>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? 'Редактировать награду' : 'Новая награда'"
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
          <a-input v-model:value="form.title" placeholder="Например: Мойка авто" />
        </a-form-item>
        <a-form-item label="Описание">
          <a-textarea
            v-model:value="form.description"
            :rows="2"
            :auto-size="{ minRows: 2, maxRows: 4 }"
          />
        </a-form-item>
        <a-form-item label="Иконка">
          <a-select
            v-model:value="form.icon_id"
            allow-clear
            show-search
            option-filter-prop="label"
            placeholder="— без иконки"
            class="!w-full"
            :options="
              icons.map((i) => ({
                value: i.id,
                label: i.title,
              }))
            "
          >
            <template #option="{ value, label }">
              <div class="flex items-center gap-2 py-0.5">
                <img
                  v-if="icons.find((i) => i.id === value)?.image_url"
                  :src="icons.find((i) => i.id === value)!.image_url"
                  alt=""
                  class="h-7 w-7 rounded object-contain bg-white ring-1 ring-line"
                />
                <span class="h-7 w-7 rounded bg-surface ring-1 ring-line" v-else />
                <span>{{ label }}</span>
              </div>
            </template>
          </a-select>
          <p class="lotax-caption mt-1">
            Каталог организации · пусто = без иконки ·
            <router-link class="text-brand underline" :to="{ name: 'reward-icons' }">
              Управление иконками
            </router-link>
          </p>
          <div
            v-if="selectedIcon"
            class="mt-2 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2"
          >
            <img
              v-if="selectedIcon.image_url"
              :src="selectedIcon.image_url"
              alt=""
              class="h-12 w-12 rounded-lg object-contain bg-white ring-1 ring-line"
            />
            <div class="min-w-0">
              <div class="truncate text-[14px] font-medium text-ink">
                {{ selectedIcon.title }}
              </div>
              <div class="text-[12px] text-ink-muted">Выбрана из каталога</div>
            </div>
          </div>
        </a-form-item>
        <a-form-item label="Изображение">
          <a-upload
            accept="image/jpeg,image/png,image/webp,image/gif"
            :show-upload-list="false"
            :before-upload="onImageSelect"
          >
            <a-button class="lotax-btn-secondary">Выбрать файл</a-button>
          </a-upload>
          <p class="lotax-caption mt-1">Большое фото награды · JPEG / PNG / WEBP / GIF</p>
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
          <a-form-item :label="isRaffle ? 'Стоимость билета' : 'Стоимость'">
            <a-input-number
              v-model:value="form.points_cost"
              class="!w-full"
              :min="1"
              addon-after="парк. б."
            />
            <p class="lotax-caption mt-1">Только парковые баллы</p>
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
            Водитель может купить несколько билетов · победитель выбирается вне приложения
          </p>
        </a-form-item>
        <ScopeFields v-model="scope" />
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
