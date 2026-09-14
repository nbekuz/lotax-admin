<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import dayjs, { type Dayjs } from 'dayjs'
import {
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'
import { bannersApi } from '@/api/banners'
import { superAdminApi } from '@/api/superAdmin'
import { useAuthStore } from '@/stores/auth'
import {
  bannerAudienceLabel,
  extractErrorMessage,
  isForbiddenError,
} from '@/utils/labels'
import type {
  BannerItem,
  BannerTargetAudience,
  OrganizationResponse,
  ParkResponse,
} from '@/types/api'
import PageHeader from '@/components/PageHeader.vue'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const items = ref<BannerItem[]>([])
const activeFilter = ref<'all' | 'active' | 'off'>('all')
const modalOpen = ref(false)
const previewOpen = ref(false)
const preview = ref<BannerItem | null>(null)
const previewLoading = ref(false)
const editing = ref<BannerItem | null>(null)

const organizations = ref<OrganizationResponse[]>([])
const parks = ref<ParkResponse[]>([])
const parksLoading = ref(false)
const helperOrgId = ref<string | undefined>(undefined)

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `Всего: ${total}`,
})

const form = reactive({
  title: '',
  image_url: '',
  link_url: '',
  is_active: true,
  display_order: 0,
  target_audience: 'all' as BannerTargetAudience,
  organization_id: undefined as string | undefined,
  park_id: undefined as string | undefined,
})

const startsAt = ref<Dayjs | undefined>(undefined)
const endsAt = ref<Dayjs | undefined>(undefined)

const audienceOptions = [
  { value: 'all', label: bannerAudienceLabel.all },
  { value: 'organization', label: bannerAudienceLabel.organization },
  { value: 'park', label: bannerAudienceLabel.park },
]

const orgOptions = computed(() =>
  organizations.value.map((o) => ({ value: o.id, label: o.name })),
)

const parkOptions = computed(() => {
  const options = parks.value.map((p) => ({ value: p.id, label: p.name }))
  const current = form.park_id
  if (current && !options.some((o) => o.value === current)) {
    options.unshift({ value: current, label: current })
  }
  return options
})

function audienceLabel(value: string) {
  return bannerAudienceLabel[value as BannerTargetAudience] ?? value
}

async function loadOrgs() {
  try {
    const { data } = await superAdminApi.listOrganizations({
      page: 1,
      page_size: 100,
    })
    organizations.value = data.items
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось загрузить организации'))
  }
}

async function loadParks(orgId?: string) {
  parks.value = []
  if (!orgId) return
  parksLoading.value = true
  try {
    const { data } = await superAdminApi.listOrganizationParks(orgId, {
      page: 1,
      page_size: 100,
    })
    parks.value = data.items
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось загрузить парки'))
  } finally {
    parksLoading.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const { data } = await bannersApi.list({
      page: pagination.current,
      page_size: pagination.pageSize,
      is_active:
        activeFilter.value === 'all'
          ? null
          : activeFilter.value === 'active',
    })
    items.value = [...data.items].sort(
      (a, b) => a.display_order - b.display_order,
    )
    pagination.total = data.total
    pagination.current = data.page
    pagination.pageSize = data.page_size
  } catch (e) {
    if (isForbiddenError(e)) {
      message.error('Нет доступа к баннерам')
      return
    }
    message.error(extractErrorMessage(e, 'Не удалось загрузить баннеры'))
  } finally {
    loading.value = false
  }
}

function onTableChange(pag: { current?: number; pageSize?: number }) {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 20
  void load()
}

function resetForm() {
  form.title = ''
  form.image_url = ''
  form.link_url = ''
  form.is_active = true
  form.display_order = 0
  form.target_audience = 'all'
  form.organization_id = undefined
  form.park_id = undefined
  helperOrgId.value = undefined
  parks.value = []
  startsAt.value = dayjs()
  endsAt.value = dayjs().add(7, 'day')
}

function openCreate() {
  editing.value = null
  resetForm()
  modalOpen.value = true
}

async function openEdit(item: BannerItem) {
  editing.value = item
  form.title = item.title
  form.image_url = item.image_url
  form.link_url = item.link_url || ''
  form.is_active = item.is_active
  form.display_order = item.display_order
  form.target_audience = (item.target_audience as BannerTargetAudience) || 'all'
  form.organization_id = item.organization_id || undefined
  form.park_id = item.park_id || undefined
  startsAt.value = item.starts_at ? dayjs(item.starts_at) : undefined
  endsAt.value = item.ends_at ? dayjs(item.ends_at) : undefined
  helperOrgId.value = item.organization_id || undefined
  if (form.target_audience === 'park' && helperOrgId.value) {
    await loadParks(helperOrgId.value)
  } else {
    parks.value = []
  }
  modalOpen.value = true
}

