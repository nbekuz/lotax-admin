<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import {
  PlusOutlined,
  ReloadOutlined,
  TrophyOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons-vue'
import { adminCompetitionsApi } from '@/api/adminCompetitions'
import ScopeFields, { type ScopeFieldsValue } from '@/components/ScopeFields.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import {
  competitionCriteriaLabel,
  competitionStatusLabel,
  competitionStatusTone,
  extractErrorMessage,
} from '@/utils/labels'
import {
  defaultSpecificScope,
  scopeFromApi,
  scopeLabel,
  validateScopeFields,
} from '@/utils/scope'
import type {
  CompetitionAdminItem,
  CompetitionCriteria,
  CompetitionStatus,
  PointsType,
  PrizePlaceItem,
} from '@/types/api'

const auth = useAuthStore()
const org = useOrgStore()
const router = useRouter()

const loading = ref(false)
const items = ref<CompetitionAdminItem[]>([])
const modalOpen = ref(false)
const saving = ref(false)
const finalizingId = ref<string | null>(null)
const editing = ref<CompetitionAdminItem | null>(null)

const form = reactive({
  title: '',
  description: '',
  criteria: 'max_rides' as CompetitionCriteria,
  count_points_type: 'park' as PointsType,
  prize_places: 3,
  prizes: [] as PrizePlaceItem[],
  prize_points_type: 'park' as PointsType,
  status: 'draft' as CompetitionStatus,
})
const dateRange = ref<[Dayjs, Dayjs]>()
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const scope = ref<ScopeFieldsValue>(defaultSpecificScope())

const parkId = computed(() => org.selectedParkId)
const canEdit = computed(() => auth.canManageCompetitions)

const criteriaOptions = [
  { value: 'max_points', label: competitionCriteriaLabel.max_points },
  { value: 'max_rides', label: competitionCriteriaLabel.max_rides },
]

const statusOptions = [
  { value: 'draft', label: competitionStatusLabel.draft },
  { value: 'scheduled', label: competitionStatusLabel.scheduled },
  { value: 'active', label: competitionStatusLabel.active },
  { value: 'finalizing', label: competitionStatusLabel.finalizing },
  { value: 'completed', label: competitionStatusLabel.completed },
]

function syncPrizePlaces() {
  const count = Math.max(1, Math.min(20, form.prize_places || 1))
  const next: PrizePlaceItem[] = []
  for (let i = 1; i <= count; i++) {
    const existing = form.prizes.find((p) => p.place === i)
    next.push({ place: i, points: existing?.points ?? 0 })
  }
  form.prizes = next
}

watch(() => form.prize_places, syncPrizePlaces)

