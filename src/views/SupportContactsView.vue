<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage, formatPhone } from '@/utils/labels'
import {
  allowsUsernameOrPhone,
  contactOpenUrl,
  contactStoredValue,
  defaultEntryMode,
  extractProfileHandle,
  formatRuNational,
  parseStoredContact,
  takeRuNationalDigits,
  type ContactEntryMode,
} from '@/utils/supportContact'
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
const movingId = ref<string | null>(null)
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

const entryMode = ref<ContactEntryMode>('username')
const phoneDigits = ref('')
const username = ref('')
const hydrating = ref(false)

const phoneDisplay = computed(() => formatRuNational(phoneDigits.value))
const usernameField = computed(() => form.value || username.value)
const showsPhone = computed(
  () => entryMode.value === 'phone' || defaultEntryMode(form.contact_type) === 'phone',
)
const showsUsername = computed(() => !showsPhone.value && entryMode.value === 'username')
const openPreview = computed(() =>
  contactOpenUrl(form.contact_type, {
    mode: showsPhone.value ? 'phone' : entryMode.value,
    phoneDigits: phoneDigits.value,
    username: username.value,
    text: form.value,
  }),
)

const fieldLabel = computed(() => {
  if (showsPhone.value) return 'Телефон'
  if (form.contact_type === 'email') return 'Email'
  if (form.contact_type === 'website') return 'Адрес сайта'
  return 'Username'
})

const plainPlaceholder = computed(() =>
  form.contact_type === 'email' ? 'help@park.ru' : 'park.example.ru',
)

const orgOptions = computed(() =>
  org.myOrganizations.map((item) => ({ value: item.id, label: item.name })),
)

const orderedItems = computed(() =>
  [...items.value].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.created_at.localeCompare(b.created_at)
  }),
)

const columns: TableColumnsType<SupportContactItem> = [
  { title: '', key: 'order', width: 44 },
  { title: 'Тип', dataIndex: 'contact_type', key: 'contact_type', width: 140 },
  { title: 'Название', dataIndex: 'label', key: 'label', ellipsis: true },
  { title: 'Контакт', dataIndex: 'value', key: 'value', ellipsis: true },
  { title: 'Порядок', dataIndex: 'sort_order', key: 'sort_order', width: 100 },
  { title: 'Статус', dataIndex: 'is_active', key: 'is_active', width: 120 },
  { title: '', key: 'actions', width: 88, align: 'right' },
]

function displayContact(row: SupportContactItem): string {
  const digits = row.value.replace(/\D/g, '')
  const phoneLike =
    row.value.startsWith('+') ||
    (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8')))
  if (!phoneLike) return row.value
  const formatted = formatPhone(row.value)
  return formatted === '—' ? row.value : formatted
}

function clearContactDraft() {
  form.value = ''
  phoneDigits.value = ''
  username.value = ''
  entryMode.value = defaultEntryMode(form.contact_type)
}

function resetForm() {
  form.contact_type = 'telegram'
  form.label = ''
  clearContactDraft()
  form.sort_order = items.value.length
  form.is_active = true
  form.organization_id = org.organization?.id || org.myOrganizations[0]?.id
}

function onTypeChange() {
  if (hydrating.value) return
  clearContactDraft()
}

function onModeChange() {
  if (hydrating.value) return
  form.value = ''
  phoneDigits.value = ''
  username.value = ''
}

function setMode(mode: ContactEntryMode) {
  if (entryMode.value === mode) return
  entryMode.value = mode
  onModeChange()
}

function onPhoneInput(raw: string) {
  form.value = ''
  phoneDigits.value = takeRuNationalDigits(raw)
}

function onUsernameInput(raw: string) {
  const trimmed = raw.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    const handle = extractProfileHandle(form.contact_type, trimmed)
    if (handle) {
      username.value = handle
      form.value = ''
      return
    }
    username.value = ''
    form.value = trimmed
    return
  }
  form.value = ''
  username.value = trimmed.replace(/^@+/, '').replace(/\s+/g, '')
}

function openCreate() {
  editing.value = null
  resetForm()
  modalOpen.value = true
}

function openEdit(row: SupportContactItem) {
  hydrating.value = true
  editing.value = row
  form.contact_type = row.contact_type
  form.label = row.label || ''
  const parsed = parseStoredContact(row.contact_type, row.value)
  entryMode.value = parsed.mode
  phoneDigits.value = parsed.phoneDigits
  username.value = parsed.username
  form.value = parsed.text
  form.sort_order = row.sort_order
  form.is_active = row.is_active
  form.organization_id = row.organization_id
  modalOpen.value = true
  hydrating.value = false
}