async function openPreview(item: BannerItem) {
  previewOpen.value = true
  previewLoading.value = true
  preview.value = item
  try {
    const { data } = await bannersApi.getById(item.id)
    preview.value = data
  } catch (e) {
    message.error(extractErrorMessage(e, 'Баннер не найден'))
    previewOpen.value = false
  } finally {
    previewLoading.value = false
  }
}

function confirmDelete(item: BannerItem) {
  Modal.confirm({
    title: 'Удалить баннер?',
    content: `«${item.title}» будет удалён без возможности восстановления.`,
    okText: 'Удалить',
    cancelText: 'Отмена',
    okButtonProps: { danger: true },
    centered: true,
    async onOk() {
      try {
        const { data } = await bannersApi.remove(item.id)
        message.success(data?.message || 'Баннер удалён')
        await load()
      } catch (e) {
        message.error(extractErrorMessage(e, 'Не удалось удалить баннер'))
        throw e
      }
    },
  })
}

function validateForm(): string | null {
  if (!form.title.trim()) return 'Укажите название'
  if (!form.image_url.trim()) return 'Укажите URL изображения'
  if (!startsAt.value || !endsAt.value) return 'Укажите период показа'
  if (!endsAt.value.isAfter(startsAt.value)) {
    return 'Дата окончания должна быть позже даты начала'
  }
  if (form.target_audience === 'organization' && !form.organization_id) {
    return 'Выберите организацию'
  }
  if (form.target_audience === 'park' && !form.park_id) {
    return 'Выберите парк'
  }
  return null
}

