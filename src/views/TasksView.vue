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
import { adminTaskTemplatesApi } from '@/api/adminTaskTemplates'
import { adminTasksApi } from '@/api/adminTasks'
import ScopeFields, { type ScopeFieldsValue } from '@/components/ScopeFields.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import {
  extractErrorMessage,
  taskStatusLabel,
  taskStatusTone,
  taskTypeLabel,
} from '@/utils/labels'
import {
  defaultSpecificScope,
  scopeFromApi,
  scopeLabel,
  validateScopeFields,
} from '@/utils/scope'
import type {
  TaskAdminItem,
  TaskStatus,
  TaskTemplateItem,
  TaskType,
} from '@/types/api'

const auth = useAuthStore()
const org = useOrgStore()
const router = useRouter()

const loading = ref(false)
const templates = ref<TaskTemplateItem[]>([])
const customItems = ref<TaskAdminItem[]>([])
const togglingKey = ref<string | null>(null)

const modalOpen = ref(false)
const saving = ref(false)
const editing = ref<TaskAdminItem | null>(null)

const editTplOpen = ref(false)
const editTplSaving = ref(false)
const editTplTarget = ref<TaskTemplateItem | null>(null)
const editTplForm = reactive({
  target_value: 1,
  reward_points: 50,
  period_days: undefined as number | undefined,
})

const enableOpen = ref(false)
const enableSaving = ref(false)
const enableTarget = ref<TaskTemplateItem | null>(null)
const enableForm = reactive({
  target_value: 1,
  reward_points: 50,
})