async function load() {
  if (!parkId.value) {
    items.value = []
    return
  }
  loading.value = true
  try {
    const { data } = await adminCompetitionsApi.list({ park_id: parkId.value })
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
  form.criteria = 'max_rides'
  form.count_points_type = 'park'
  dateRange.value = [dayjs(), dayjs().add(30, 'day')]
  form.prize_places = 3
  form.prize_points_type = 'park'
  form.status = 'draft'
  imageFile.value = null
  imagePreview.value = null
  scope.value = defaultSpecificScope(parkId.value)
  syncPrizePlaces()
  modalOpen.value = true
}

function openEdit(item: CompetitionAdminItem) {
  editing.value = item
  form.title = item.title
  form.description = item.description || ''
  form.criteria = item.criteria
  form.count_points_type = item.count_points_type || 'park'
  dateRange.value = [dayjs(item.start_date), dayjs(item.end_date)]
  form.prize_places = item.prize_places
  form.prizes = item.prizes.map((p) => ({ ...p }))
  form.prize_points_type = item.prize_points_type
  form.status = item.status
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
      await adminCompetitionsApi.update(editing.value.id, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_date,
        end_date,
        prize_places: form.prize_places,
        prizes: form.prizes,
        prize_points_type: 'park',
        status: form.status,
        image: imageFile.value,
      })
      message.success('Соревнование обновлено')
    } else {
      await adminCompetitionsApi.create({
        park_id: parkId.value,
        title: form.title.trim(),
        description: form.description.trim() || null,
        criteria: form.criteria,
        count_points_type: 'park',
        start_date,
        end_date,
        prize_places: form.prize_places,
        prizes: form.prizes,
        prize_points_type: 'park',
        status: form.status,
        scope_type: scope.value.scope_type,
        park_group_id: scope.value.park_group_id,
        park_ids: scope.value.park_ids,
        image: imageFile.value,
      })
      message.success('Соревнование создано')
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

function remove(item: CompetitionAdminItem) {
  Modal.confirm({
    title: 'Удалить соревнование?',
    content: item.title,
    okText: 'Удалить',
    cancelText: 'Отмена',
    okButtonProps: { danger: true },
    centered: true,
    async onOk() {
      try {
        await adminCompetitionsApi.remove(item.id)
        message.success('Соревнование удалено')
        await load()
      } catch (e) {
        message.error(extractErrorMessage(e))
      }
    },
  })
}

function finalize(item: CompetitionAdminItem) {
  Modal.confirm({
    title: 'Подвести итоги соревнования?',
    content: 'Победители получат баллы согласно призовым местам. Действие необратимо.',
    okText: 'Подвести итоги',
    cancelText: 'Отмена',
    centered: true,
    async onOk() {
      finalizingId.value = item.id
      try {
        await adminCompetitionsApi.finalize(item.id)
        message.success('Итоги подведены')
        await load()
      } catch (e) {
        message.error(extractErrorMessage(e))
      } finally {
        finalizingId.value = null
      }
    },
  })
}

function openLeaderboard(item: CompetitionAdminItem) {
  router.push({ name: 'competition-leaderboard', params: { id: item.id } })
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
      title="Соревнования"
      subtitle="Соревнования водителей парка с призовыми местами"
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
          Добавить
        </a-button>
      </template>
    </PageHeader>

    <div v-if="!parkId" class="lotax-card p-8 text-center">Выберите парк в шапке</div>
    <div v-else-if="loading" class="flex justify-center py-16"><a-spin size="large" /></div>
    <div v-else-if="!items.length" class="lotax-card p-8 text-center lotax-caption">
      Соревнований пока нет
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
              :class="competitionStatusTone[item.status]"
            >
              {{ competitionStatusLabel[item.status] }}
            </span>
          </div>
          <div class="mt-1 text-[13px] text-ink-muted">
            {{ competitionCriteriaLabel[item.criteria] }} · призовых мест: {{ item.prize_places }} ·
            фонд {{ item.prizes.reduce((sum, p) => sum + p.points, 0) }} парковых б.
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
          <a-button class="lotax-btn-secondary" @click="openLeaderboard(item)">
            <template #icon><UnorderedListOutlined /></template>
            Лидерборд
          </a-button>
          <a-button
            v-if="auth.canFinalizeCompetition && (item.status === 'active' || item.status === 'finalizing')"
            type="primary"
            class="lotax-btn-primary"
            :loading="finalizingId === item.id"
            @click="finalize(item)"
          >
            <template #icon><TrophyOutlined /></template>
            Завершить
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
      :title="editing ? 'Редактировать соревнование' : 'Новое соревнование'"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="saving"
      centered
      :width="600"
      @ok="save"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Название" required>
          <a-input v-model:value="form.title" size="large" />
        </a-form-item>
        <a-form-item label="Описание">
          <a-textarea v-model:value="form.description" :rows="2" />
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
        <div class="grid grid-cols-2 gap-3">
          <a-form-item label="Критерий">
            <a-select
              v-model:value="form.criteria"
              size="large"
              :disabled="Boolean(editing)"
              :options="criteriaOptions"
            />
          </a-form-item>
        </div>
        <a-form-item label="Период проведения" required>
          <a-range-picker
            v-model:value="dateRange"
            class="!w-full"
            size="large"
            format="DD.MM.YYYY HH:mm"
            show-time
          />
        </a-form-item>
        <a-form-item label="Статус">
          <a-select v-model:value="form.status" size="large" :options="statusOptions" />
        </a-form-item>
        <div class="grid grid-cols-2 gap-3">
          <a-form-item label="Кол-во призовых мест">
            <a-input-number v-model:value="form.prize_places" class="!w-full" :min="1" :max="20" size="large" />
          </a-form-item>
        </div>
        <a-form-item label="Призы по местам">
          <div class="flex flex-col gap-2">
            <div v-for="prize in form.prizes" :key="prize.place" class="flex items-center gap-2">
              <span class="w-16 shrink-0 text-[13px] text-ink-muted">Место {{ prize.place }}</span>
              <a-input-number v-model:value="prize.points" class="!w-full" :min="0" size="large" />
              <span class="shrink-0 text-[13px] text-ink-muted">б.</span>
            </div>
          </div>
        </a-form-item>
        <ScopeFields v-model="scope" :disabled="Boolean(editing)" />
      </a-form>
    </a-modal>
  </div>
</template>