async function save() {
  const error = validateForm()
  if (error) {
    message.warning(error)
    return
  }
  saving.value = true
  try {
    const payload = {
      title: form.title.trim(),
      image_url: form.image_url.trim(),
      link_url: form.link_url.trim() || null,
      starts_at: startsAt.value!.toISOString(),
      ends_at: endsAt.value!.toISOString(),
      is_active: form.is_active,
      display_order: form.display_order,
      target_audience: form.target_audience,
      organization_id:
        form.target_audience === 'organization'
          ? form.organization_id || null
          : null,
      park_id: form.target_audience === 'park' ? form.park_id || null : null,
    }
    if (editing.value) {
      await bannersApi.update(editing.value.id, payload)
      message.success('Баннер обновлён')
    } else {
      await bannersApi.create(payload)
      message.success('Баннер создан')
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось сохранить баннер'))
  } finally {
    saving.value = false
  }
}

watch(activeFilter, () => {
  pagination.current = 1
  void load()
})

watch(
  () => form.target_audience,
  (audience) => {
    if (audience === 'all') {
      form.organization_id = undefined
      form.park_id = undefined
      helperOrgId.value = undefined
      parks.value = []
    }
    if (audience === 'organization') {
      form.park_id = undefined
      parks.value = []
    }
    if (audience === 'park') {
      if (!helperOrgId.value && form.organization_id) {
        helperOrgId.value = form.organization_id
        void loadParks(form.organization_id)
      }
      form.organization_id = undefined
    }
  },
)

function onHelperOrgChange(id: unknown) {
  const orgId = id ? String(id) : undefined
  helperOrgId.value = orgId
  form.park_id = undefined
  void loadParks(orgId)
}

onMounted(async () => {
  if (!auth.canManageBanners) return
  await Promise.all([load(), loadOrgs()])
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <PageHeader
      title="Баннеры"
      subtitle="Реклама в приложении водителя. Меньший порядок — выше в карусели"
    >
      <template #actions>
        <a-select
          v-model:value="activeFilter"
          class="!w-44"
          size="large"
          :options="[
            { value: 'all', label: 'Все' },
            { value: 'active', label: 'Активные' },
            { value: 'off', label: 'Неактивные' },
          ]"
        />
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

    <section class="lotax-card overflow-hidden">
      <a-table
        row-key="id"
        :data-source="items"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 920 }"
        @change="onTableChange"
      >
        <a-table-column key="preview" title="" :width="72">
          <template #default="{ record }: { record: BannerItem }">
            <img
              v-if="record.image_url"
              :src="record.image_url"
              alt=""
              class="h-10 w-14 rounded-lg object-cover ring-1 ring-line"
            />
          </template>
        </a-table-column>
        <a-table-column key="title" title="Название" data-index="title" ellipsis />
        <a-table-column key="audience" title="Аудитория" :width="140">
          <template #default="{ record }: { record: BannerItem }">
            {{ audienceLabel(record.target_audience) }}
          </template>
        </a-table-column>
        <a-table-column key="period" title="Период" :width="220">
          <template #default="{ record }: { record: BannerItem }">
            {{ dayjs(record.starts_at).format('DD.MM.YYYY HH:mm') }}
            —
            {{ dayjs(record.ends_at).format('DD.MM.YYYY HH:mm') }}
          </template>
        </a-table-column>
        <a-table-column key="order" title="Порядок" data-index="display_order" :width="100" />
        <a-table-column key="status" title="Статус" :width="120">
          <template #default="{ record }: { record: BannerItem }">
            <span
              class="rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
              :class="
                record.is_active
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-slate-100 text-slate-600 ring-slate-300'
              "
            >
              {{ record.is_active ? 'Активен' : 'Выключен' }}
            </span>
          </template>
        </a-table-column>
        <a-table-column key="actions" title="" :width="200" align="right">
          <template #default="{ record }: { record: BannerItem }">
            <div class="flex justify-end gap-2">
              <a-button size="small" class="lotax-btn-secondary" @click="openPreview(record)">
                <template #icon><EyeOutlined /></template>
                Просмотр
              </a-button>
              <a-button size="small" class="lotax-btn-secondary" @click="openEdit(record)">
                Изменить
              </a-button>
              <a-button size="small" danger @click="confirmDelete(record)">
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </div>
          </template>
        </a-table-column>
      </a-table>
    </section>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? 'Редактировать баннер' : 'Новый баннер'"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="saving"
      centered
      :width="560"
      destroy-on-close
      @ok="save"
    >
      <a-form layout="vertical">
        <a-form-item label="Название" required>
          <a-input v-model:value="form.title" placeholder="Весенний бонус" />
        </a-form-item>
        <a-form-item label="URL изображения" required>
          <a-input v-model:value="form.image_url" placeholder="https://cdn.example/banner.png" />
        </a-form-item>
        <a-form-item label="Ссылка (необязательно)">
          <a-input v-model:value="form.link_url" placeholder="https://lotax.app/promo" />
        </a-form-item>
        <div class="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
          <a-form-item label="Начало" required>
            <a-date-picker
              v-model:value="startsAt"
              class="!w-full"
              show-time
              format="DD.MM.YYYY HH:mm"
            />
          </a-form-item>
          <a-form-item label="Окончание" required>
            <a-date-picker
              v-model:value="endsAt"
              class="!w-full"
              show-time
              format="DD.MM.YYYY HH:mm"
            />
          </a-form-item>
          <a-form-item label="Аудитория" required>
            <a-select v-model:value="form.target_audience" :options="audienceOptions" />
          </a-form-item>
          <a-form-item label="Порядок">
            <a-input-number v-model:value="form.display_order" class="!w-full" :min="0" />
          </a-form-item>
        </div>
        <a-form-item
          v-if="form.target_audience === 'organization'"
          label="Организация"
          required
        >
          <a-select
            v-model:value="form.organization_id"
            show-search
            option-filter-prop="label"
            placeholder="Выберите организацию"
            :options="orgOptions"
          />
        </a-form-item>
        <template v-if="form.target_audience === 'park'">
          <a-form-item label="Организация" required>
            <a-select
              v-model:value="helperOrgId"
              show-search
              option-filter-prop="label"
              placeholder="Сначала выберите организацию"
              :options="orgOptions"
              @change="onHelperOrgChange"
            />
          </a-form-item>
          <a-form-item label="Парк" required>
            <a-select
              v-model:value="form.park_id"
              show-search
              option-filter-prop="label"
              :loading="parksLoading"
              :disabled="!helperOrgId"
              placeholder="Выберите парк"
              :options="parkOptions"
            />
          </a-form-item>
        </template>
        <a-form-item label="Статус">
          <div class="flex items-center gap-2">
            <a-switch v-model:checked="form.is_active" />
            <span class="text-[13px] text-ink-muted">
              {{ form.is_active ? 'Активен' : 'Выключен' }}
            </span>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="previewOpen"
      title="Просмотр баннера"
      :footer="null"
      centered
      :width="560"
    >
      <div v-if="previewLoading" class="flex justify-center py-10">
        <a-spin />
      </div>
      <div v-else-if="preview" class="flex flex-col gap-4">
        <img
          v-if="preview.image_url"
          :src="preview.image_url"
          :alt="preview.title"
          class="w-full rounded-xl object-cover ring-1 ring-line"
        />
        <div>
          <h2 class="text-lg font-semibold text-ink">{{ preview.title }}</h2>
          <p class="lotax-caption mt-1">
            {{ audienceLabel(preview.target_audience) }}
            · порядок {{ preview.display_order }}
            · {{ preview.is_active ? 'активен' : 'выключен' }}
          </p>
        </div>
        <p class="text-[14px] text-ink-muted">
          {{ dayjs(preview.starts_at).format('DD.MM.YYYY HH:mm') }}
          —
          {{ dayjs(preview.ends_at).format('DD.MM.YYYY HH:mm') }}
        </p>
        <a
          v-if="preview.link_url"
          :href="preview.link_url"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[14px] text-brand break-all"
        >
          {{ preview.link_url }}
        </a>
      </div>
    </a-modal>
  </div>
</template>
