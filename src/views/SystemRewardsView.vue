<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { superAdminApi } from '@/api/superAdmin'
import { extractErrorMessage, rewardTypeLabel, tierLabel } from '@/utils/labels'
import type { DriverTier, RewardAdminItem, RewardType } from '@/types/api'

const loading = ref(false)
const items = ref<RewardAdminItem[]>([])
const modalOpen = ref(false)
const saving = ref(false)
const editing = ref<RewardAdminItem | null>(null)

const form = reactive({
  title: '',
  description: '',
  image_url: '',
  type: 'merchandise' as RewardType,
  points_type: 'system' as const,
  points_cost: 500,
  stock_total: undefined as number | undefined,
  min_tier: 'bronze' as DriverTier,
  sort_order: 0,
  is_active: true,
})

const typeOptions = [
  { value: 'free_shift', label: rewardTypeLabel.free_shift },
  { value: 'certificate', label: rewardTypeLabel.certificate },
  { value: 'fuel_card', label: rewardTypeLabel.fuel_card },
  { value: 'car_wash', label: rewardTypeLabel.car_wash },
  { value: 'merchandise', label: rewardTypeLabel.merchandise },
  { value: 'other', label: rewardTypeLabel.other },
]

const tierOptions = [
  { value: 'bronze', label: tierLabel.bronze },
  { value: 'silver', label: tierLabel.silver },
  { value: 'gold', label: tierLabel.gold },
  { value: 'platinum', label: tierLabel.platinum },
]

function typeLabel(type: string) {
  return rewardTypeLabel[type as RewardType] ?? type
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
  form.image_url = ''
  form.type = 'merchandise'
  form.points_cost = 500
  form.stock_total = undefined
  form.min_tier = 'bronze'
  form.sort_order = 0
  form.is_active = true
  modalOpen.value = true
}

function openEdit(item: RewardAdminItem) {
  editing.value = item
  form.title = item.title
  form.description = item.description || ''
  form.image_url = item.image_url || ''
  form.type = item.type as RewardType
  form.points_cost = item.points_cost
  form.stock_total = item.stock_total ?? undefined
  form.min_tier = item.min_tier
  form.sort_order = item.sort_order
  form.is_active = item.is_active
  modalOpen.value = true
}

async function save() {
  if (!form.title.trim()) {
    message.warning('Укажите название')
    return
  }
  saving.value = true
  try {
    const image_url = form.image_url.trim() || null
    if (editing.value) {
      await superAdminApi.updateReward(editing.value.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url,
        type: form.type,
        points_cost: form.points_cost,
        stock_total: form.stock_total ?? null,
        min_tier: form.min_tier,
        sort_order: form.sort_order,
        is_active: form.is_active,
      })
      message.success('Обновлено')
    } else {
      await superAdminApi.createReward({
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url,
        type: form.type,
        points_type: 'system',
        points_cost: form.points_cost,
        stock_total: form.stock_total ?? null,
        min_tier: form.min_tier,
        sort_order: form.sort_order,
        is_active: form.is_active,
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

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="lotax-page-title">Системный каталог LOTAX</h1>
        <p class="lotax-caption mt-1">Награды за системные баллы</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button type="primary" class="lotax-btn-primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          Добавить
        </a-button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16"><a-spin size="large" /></div>
    <div v-else-if="!items.length" class="lotax-card p-8 text-center lotax-caption">
      Каталог пуст
    </div>
    <div v-else class="flex flex-col gap-3">
      <article
        v-for="item in items"
        :key="item.id"
        class="lotax-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex min-w-0 items-start gap-3">
          <img
            v-if="item.image_url"
            :src="item.image_url"
            alt=""
            class="h-12 w-12 shrink-0 rounded-lg object-cover"
          />
          <div class="min-w-0">
            <div class="font-semibold text-ink">{{ item.title }}</div>
            <div class="text-[13px] text-ink-muted">
              {{ item.points_cost }} б. · {{ typeLabel(item.type) }} ·
              от {{ tierLabel[item.min_tier] }} ·
              {{ item.is_active ? 'активна' : 'неактивна' }}
            </div>
          </div>
        </div>
        <a-button class="lotax-btn-secondary" @click="openEdit(item)">Изменить</a-button>
      </article>
    </div>

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
        <a-form-item label="Изображение (URL)">
          <a-input
            v-model:value="form.image_url"
            placeholder="https://…"
            allow-clear
          />
          <img
            v-if="form.image_url.trim()"
            :src="form.image_url.trim()"
            alt=""
            class="mt-2 h-20 w-20 rounded-lg object-cover ring-1 ring-line"
          />
        </a-form-item>
        <div class="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <a-form-item label="Тип">
            <a-select v-model:value="form.type" :options="typeOptions" />
          </a-form-item>
          <a-form-item label="Тип баллов">
            <a-select
              :value="'system'"
              disabled
              :options="[{ value: 'system', label: 'Системные (LOTAX)' }]"
            />
          </a-form-item>
          <a-form-item label="Стоимость">
            <a-input-number
              v-model:value="form.points_cost"
              class="!w-full"
              :min="1"
              addon-after="б."
            />
          </a-form-item>
          <a-form-item label="Запас (пусто — без лимита)">
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
