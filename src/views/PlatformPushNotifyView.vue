<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  NotificationOutlined,
  PlusOutlined,
  SendOutlined,
} from '@ant-design/icons-vue'
import { superAdminApi } from '@/api/superAdmin'
import { extractErrorMessage } from '@/utils/labels'
import type { OrganizationResponse, PushNotifyCategory } from '@/types/api'
import PageHeader from '@/components/PageHeader.vue'

const HISTORY_KEY = 'lotax.superadmin.push.history'
const HISTORY_LIMIT = 100

interface PlatformPushHistoryItem {
  id: string
  title: string
  body: string
  category: PushNotifyCategory
  all_organizations: boolean
  organization_ids: string[]
  organization_names: string[]
  success_count: number
  failure_count: number
  devices_targeted: number
  sent_at: string
}

const sending = ref(false)
const loadingOrgs = ref(false)
const modalOpen = ref(false)
const organizations = ref<OrganizationResponse[]>([])
const history = ref<PlatformPushHistoryItem[]>([])

const form = reactive({
  title: '',
  body: '',
  category: 'promo' as PushNotifyCategory,
  all_organizations: false,
  organization_ids: [] as string[],
})

const categoryOptions = [
  { value: 'promo', label: 'Промо' },
  { value: 'tasks', label: 'Задания' },
  { value: 'competitions', label: 'Соревнования' },
  { value: 'referrals', label: 'Рефералы' },
  { value: 'earn_points', label: 'Баллы' },
]

const categoryLabel = computed(() =>
  Object.fromEntries(categoryOptions.map((o) => [o.value, o.label])),
)

const orgOptions = computed(() =>
  organizations.value.map((o) => ({ value: o.id, label: o.name })),
)

const orgNameById = computed(() => {
  const map = new Map<string, string>()
  for (const o of organizations.value) map.set(o.id, o.name)
  return map
})

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) {
      history.value = []
      return
    }
    const parsed = JSON.parse(raw) as PlatformPushHistoryItem[]
    history.value = Array.isArray(parsed) ? parsed : []
  } catch {
    history.value = []
  }
}

function saveHistory(items: PlatformPushHistoryItem[]) {
  history.value = items.slice(0, HISTORY_LIMIT)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
}

function resetForm() {
  form.title = ''
  form.body = ''
  form.category = 'promo'
  form.all_organizations = false
  form.organization_ids = []
}

function openCreate() {
  resetForm()
  modalOpen.value = true
  if (!organizations.value.length) void loadOrganizations()
}

function audienceLabel(item: PlatformPushHistoryItem) {
  if (item.all_organizations) return 'Все организации'
  if (!item.organization_names.length) {
    return `${item.organization_ids.length || '—'} орг.`
  }
  if (item.organization_names.length <= 2) {
    return item.organization_names.join(', ')
  }
  return `${item.organization_names.slice(0, 2).join(', ')} +${item.organization_names.length - 2}`
}

async function loadOrganizations() {
  loadingOrgs.value = true
  try {
    const pageSize = 10
    const all: OrganizationResponse[] = []
    let page = 1
    let total = Infinity

    while (all.length < total) {
      const { data } = await superAdminApi.listOrganizations({
        page,
        page_size: pageSize,
      })
      const batch = data.items ?? []
      all.push(...batch)
      total = data.total ?? all.length
      if (batch.length < pageSize) break
      page += 1
      if (page > 100) break
    }

    organizations.value = all
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось загрузить организации'))
  } finally {
    loadingOrgs.value = false
  }
}

function onAllOrgsChange(checked: boolean | string | number) {
  const on = Boolean(checked)
  form.all_organizations = on
  if (on) form.organization_ids = []
}

