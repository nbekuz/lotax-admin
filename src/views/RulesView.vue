<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { adminRulesApi } from '@/api/adminRules'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage } from '@/utils/labels'
import type { PointsRuleItem } from '@/types/api'

const org = useOrgStore()
const loading = ref(false)
const items = ref<PointsRuleItem[]>([])
const modalOpen = ref(false)
const saving = ref(false)
const editing = ref<PointsRuleItem | null>(null)

const form = reactive({
  name: '',
  description: '',
  rule_type: 'per_ride',
  points_per_ride: 5,
  points_per_ruble: 0.05,
  min_fare: 200,
  is_active: true,
  priority: 10,
})

const parkId = computed(() => org.selectedParkId)

function buildConditions() {
  if (form.rule_type === 'per_ride') {
    return { points_per_ride: form.points_per_ride }
  }
  if (form.rule_type === 'per_ruble') {
    return {
      points_per_ruble: form.points_per_ruble,
      min_fare: form.min_fare,
    }
  }
  return {}
}

async function load() {
  if (!parkId.value) {
    items.value = []
    return
  }
  loading.value = true
  try {
    const { data } = await adminRulesApi.list({ park_id: parkId.value })
    items.value = data.items
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.name = '5 баллов за поездку'
  form.description = ''
  form.rule_type = 'per_ride'
  form.points_per_ride = 5
  form.is_active = true
  form.priority = 10
  modalOpen.value = true
}

function openEdit(item: PointsRuleItem) {
  editing.value = item
  form.name = item.name
  form.description = item.description || ''
  form.rule_type = item.rule_type
  form.points_per_ride = Number(item.conditions?.points_per_ride ?? 5)
  form.points_per_ruble = Number(item.conditions?.points_per_ruble ?? 0.05)
  form.min_fare = Number(item.conditions?.min_fare ?? 200)
  form.is_active = item.is_active
  form.priority = item.priority
  modalOpen.value = true
}

async function save() {
  if (!parkId.value || !form.name.trim()) {
    message.warning('Укажите название')
    return
  }
  saving.value = true
  try {
    const conditions = buildConditions()
    if (editing.value) {
      await adminRulesApi.update(editing.value.id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        rule_type: form.rule_type,
        conditions,
        is_active: form.is_active,
        priority: form.priority,
      })
      message.success('Правило обновлено')
    } else {
      await adminRulesApi.create({
        park_id: parkId.value,
        name: form.name.trim(),
        description: form.description.trim() || null,
        points_type: 'park',
        rule_type: form.rule_type,
        conditions,
        is_active: form.is_active,
        priority: form.priority,
      })
      message.success('Правило создано')
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

async function remove(item: PointsRuleItem) {
  try {
    await adminRulesApi.remove(item.id)
    message.success('Правило удалено')
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

watch(parkId, load)
onMounted(async () => {
  if (!org.parks.length) await org.fetchParks()
  await load()
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="lotax-page-title">Правила баллов</h1>
        <p class="lotax-caption mt-1">Начисление парковых баллов за поездки</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button
          type="primary"
          class="lotax-btn-primary"
          :disabled="!parkId"
          @click="openCreate"
        >
          <template #icon><PlusOutlined /></template>
          Добавить
        </a-button>
      </div>
    </div>

    <div v-if="!parkId" class="lotax-card p-8 text-center">Выберите парк в шапке</div>
    <div v-else-if="loading" class="flex justify-center py-16"><a-spin size="large" /></div>
    <div v-else-if="!items.length" class="lotax-card p-8 text-center lotax-caption">
      Правил пока нет
    </div>
    <div v-else class="flex flex-col gap-3">
      <article
        v-for="item in items"
        :key="item.id"
        class="lotax-card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div class="font-semibold text-ink">{{ item.name }}</div>
          <div class="text-[13px] text-ink-muted">
            {{ item.rule_type }} · приоритет {{ item.priority }} ·
            {{ item.is_active ? 'активно' : 'выкл.' }}
          </div>
        </div>
        <div class="flex gap-2">
          <a-button class="lotax-btn-secondary" @click="openEdit(item)">Изменить</a-button>
          <a-button danger @click="remove(item)">Удалить</a-button>
        </div>
      </article>
    </div>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? 'Редактировать правило' : 'Новое правило'"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="saving"
      centered
      :width="520"
      @ok="save"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Название" required>
          <a-input v-model:value="form.name" size="large" />
        </a-form-item>
        <a-form-item label="Тип правила">
          <a-select
            v-model:value="form.rule_type"
            size="large"
            :options="[
              { value: 'per_ride', label: 'За поездку' },
              { value: 'per_ruble', label: 'За рубль' },
              { value: 'time_multiplier', label: 'Множитель времени' },
              { value: 'tier_multiplier', label: 'Множитель уровня' },
            ]"
          />
        </a-form-item>
        <a-form-item v-if="form.rule_type === 'per_ride'" label="Баллов за поездку">
          <a-input-number v-model:value="form.points_per_ride" class="!w-full" :min="0" size="large" />
        </a-form-item>
        <template v-if="form.rule_type === 'per_ruble'">
          <a-form-item label="Баллов за рубль">
            <a-input-number
              v-model:value="form.points_per_ruble"
              class="!w-full"
              :min="0"
              :step="0.01"
              size="large"
            />
          </a-form-item>
          <a-form-item label="Мин. тариф">
            <a-input-number v-model:value="form.min_fare" class="!w-full" :min="0" size="large" />
          </a-form-item>
        </template>
        <a-form-item label="Приоритет">
          <a-input-number v-model:value="form.priority" class="!w-full" size="large" />
        </a-form-item>
        <a-form-item label="Активно">
          <a-switch v-model:checked="form.is_active" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
