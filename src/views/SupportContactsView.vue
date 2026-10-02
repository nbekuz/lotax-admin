<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage } from '@/utils/labels'
import {
  supportContactsApi,
  type SupportContactItem,
  type SupportContactType,
} from '@/api/supportContacts'

const org = useOrgStore()

const TYPE_OPTIONS: { value: SupportContactType; label: string }[] = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'max', label: 'MAX' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'vk', label: 'ВКонтакте' },
  { value: 'viber', label: 'Viber' },
  { value: 'phone', label: 'Телефон' },
  { value: 'email', label: 'Email' },
  { value: 'website', label: 'Сайт' },
]

const typeLabel: Record<SupportContactType, string> = Object.fromEntries(
  TYPE_OPTIONS.map((item) => [item.value, item.label]),
) as Record<SupportContactType, string>

const items = ref<SupportContactItem[]>([])
const loading = ref(false)
const saving = ref(false)
const modalOpen = ref(false)
const editing = ref<SupportContactItem | null>(null)

const form = reactive({
  contact_type: 'telegram' as SupportContactType,
  label: '',
  value: '',
  sort_order: 0,
  is_active: true,
  organization_id: undefined as string | undefined,
})

const orgOptions = computed(() =>
  org.myOrganizations.map((item) => ({ value: item.id, label: item.name })),
)

const columns: TableColumnsType<SupportContactItem> = [
  { title: 'Тип', dataIndex: 'contact_type', key: 'contact_type', width: 140 },
  { title: 'Название', dataIndex: 'label', key: 'label', ellipsis: true },
  { title: 'Контакт', dataIndex: 'value', key: 'value', ellipsis: true },
  { title: 'Порядок', dataIndex: 'sort_order', key: 'sort_order', width: 100 },
  { title: 'Статус', dataIndex: 'is_active', key: 'is_active', width: 120 },
  { title: '', key: 'actions', width: 180 },
]

function resetForm() {
  form.contact_type = 'telegram'
  form.label = ''
  form.value = ''
  form.sort_order = items.value.length
  form.is_active = true
  form.organization_id = org.organization?.id || org.myOrganizations[0]?.id
}

function openCreate() {
  editing.value = null
  resetForm()
  modalOpen.value = true
}

function openEdit(row: SupportContactItem) {
  editing.value = row
  form.contact_type = row.contact_type
  form.label = row.label || ''
  form.value = row.value
  form.sort_order = row.sort_order
  form.is_active = row.is_active
  form.organization_id = row.organization_id
  modalOpen.value = true
}

async function load() {
  loading.value = true
  try {
    const { data } = await supportContactsApi.list()
    items.value = data.items ?? []
  } catch (error) {
    message.error(extractErrorMessage(error, 'Не удалось загрузить контакты'))
  } finally {
    loading.value = false
  }
}

async function save() {
  const value = form.value.trim()
  if (!value) {
    message.warning('Укажите ссылку, @username или телефон')
    return Promise.reject(new Error('value'))
  }
  if (orgOptions.value.length > 1 && !form.organization_id) {
    message.warning('Выберите организацию')
    return Promise.reject(new Error('organization'))
  }
  saving.value = true
  const payload = {
    contact_type: form.contact_type,
    value,
    label: form.label.trim() || null,
    sort_order: Number(form.sort_order) || 0,
    is_active: form.is_active,
    organization_id: form.organization_id || null,
  }
  try {
    if (editing.value) {
      await supportContactsApi.update(editing.value.id, payload)
      message.success('Контакт обновлён')
    } else {
      await supportContactsApi.create(payload)
      message.success('Контакт добавлен')
    }
    modalOpen.value = false
    await load()
  } catch (error) {
    message.error(extractErrorMessage(error, 'Не удалось сохранить контакт'))
  } finally {
    saving.value = false
  }
}

async function remove(row: SupportContactItem) {
  try {
    await supportContactsApi.remove(row.id)
    message.success('Контакт удалён')
    await load()
  } catch (error) {
    message.error(extractErrorMessage(error, 'Не удалось удалить контакт'))
  }
}

onMounted(async () => {
  if (!org.myOrganizations.length) {
    try {
      await org.loadDashboard()
    } catch {
      /* organization list is optional for a single-park director */
    }
  }
  resetForm()
  await load()
})
</script>

<template>
  <div>
    <PageHeader
      title="Контакты для водителей"
      subtitle="Telegram, MAX, Facebook и другие. Один тип можно добавить несколько раз. Водитель видит только контакты директора своего парка."
    >
      <template #actions>
        <a-button :loading="loading" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          Добавить
        </a-button>
      </template>
    </PageHeader>

    <a-table
      class="mt-4"
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      row-key="id"
      :locale="{ emptyText: 'Контактов пока нет' }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'contact_type'">
          <span class="lotax-badge lotax-badge--info">
            {{ typeLabel[record.contact_type as SupportContactType] || record.contact_type }}
          </span>
        </template>
        <template v-else-if="column.key === 'label'">
          {{ record.label || '—' }}
        </template>
        <template v-else-if="column.key === 'value'">
          <a
            v-if="record.url"
            class="text-brand"
            :href="record.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ record.value }}
          </a>
          <span v-else>{{ record.value }}</span>
        </template>
        <template v-else-if="column.key === 'is_active'">
          <span
            class="lotax-badge"
            :class="record.is_active ? 'lotax-badge--success' : 'lotax-badge--muted'"
          >
            {{ record.is_active ? 'Виден' : 'Скрыт' }}
          </span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="flex flex-wrap gap-2">
            <a-button size="small" @click="openEdit(record as SupportContactItem)">
              Изменить
            </a-button>
            <a-popconfirm
              title="Удалить контакт?"
              ok-text="Удалить"
              cancel-text="Отмена"
              @confirm="remove(record as SupportContactItem)"
            >
              <a-button size="small" danger>Удалить</a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? 'Изменить контакт' : 'Новый контакт'"
      :confirm-loading="saving"
      ok-text="Сохранить"
      cancel-text="Отмена"
      @ok="save"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item v-if="orgOptions.length > 1" label="Организация">
          <a-select
            v-model:value="form.organization_id"
            :options="orgOptions"
            placeholder="Выберите организацию"
          />
        </a-form-item>
        <a-form-item label="Тип" required>
          <a-select v-model:value="form.contact_type" :options="TYPE_OPTIONS" />
        </a-form-item>
        <a-form-item label="Название">
          <a-input v-model:value="form.label" placeholder="Например, Диспетчер" :maxlength="120" />
        </a-form-item>
        <a-form-item label="Контакт" required>
          <a-input
            v-model:value="form.value"
            placeholder="@username, ссылка или телефон"
            :maxlength="500"
          />
        </a-form-item>
        <a-form-item label="Порядок">
          <a-input-number v-model:value="form.sort_order" :min="0" :max="10000" class="w-full" />
        </a-form-item>
        <a-form-item label="Показывать водителям">
          <a-switch v-model:checked="form.is_active" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