const form = reactive({
  title: '',
  description: '',
  task_type: 'ride_count' as TaskType,
  target_value: 10,
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

const periodOptions = [
  { value: 7, label: '7 дней' },
  { value: 14, label: '14 дней' },
  { value: 30, label: '30 дней' },
  { value: 365, label: '365 дней' },
]

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

function tplPoints(item: TaskTemplateItem) {
  return item.reward_points ?? item.default_reward_points
}

function tplMeta(item: TaskTemplateItem) {
  const bits = [
    `цель ${item.target_value}`,
    `${tplPoints(item)} б.`,
  ]
  if (item.period_days) bits.push(`${item.period_days} дн.`)
  if (item.is_claimable) bits.push('приветствие')
  return bits.join(' · ')
}

async function load() {
  if (!parkId.value) {
    templates.value = []
    customItems.value = []
    return
  }
  loading.value = true
  try {
    const [tplRes, tasksRes] = await Promise.all([
      adminTaskTemplatesApi.list(parkId.value),
      adminTasksApi.list({ park_id: parkId.value }),
    ])
    templates.value = tplRes.data.items ?? []
    customItems.value = (tasksRes.data.items ?? []).filter(
      (t) => !t.template_key,
    )
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loading.value = false
  }
}

function openEnable(item: TaskTemplateItem) {
  enableTarget.value = item
  enableForm.target_value = item.target_value || item.default_target_value || 1
  enableForm.reward_points = tplPoints(item)
  enableOpen.value = true
}

async function confirmEnable() {
  if (!parkId.value || !enableTarget.value) return
  enableSaving.value = true
  togglingKey.value = enableTarget.value.key
  try {
    const payload: {
      park_id: string
      reward_points: number
      reward_points_type: 'park'
      target_value?: number
    } = {
      park_id: parkId.value,
      reward_points: enableForm.reward_points,
      reward_points_type: 'park',
    }
    if (enableTarget.value.editable_target !== false && !enableTarget.value.is_claimable) {
      payload.target_value = enableForm.target_value
    }
    await adminTaskTemplatesApi.enable(enableTarget.value.key, payload)
    message.success('Задание включено')
    enableOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    enableSaving.value = false
    togglingKey.value = null
  }
}

function requestDisable(item: TaskTemplateItem) {
  if (!parkId.value) return
  Modal.confirm({
    title: 'Отключить задание?',
    content: `«${item.title}» станет недоступно водителям. Сохранённые цель и баллы останутся.`,
    okText: 'Отключить',
    cancelText: 'Отмена',
    okButtonProps: { danger: true },
    centered: true,
    async onOk() {
      togglingKey.value = item.key
      try {
        await adminTaskTemplatesApi.disable(item.key, parkId.value!)
        message.success('Задание отключено')
        await load()
      } catch (e) {
        message.error(extractErrorMessage(e))
      } finally {
        togglingKey.value = null
      }
    },
  })
}

function onTplSwitch(item: TaskTemplateItem, checked: boolean) {
  if (!canEdit.value) return
  if (checked) openEnable(item)
  else requestDisable(item)
}

function openEditTpl(item: TaskTemplateItem) {
  if (!item.enabled) {
    message.warning('Сначала включите задание')
    return
  }
  editTplTarget.value = item
  editTplForm.target_value = item.target_value
  editTplForm.reward_points = tplPoints(item)
  editTplForm.period_days = item.period_days ?? undefined
  editTplOpen.value = true
}

async function confirmEditTpl() {
  if (!parkId.value || !editTplTarget.value) return
  if (
    editTplForm.target_value == null &&
    editTplForm.reward_points == null &&
    editTplForm.period_days == null
  ) {
    message.warning('Укажите цель, баллы или период')
    return
  }
  editTplSaving.value = true
  try {
    await adminTaskTemplatesApi.update(editTplTarget.value.key, {
      park_id: parkId.value,
      target_value:
        editTplTarget.value.editable_target === false
          ? undefined
          : editTplForm.target_value,
      reward_points: editTplForm.reward_points,
      period_days:
        editTplTarget.value.editable_period
          ? editTplForm.period_days ?? null
          : undefined,
    })
    message.success('Задание обновлено')
    editTplOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    editTplSaving.value = false
  }
}

function openProgressTpl(item: TaskTemplateItem) {
  if (!item.task_id) {
    message.warning('Задание ещё не создано — включите его')
    return
  }
  router.push({ name: 'task-progress', params: { id: item.task_id } })
}

function openCreate() {
  editing.value = null
  form.title = ''
  form.description = ''
  form.task_type = 'ride_count'
  form.target_value = 10
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
        reward_points_type: 'park',
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
    <PageHeader
      title="Задания"
      subtitle="Дефолтные задания парка и свои. Баллы — только парковые."
    >
      <template #actions>
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
          Своё задание
        </a-button>
      </template>
    </PageHeader>

    <div v-if="!parkId" class="lotax-card p-8 text-center">Выберите парк в шапке</div>
    <div v-else-if="loading" class="flex justify-center py-16"><a-spin size="large" /></div>
    <template v-else>
      <section class="flex flex-col gap-3">
        <h2 class="text-[16px] font-semibold text-ink">По умолчанию</h2>
        <div v-if="!templates.length" class="lotax-card p-6 text-center lotax-caption">
          Дефолтные задания недоступны
        </div>
        <article
          v-for="item in templates"
          :key="item.key"
          class="lotax-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-ink">{{ item.title }}</span>
              <span
                class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset"
                :class="
                  item.enabled
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : 'bg-slate-100 text-slate-600 ring-slate-300'
                "
              >
                {{ item.enabled ? 'Вкл.' : 'Выкл.' }}
              </span>
            </div>
            <p v-if="item.description" class="mt-1 text-[13px] text-ink-muted">
              {{ item.description }}
            </p>
            <p class="mt-1 text-[12px] text-ink-muted">{{ tplMeta(item) }}</p>
          </div>
          <div class="flex shrink-0 flex-wrap items-center gap-2">
            <a-switch
              :checked="Boolean(item.enabled)"
              :disabled="!canEdit || togglingKey === item.key"
              :loading="togglingKey === item.key"
              @change="(v: boolean | string | number) => onTplSwitch(item, Boolean(v))"
            />
            <a-button
              v-if="canEdit"
              class="lotax-btn-secondary"
              size="small"
              :disabled="!item.enabled"
              @click="openEditTpl(item)"
            >
              Изменить
            </a-button>
            <a-button
              class="lotax-btn-secondary"
              size="small"
              :disabled="!item.task_id"
              @click="openProgressTpl(item)"
            >
              <template #icon><BarChartOutlined /></template>
              Прогресс
            </a-button>
          </div>
        </article>
      </section>

      <section class="mt-2 flex flex-col gap-3">
        <h2 class="text-[16px] font-semibold text-ink">Свои задания</h2>
        <div v-if="!customItems.length" class="lotax-card p-6 text-center lotax-caption">
          Своих заданий пока нет
        </div>
        <article
          v-for="item in customItems"
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
              {{ taskTypeLabel[item.task_type as TaskType] ?? item.task_type }} · цель
              {{ item.target_value }} · +{{ item.reward_points }} парковых б.
              <span v-if="item.scope"> · {{ scopeLabel(item.scope) }}</span>
            </div>
            <div class="mt-1 text-[12px] text-ink-muted">
              {{ dayjs(item.start_date).format('DD.MM.YYYY') }} —
              {{ dayjs(item.end_date).format('DD.MM.YYYY') }}
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
      </section>
    </template>

    <!-- Enable default -->
    <a-modal
      v-model:open="enableOpen"
      title="Включить задание"
      ok-text="Включить"
      cancel-text="Отмена"
      :confirm-loading="enableSaving"
      centered
      :width="440"
      destroy-on-close
      @ok="confirmEnable"
    >
      <p v-if="enableTarget" class="mb-3 text-[14px] text-ink">{{ enableTarget.title }}</p>
      <a-form layout="vertical">
        <a-form-item
          v-if="enableTarget && enableTarget.editable_target !== false && !enableTarget.is_claimable"
          :label="enableTarget.key === 'days_120_park' ? 'Дни' : 'Число заказов'"
        >
          <a-input-number v-model:value="enableForm.target_value" class="!w-full" :min="1" />
        </a-form-item>
        <a-form-item label="Награда (парковые баллы)">
          <a-input-number
            v-model:value="enableForm.reward_points"
            class="!w-full"
            :min="0"
            addon-after="б."
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Edit default without disable -->
    <a-modal
      v-model:open="editTplOpen"
      title="Изменить задание"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="editTplSaving"
      centered
      :width="440"
      destroy-on-close
      @ok="confirmEditTpl"
    >
      <p v-if="editTplTarget" class="mb-3 text-[14px] text-ink">{{ editTplTarget.title }}</p>
      <a-form layout="vertical">
        <a-form-item
          v-if="editTplTarget && editTplTarget.editable_target !== false && !editTplTarget.is_claimable"
          :label="editTplTarget.key === 'days_120_park' ? 'Дни' : 'Число заказов'"
        >
          <a-input-number v-model:value="editTplForm.target_value" class="!w-full" :min="1" />
        </a-form-item>
        <a-form-item label="Награда (парковые баллы)">
          <a-input-number
            v-model:value="editTplForm.reward_points"
            class="!w-full"
            :min="0"
            addon-after="б."
          />
        </a-form-item>
        <a-form-item v-if="editTplTarget?.editable_period" label="Период">
          <a-select
            v-model:value="editTplForm.period_days"
            class="!w-full"
            :options="periodOptions"
            allow-clear
            placeholder="Не менять"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Custom create/edit -->
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
          <a-form-item label="Награда">
            <a-input-number
              v-model:value="form.reward_points"
              class="!w-full"
              :min="0"
              addon-after="б."
            />
            <p class="lotax-caption mt-1">Только парковые баллы</p>
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