async function send() {
  if (!form.title.trim() || !form.body.trim()) {
    message.warning('Укажите заголовок и текст')
    return
  }
  if (!form.all_organizations && form.organization_ids.length === 0) {
    message.warning('Выберите организации или «Все организации»')
    return
  }
  sending.value = true
  try {
    const title = form.title.trim()
    const body = form.body.trim()
    const category = form.category
    const allOrgs = form.all_organizations
    const orgIds = [...form.organization_ids]

    const { data } = await superAdminApi.pushNotify({
      title,
      body,
      category,
      all_organizations: allOrgs || undefined,
      organization_ids: allOrgs ? undefined : orgIds,
      data: { type: 'promo' },
    })

    if (data.devices_targeted === 0) {
      message.warning(data.detail || 'Нет активных устройств')
    } else {
      message.success(
        `Отправлено: ${data.success_count} · ошибок: ${data.failure_count} · устройств: ${data.devices_targeted}`,
      )
    }

    const names = orgIds
      .map((id) => orgNameById.value.get(id) ?? id)
      .filter(Boolean)

    saveHistory([
      {
        id: crypto.randomUUID(),
        title,
        body,
        category,
        all_organizations: allOrgs,
        organization_ids: orgIds,
        organization_names: names,
        success_count: data.success_count,
        failure_count: data.failure_count,
        devices_targeted: data.devices_targeted,
        sent_at: new Date().toISOString(),
      },
      ...history.value,
    ])

    modalOpen.value = false
    resetForm()
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось отправить push'))
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  loadHistory()
  void loadOrganizations()
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <PageHeader
      title="Push по организациям"
      subtitle="История рассылок · новый push — через кнопку"
    >
      <template #actions>
        <a-button type="primary" class="lotax-btn-primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          Новый push
        </a-button>
      </template>
    </PageHeader>

    <div
      v-if="!history.length"
      class="lotax-card lotax-empty"
    >
      <div class="lotax-empty__icon">
        <NotificationOutlined />
      </div>
      <p class="text-[16px] font-semibold text-ink">Пока нет отправок</p>
      <p class="lotax-caption mt-1 max-w-sm">
        Отправленные push появятся здесь. История хранится в этом браузере.
      </p>
      <a-button
        type="primary"
        class="lotax-btn-primary mt-4"
        @click="openCreate"
      >
        <template #icon><PlusOutlined /></template>
        Отправить первый push
      </a-button>
    </div>

    <div v-else class="flex flex-col gap-3">
      <article
        v-for="item in history"
        :key="item.id"
        class="lotax-card lotax-card-hover p-4 md:p-5"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-[15px] font-semibold text-ink sm:text-[16px]">
                {{ item.title }}
              </h3>
              <span
                class="inline-flex items-center rounded-full bg-[var(--lotax-bg)] px-2.5 py-1 text-[12px] font-medium text-ink ring-1 ring-inset ring-line"
              >
                {{ categoryLabel[item.category] ?? item.category }}
              </span>
            </div>
            <p class="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
              {{ item.body }}
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-muted">
              <span
                class="inline-flex items-center rounded-full bg-[var(--lotax-primary-soft)] px-2.5 py-1 font-medium text-[var(--lotax-primary)]"
              >
                {{ audienceLabel(item) }}
              </span>
              <span class="tabular-nums">
                {{ dayjs(item.sent_at).format('DD.MM.YYYY HH:mm') }}
              </span>
            </div>
          </div>
          <div
            class="shrink-0 rounded-[12px] bg-[var(--lotax-bg)] px-3 py-2 text-[12px] text-ink-muted ring-1 ring-line sm:text-right"
          >
            <p>
              Успех
              <span class="font-semibold tabular-nums text-[var(--lotax-success)]">
                {{ item.success_count }}
              </span>
            </p>
            <p>
              Ошибки
              <span class="font-semibold tabular-nums text-ink">
                {{ item.failure_count }}
              </span>
            </p>
            <p>
              Устройств
              <span class="font-semibold tabular-nums text-ink">
                {{ item.devices_targeted }}
              </span>
            </p>
          </div>
        </div>
      </article>
    </div>

    <a-modal
      v-model:open="modalOpen"
      title="Новый push"
      centered
      :width="520"
      :confirm-loading="sending"
      destroy-on-close
      :footer="null"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Категория">
          <a-select
            v-model:value="form.category"
            class="!w-full"
            :options="categoryOptions"
          />
        </a-form-item>
        <a-form-item label="Заголовок" required>
          <a-input
            v-model:value="form.title"
            :maxlength="120"
            placeholder="Акция LOTAX"
          />
        </a-form-item>
        <a-form-item label="Текст" required>
          <a-textarea
            v-model:value="form.body"
            :rows="4"
            :maxlength="500"
            placeholder="Купите купон розыгрыша и выиграйте приз"
          />
        </a-form-item>
        <a-form-item>
          <div class="flex items-center gap-2">
            <a-switch
              :checked="form.all_organizations"
              @change="onAllOrgsChange"
            />
            <span class="text-[14px] text-ink">Все организации</span>
          </div>
        </a-form-item>
        <a-form-item v-if="!form.all_organizations" label="Организации" required>
          <a-select
            v-model:value="form.organization_ids"
            mode="multiple"
            class="!w-full"
            :loading="loadingOrgs"
            :options="orgOptions"
            option-filter-prop="label"
            show-search
            placeholder="Выберите организации"
          />
        </a-form-item>
      </a-form>
      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <a-button class="lotax-btn-secondary" @click="modalOpen = false">
          Отмена
        </a-button>
        <a-button
          type="primary"
          class="lotax-btn-primary"
          :loading="sending"
          @click="send"
        >
          <template #icon><SendOutlined /></template>
          Отправить
        </a-button>
      </div>
    </a-modal>
  </div>
</template>
