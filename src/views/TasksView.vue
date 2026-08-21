<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import {
  BarChartOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'
import { adminTasksApi } from '@/api/adminTasks'
import ScopeFields, { type ScopeFieldsValue } from '@/components/ScopeFields.vue'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage, taskStatusLabel, taskStatusTone, taskTypeLabel } from '@/utils/labels'
import {
  defaultSpecificScope,
  scopeFromApi,
  scopeLabel,
  validateScopeFields,
} from '@/utils/scope'
import type { PointsType, TaskAdminItem, TaskStatus, TaskType } from '@/types/api'

const auth = useAuthStore()
const org = useOrgStore()
const router = useRouter()

const loading = ref(false)
const items = ref<TaskAdminItem[]>([])
const modalOpen = ref(false)
const saving = ref(false)
const editing = ref<TaskAdminItem | null>(null)

const form = reactive({
  title: '',
  description: '',
  task_type: 'ride_count' as TaskType,
  target_value: 10,
  reward_points_type: 'park' as PointsType,
  reward_points: 100,
  auto_join: true,
  status: 'draft' as TaskStatus,
  notify_on_create: true,
})
const dateRange = ref<[Dayjs, Dayjs]>()
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const scope = ref<ScopeFieldsValue>(defaultSpecificScope())

const parkId = computed(() => org.selectedParkId)
const canEdit = computed(() => auth.canManageTasks)

const taskTypeOptions = [
  { value: 'ride_count', label: taskTypeLabel.ride_count },
  { value: 'earn_points', label: taskTypeLabel.earn_points },
  { value: 'fare_total', label: taskTypeLabel.fare_total },
  { value: 'streak_days', label: taskTypeLabel.streak_days },
  { value: 'custom', label: taskTypeLabel.custom },
]

const statusOptions = [
  { value: 'draft', label: taskStatusLabel.draft },
  { value: 'scheduled', label: taskStatusLabel.scheduled },
  { value: 'active', label: taskStatusLabel.active },
  { value: 'completed', label: taskStatusLabel.completed },
]

