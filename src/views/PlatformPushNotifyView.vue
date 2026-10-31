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

interface PlatformCampaign {
  id: string
  title: string
  body: string
  deep_link: string
  send_mode: string
  status: string
  sent: number
  failed: number
  clicked: number
}

const sending = ref(false)
const loadingOrgs = ref(false)
const modalOpen = ref(false)
const organizations = ref<OrganizationResponse[]>([])
const history = ref<PlatformPushHistoryItem[]>([])
const campaigns = ref<PlatformCampaign[]>([])

const form = reactive({
  title: '',
  body: '',
  category: 'promo' as PushNotifyCategory,
  all_organizations: false,
  organization_ids: [] as string[],
  send_mode: 'now',
  scheduled_at: '',
  deep_link: 'none',
  frequency: 'daily',
  weekdays: [] as number[],
  time: '09:00',
  until: '',
})

const categoryOptions = [
  { value: 'promo', label: 'Промо' },
  { value: 'coupon', label: 'Купон' },
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

function resetForm() {
  form.title = ''
  form.body = ''
  form.category = 'promo'
  form.all_organizations = false
  form.organization_ids = []
  form.send_mode = 'now'
  form.scheduled_at = ''
  form.deep_link = 'none'
  form.frequency = 'daily'
  form.weekdays = []
  form.time = '09:00'
  form.until = ''
}

async function loadCampaigns() {
  const { data } = await superAdminApi.listPushCampaigns()
  campaigns.value = data
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
  const title = form.title.trim()
  const body = form.body.trim()
  if (title.length > 65 || body.length > 240) {
    message.warning('Заголовок до 65 символов, текст до 240')
    return
  }
  if (form.send_mode === 'scheduled' && !form.scheduled_at) {
    message.warning('Укажите дату и время')
    return
  }
  if (form.send_mode === 'recurring' && form.frequency === 'weekly' && !form.weekdays.length) {
    message.warning('Выберите дни недели')
    return
  }
  sending.value = true
  try {
    await superAdminApi.createPushCampaign({
      title,
      body,
      deep_link: form.deep_link,
      send_mode: form.send_mode,
      scheduled_at: form.send_mode === 'scheduled' ? form.scheduled_at : null,
      schedule:
        form.send_mode === 'recurring'
          ? {
              frequency: form.frequency,
              weekdays: form.weekdays,
              time: form.time,
              until: form.until || null,
            }
          : null,
      target_filter: {
        category: form.category,
        ...(form.all_organizations ? {} : { organization_ids: [...form.organization_ids] }),
      },
    })
    message.success(form.send_mode === 'now' ? 'Отправлено' : 'Рассылка сохранена')
    modalOpen.value = false
    resetForm()
    await loadCampaigns()
    return
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось сохранить рассылку'))
    return
  } finally {
    sending.value = false
  }
}

async function setStatus(row: Record<string, string>, status: string) {
  try {
    await superAdminApi.setPushCampaignStatus(row.id, status)
    await loadCampaigns()
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось изменить статус'))
  }
}

onMounted(() => {
  loadHistory()
  void loadOrganizations()
  void loadCampaigns()
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <PageHeader
      title="Push по организациям"
      subtitle="Сейчас, в выбранное время или по расписанию. В тексте можно писать {driver_name}, {points_balance}, {rank}."
    >
      <template #actions>
        <a-button type="primary" class="lotax-btn-primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          Новый push
        </a-button>
      </template>
    </PageHeader>

    <section v-if="campaigns.length" class="lotax-card p-5">
      <a-table
        row-key="id"
        :pagination="false"
        size="small"
        :data-source="campaigns"
        :columns="[
          { title: 'Заголовок', dataIndex: 'title', key: 'title' },
          { title: 'Режим', dataIndex: 'send_mode', key: 'send_mode' },
          { title: 'Статус', dataIndex: 'status', key: 'status' },
          { title: 'Доставлено', dataIndex: 'sent', key: 'sent', width: 110 },
          { title: 'Клики', dataIndex: 'clicked', key: 'clicked', width: 80 },
          { title: '', key: 'actions', width: 160 },
        ]"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <a-button
              v-if="record.status === 'active' && record.send_mode === 'recurring'"
              type="link"
              @click="setStatus(record, 'paused')"
            >
              Пауза
            </a-button>
            <a-button
              v-else-if="record.status === 'paused'"
              type="link"
              @click="setStatus(record, 'active')"
            >
              Включить
            </a-button>
            <a-button
              v-if="record.status !== 'cancelled' && record.status !== 'done'"
              type="link"
              danger
              @click="setStatus(record, 'cancelled')"
            >
              Отменить
            </a-button>
          </template>
        </template>
      </a-table>
    </section>

    <div
      v-if="!history.length && !campaigns.length"
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

    <div v-else-if="history.length" class="flex flex-col gap-3">
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
      <p class="mb-3 text-[13px] leading-relaxed text-ink-muted">
        Перед эфиром укажите ссылку Zoom в тексте. Это не повтор пуша, который сервер уже отправил при создании активного купона.
      </p>
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Когда">
          <a-select
            v-model:value="form.send_mode"
            class="!w-full"
            :options="[
              { value: 'now', label: 'Сейчас' },
              { value: 'scheduled', label: 'В выбранное время' },
              { value: 'recurring', label: 'По расписанию' },
            ]"
          />
        </a-form-item>
        <a-form-item v-if="form.send_mode === 'scheduled'" label="Дата и время (Москва)">
          <a-input v-model:value="form.scheduled_at" placeholder="2026-11-02T07:30:00" />
        </a-form-item>
        <template v-if="form.send_mode === 'recurring'">
          <a-form-item label="Периодичность">
            <a-select
              v-model:value="form.frequency"
              class="!w-full"
              :options="[
                { value: 'daily', label: 'Каждый день' },
                { value: 'weekdays', label: 'По рабочим дням' },
                { value: 'weekends', label: 'По выходным' },
                { value: 'weekly', label: 'По выбранным дням' },
                { value: 'monthly', label: '1-го числа' },
              ]"
            />
          </a-form-item>
          <a-form-item v-if="form.frequency === 'weekly'" label="Дни">
            <a-select
              v-model:value="form.weekdays"
              mode="multiple"
              class="!w-full"
              :options="[
                { value: 0, label: 'Пн' },
                { value: 1, label: 'Вт' },
                { value: 2, label: 'Ср' },
                { value: 3, label: 'Чт' },
                { value: 4, label: 'Пт' },
                { value: 5, label: 'Сб' },
                { value: 6, label: 'Вс' },
              ]"
            />
          </a-form-item>
          <a-form-item label="Время (Москва)">
            <a-input v-model:value="form.time" placeholder="07:30" />
          </a-form-item>
          <a-form-item label="До даты, если нужно">
            <a-input v-model:value="form.until" placeholder="2026-12-31" />
          </a-form-item>
        </template>
        <a-form-item label="Куда открыть">
          <a-select
            v-model:value="form.deep_link"
            class="!w-full"
            :options="[
              { value: 'none', label: 'Без перехода' },
              { value: 'tasks', label: 'Задания' },
              { value: 'rewards', label: 'Каталог наград' },
              { value: 'competition', label: 'Турнир' },
              { value: 'chat', label: 'Чат с парком' },
            ]"
          />
        </a-form-item>
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
            :maxlength="65"
            placeholder="Розыгрыш LOTAX сейчас"
          />
        </a-form-item>
        <a-form-item label="Текст" required>
          <a-textarea
            v-model:value="form.body"
            :rows="4"
            :maxlength="240"
            placeholder="Эфир: https://zoom.us/…"
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
          {{ form.send_mode === 'now' ? 'Отправить' : 'Сохранить' }}
        </a-button>
      </div>
    </a-modal>
  </div>
</template>