async function load(silent = false) {
  if (!silent) loading.value = true
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
  const stored = contactStoredValue(form.contact_type, {
    mode: showsPhone.value ? 'phone' : entryMode.value,
    phoneDigits: phoneDigits.value,
    username: username.value,
    text: form.value,
  })
  if (stored.error) {
    message.warning(stored.error)
    return Promise.reject(new Error('value'))
  }
  const value = stored.value
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

async function move(row: SupportContactItem, direction: -1 | 1) {
  const list = orderedItems.value
  const index = list.findIndex((item) => item.id === row.id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= list.length || movingId.value) return

  const next = [...list]
  const [current] = next.splice(index, 1)
  if (!current) return
  next.splice(target, 0, current)

  movingId.value = row.id
  try {
    await Promise.all(
      next.map((entry, order) =>
        entry.sort_order === order
          ? Promise.resolve()
          : supportContactsApi.update(entry.id, {
              contact_type: entry.contact_type,
              value: entry.value,
              label: entry.label,
              sort_order: order,
              is_active: entry.is_active,
              organization_id: entry.organization_id,
            }),
      ),
    )
    await load(true)
  } catch (error) {
    message.error(extractErrorMessage(error, 'Не удалось изменить порядок'))
  } finally {
    movingId.value = null
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
        <a-button :loading="loading" @click="load()">
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
      :data-source="orderedItems"
      :loading="loading"
      :pagination="false"
      row-key="id"
      :locale="{ emptyText: 'Контактов пока нет' }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'order'">
          <div class="contact-order">
            <a-tooltip title="Выше" placement="right">
              <button
                type="button"
                class="contact-order__btn"
                :disabled="orderedItems[0]?.id === record.id || movingId !== null"
                @click="move(record as SupportContactItem, -1)"
              >
                <ArrowUpOutlined />
              </button>
            </a-tooltip>
            <a-tooltip title="Ниже" placement="right">
              <button
                type="button"
                class="contact-order__btn"
                :disabled="
                  orderedItems[orderedItems.length - 1]?.id === record.id || movingId !== null
                "
                @click="move(record as SupportContactItem, 1)"
              >
                <ArrowDownOutlined />
              </button>
            </a-tooltip>
          </div>
        </template>
        <template v-else-if="column.key === 'contact_type'">
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
            {{ displayContact(record as SupportContactItem) }}
          </a>
          <span v-else>{{ displayContact(record as SupportContactItem) }}</span>
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
          <div class="flex justify-end gap-1">
            <a-tooltip title="Изменить">
              <a-button
                size="small"
                class="lotax-btn-secondary"
                @click="openEdit(record as SupportContactItem)"
              >
                <template #icon><EditOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="Удалить">
              <a-popconfirm
                title="Удалить контакт?"
                ok-text="Удалить"
                cancel-text="Отмена"
                @confirm="remove(record as SupportContactItem)"
              >
                <a-button size="small" danger>
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-popconfirm>
            </a-tooltip>
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
          <a-select
            v-model:value="form.contact_type"
            :options="TYPE_OPTIONS"
            @change="onTypeChange"
          />
        </a-form-item>
        <a-form-item label="Название">
          <a-input v-model:value="form.label" placeholder="Например, Диспетчер" :maxlength="120" />
        </a-form-item>
        <a-form-item :label="fieldLabel" required>
          <div v-if="allowsUsernameOrPhone(form.contact_type)" class="contact-mode">
            <button
              type="button"
              class="contact-mode__btn"
              :class="{ 'is-on': entryMode === 'username' }"
              @click="setMode('username')"
            >
              Username
            </button>
            <button
              type="button"
              class="contact-mode__btn"
              :class="{ 'is-on': entryMode === 'phone' }"
              @click="setMode('phone')"
            >
              Телефон
            </button>
          </div>
          <label v-if="showsPhone" class="contact-prefix">
            <span class="contact-prefix__mark">+7</span>
            <input
              class="contact-prefix__input"
              :value="phoneDisplay"
              placeholder="(900) 000-00-00"
              inputmode="tel"
              maxlength="18"
              @input="onPhoneInput(($event.target as HTMLInputElement).value)"
            />
          </label>
          <label v-else-if="showsUsername" class="contact-prefix">
            <span v-if="!form.value" class="contact-prefix__mark">@</span>
            <input
              class="contact-prefix__input"
              :value="usernameField"
              placeholder="username"
              maxlength="200"
              @input="onUsernameInput(($event.target as HTMLInputElement).value)"
            />
          </label>
          <a-input
            v-else
            v-model:value="form.value"
            :placeholder="plainPlaceholder"
            :maxlength="500"
          />
          <p v-if="openPreview" class="mt-2 text-[13px] leading-relaxed text-ink-muted">
            В приложении откроется
            <span class="break-all font-medium text-ink">{{ openPreview }}</span>
          </p>
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

<style scoped>
.contact-order {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.contact-order__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--lotax-border);
  border-radius: 8px;
  background: var(--lotax-card);
  color: var(--lotax-text-secondary);
  cursor: pointer;
  appearance: none;
}

.contact-order__btn:hover:not(:disabled) {
  border-color: var(--lotax-primary);
  color: var(--lotax-primary);
}

.contact-order__btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.contact-mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}

.contact-mode__btn {
  height: 36px;
  padding: 0 8px;
  border: 1px solid var(--lotax-border);
  border-radius: 10px;
  background: transparent;
  color: var(--lotax-text);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  appearance: none;
}

.contact-mode__btn.is-on {
  border-color: var(--lotax-primary);
  color: var(--lotax-primary);
  background: var(--lotax-primary-soft, rgba(247, 147, 26, 0.12));
}

.contact-prefix {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--lotax-border);
  border-radius: 10px;
  background: var(--lotax-card);
}

.contact-prefix:focus-within {
  border-color: var(--lotax-primary);
  box-shadow: 0 0 0 2px rgba(247, 147, 26, 0.15);
}

.contact-prefix__mark {
  flex: none;
  color: var(--lotax-text-secondary);
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
}

.contact-prefix__input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--lotax-text);
  font-size: 14px;
  line-height: 1.4;
}

.contact-prefix__input::placeholder {
  color: var(--lotax-text-secondary);
  opacity: 0.7;
}
</style>