async function load() {
  if (!parkId.value) {
    items.value = []
    return
  }
  loading.value = true
  try {
    const { data } = await adminTasksApi.list({ park_id: parkId.value })
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
  form.task_type = 'ride_count'
  form.target_value = 10
  form.reward_points_type = 'park'
  form.reward_points = 100
  dateRange.value = [dayjs(), dayjs().add(7, 'day')]
  form.auto_join = true
  form.status = 'draft'
  form.notify_on_create = true
  imageFile.value = null
  imagePreview.value = null
  scope.value = defaultSpecificScope(parkId.value)
  modalOpen.value = true
}

function openEdit(item: TaskAdminItem) {
  editing.value = item
  form.title = item.title
  form.description = item.description || ''
  form.task_type = item.task_type as TaskType
  form.target_value = item.target_value
  form.reward_points_type = item.reward_points_type
  form.reward_points = item.reward_points
  dateRange.value = [dayjs(item.start_date), dayjs(item.end_date)]
  form.auto_join = item.auto_join
  form.status = item.status as TaskStatus
  form.notify_on_create = true
  imageFile.value = null
  imagePreview.value = item.image_url || null
  scope.value = scopeFromApi(item.scope, item.park_id)
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
  if (!dateRange.value) {
    message.warning('Укажите период проведения')
    return
  }
  if (!editing.value) {
    const scopeError = validateScopeFields(scope.value)
    if (scopeError) {
      message.warning(scopeError)
      return
    }
  }
  saving.value = true
  try {
    const start_date = dateRange.value[0].toISOString()
    const end_date = dateRange.value[1].toISOString()
    if (editing.value) {
      await adminTasksApi.update(editing.value.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        target_value: form.target_value,
        reward_points: form.reward_points,
        start_date,
        end_date,
        auto_join: form.auto_join,
        status: form.status,
        notify_on_create: form.notify_on_create,
        image: imageFile.value,
      })
      message.success('Задание обновлено')
    } else {
      await adminTasksApi.create({
        park_id: parkId.value,
        title: form.title.trim(),
        description: form.description.trim() || null,
        task_type: form.task_type,
        target_value: form.target_value,
        reward_points_type: form.reward_points_type,
        reward_points: form.reward_points,
        start_date,
        end_date,
        auto_join: form.auto_join,
        status: form.status,
        notify_on_create: form.notify_on_create,
        scope_type: scope.value.scope_type,
        park_group_id: scope.value.park_group_id,
        park_ids: scope.value.park_ids,
        image: imageFile.value,
      })
      message.success('Задание создано')
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

function remove(item: TaskAdminItem) {
  Modal.confirm({
    title: 'Удалить задание?',
    content: item.title,
    okText: 'Удалить',
    cancelText: 'Отмена',
    okButtonProps: { danger: true },
    centered: true,
    async onOk() {
      try {
        await adminTasksApi.remove(item.id)
        message.success('Задание удалено')
        await load()
      } catch (e) {
        message.error(extractErrorMessage(e))
      }
    },
  })
}

function openProgress(item: TaskAdminItem) {
  router.push({ name: 'task-progress', params: { id: item.id } })
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
        <h1 class="lotax-page-title">Задания</h1>
        <p class="lotax-caption mt-1">Задания для водителей парка с прогрессом выполнения</p>
      </div>
      <div class="flex flex-wrap gap-2">
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
      </div>
    </div>

    <div v-if="!parkId" class="lotax-card p-8 text-center">Выберите парк в шапке</div>
    <div v-else-if="loading" class="flex justify-center py-16"><a-spin size="large" /></div>
    <div v-else-if="!items.length" class="lotax-card p-8 text-center lotax-caption">
      Заданий пока нет
    </div>
    <div v-else class="flex flex-col gap-3">
      <article
        v-for="item in items"
        :key="item.id"
        class="lotax-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-semibold text-ink">{{ item.title }}</span>
            <span
              class="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset"
              :class="taskStatusTone[item.status as TaskStatus] ?? taskStatusTone.draft"
            >
              {{ taskStatusLabel[item.status as TaskStatus] ?? item.status }}
            </span>
          </div>
          <div class="mt-1 text-[13px] text-ink-muted">
            {{ taskTypeLabel[item.task_type as TaskType] ?? item.task_type }} · цель {{ item.target_value }} ·
            +{{ item.reward_points }} б. ({{ item.reward_points_type }})
            <span v-if="item.template_key"> · {{ item.template_key }}</span>
            <span v-if="item.scope"> · {{ scopeLabel(item.scope) }}</span>
          </div>
          <div class="mt-1 text-[12px] text-ink-muted">
            {{ dayjs(item.start_date).format('DD.MM.YYYY') }} —
            {{ dayjs(item.end_date).format('DD.MM.YYYY') }}
            <span v-if="item.participants_count != null">
              · участников: {{ item.participants_count }}
            </span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <a-button class="lotax-btn-secondary" @click="openProgress(item)">
            <template #icon><BarChartOutlined /></template>
            Прогресс
          </a-button>
          <template v-if="canEdit">
            <a-button class="lotax-btn-secondary" @click="openEdit(item)">Изменить</a-button>
            <a-button danger @click="remove(item)">Удалить</a-button>
          </template>
        </div>
      </article>
    </div>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? 'Редактировать задание' : 'Новое задание'"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="saving"
      centered
      :width="520"
      destroy-on-close
      @ok="save"
    >
      <a-form layout="vertical" class="task-modal-form">
        <a-form-item label="Название" required>
          <a-input v-model:value="form.title" placeholder="Например: 100 поездок за неделю" />
        </a-form-item>
        <a-form-item label="Описание">
          <a-textarea
            v-model:value="form.description"
            :rows="2"
            :auto-size="{ minRows: 2, maxRows: 4 }"
            placeholder="Кратко опишите условие"
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
          <img
            v-if="imagePreview"
            :src="imagePreview"
            alt=""
            class="mt-2 h-20 w-20 rounded-lg object-cover ring-1 ring-line"
          />
        </a-form-item>
        <a-form-item label="Тип задания">
          <a-select
            v-model:value="form.task_type"
            :disabled="Boolean(editing)"
            :options="taskTypeOptions"
          />
        </a-form-item>
        <div class="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <a-form-item label="Цель">
            <a-input-number v-model:value="form.target_value" class="!w-full" :min="1" />
          </a-form-item>
          <a-form-item label="Статус">
            <a-select v-model:value="form.status" :options="statusOptions" />
          </a-form-item>
          <a-form-item label="Тип баллов">
            <a-select
              v-model:value="form.reward_points_type"
              :options="[
                { value: 'system', label: 'Системные' },
                { value: 'park', label: 'Парковые' },
              ]"
            />
          </a-form-item>
          <a-form-item label="Награда">
            <a-input-number
              v-model:value="form.reward_points"
              class="!w-full"
              :min="0"
              addon-after="б."
            />
          </a-form-item>
        </div>
        <a-form-item label="Период" required>
          <a-range-picker
            v-model:value="dateRange"
            class="!w-full"
            format="DD.MM.YYYY HH:mm"
            show-time
          />
        </a-form-item>
        <div class="flex flex-wrap gap-x-6 gap-y-2 pb-1">
          <label class="inline-flex items-center gap-2 text-[13px] text-ink">
            <a-switch v-model:checked="form.auto_join" size="small" />
            Автоучастие
          </label>
          <label class="inline-flex items-center gap-2 text-[13px] text-ink">
            <a-switch v-model:checked="form.notify_on_create" size="small" />
            Уведомить водителей
          </label>
        </div>
        <ScopeFields v-model="scope" :disabled="Boolean(editing)" />
      </a-form>
    </a-modal>
  </div>
</template>
