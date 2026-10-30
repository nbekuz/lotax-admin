<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { SendOutlined } from '@ant-design/icons-vue'
import { http } from '@/api/http'
import { driversApi } from '@/api/drivers'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage } from '@/utils/labels'
import PageHeader from '@/components/PageHeader.vue'

interface CampaignRow {
  id: string
  title: string
  body: string
  deep_link: string
  send_mode: string
  status: string
  next_run_at: string | null
  sent: number
  failed: number
  clicked: number
}

const auth = useAuthStore()
const org = useOrgStore()
const sending = ref(false)
const testing = ref(false)
const campaigns = ref<CampaignRow[]>([])
const driverOptions = ref<{ value: string; label: string }[]>([])
const testDriverId = ref<string>()

const form = reactive({
  title: '',
  body: '',
  deep_link: 'none',
  send_mode: 'now',
  scheduled_at: '',
  frequency: 'daily',
  weekdays: [] as number[],
  time: '09:00',
  until: '',
  tiers: [] as string[],
  online: 'any',
})

const deepLinkOptions = [
  { value: 'none', label: 'Без перехода' },
  { value: 'tasks', label: 'Задания' },
  { value: 'rewards', label: 'Каталог наград' },
  { value: 'competition', label: 'Турнир' },
  { value: 'chat', label: 'Чат с парком' },
]
const modeOptions = [
  { value: 'now', label: 'Отправить сейчас' },
  { value: 'scheduled', label: 'В выбранное время' },
  { value: 'recurring', label: 'По расписанию' },
]
const frequencyOptions = [
  { value: 'daily', label: 'Каждый день' },
  { value: 'weekdays', label: 'По рабочим дням' },
  { value: 'weekends', label: 'По выходным' },
  { value: 'weekly', label: 'По выбранным дням' },
  { value: 'monthly', label: '1-го числа' },
]
const weekdayOptions = [
  { value: 0, label: 'Пн' },
  { value: 1, label: 'Вт' },
  { value: 2, label: 'Ср' },
  { value: 3, label: 'Чт' },
  { value: 4, label: 'Пт' },
  { value: 5, label: 'Сб' },
  { value: 6, label: 'Вс' },
]
const tierOptions = [
  { value: 'bronze', label: 'Бронза' },
  { value: 'silver', label: 'Серебро' },
  { value: 'gold', label: 'Золото' },
  { value: 'platinum', label: 'Платина' },
]
const onlineOptions = [
  { value: 'any', label: 'Все' },
  { value: 'online', label: 'На линии' },
  { value: 'offline', label: 'Не на линии' },
]

const parkId = computed(() => org.selectedParkId)
const canSend = computed(() => auth.isDirector || auth.isManager)

const columns = [
  { title: 'Заголовок', dataIndex: 'title', key: 'title' },
  { title: 'Режим', dataIndex: 'send_mode', key: 'send_mode' },
  { title: 'Статус', dataIndex: 'status', key: 'status' },
  { title: 'Доставлено', dataIndex: 'sent', key: 'sent', width: 110 },
  { title: 'Клики', dataIndex: 'clicked', key: 'clicked', width: 80 },
  { title: '', key: 'actions', width: 140 },
]

async function loadDrivers() {
  if (!parkId.value) return
  const { data } = await driversApi.list({
    park_id: parkId.value,
    page: 1,
    page_size: 100,
    status: 'active',
  })
  driverOptions.value = (data.items ?? []).map((driver) => ({
    value: driver.id,
    label: [driver.last_name, driver.first_name, driver.display_name, driver.phone]
      .filter(Boolean)
      .slice(0, 2)
      .join(' '),
  }))
}

async function load() {
  if (!parkId.value) return
  const { data } = await http.get<CampaignRow[]>('/admin/push/campaigns', {
    params: { park_id: parkId.value },
  })
  campaigns.value = data
}

async function send() {
  if (!parkId.value) {
    message.warning('Выберите парк')
    return
  }
  if (!form.title.trim() || !form.body.trim()) {
    message.warning('Укажите заголовок и текст')
    return
  }
  sending.value = true
  try {
    await http.post('/admin/push/campaigns', {
      park_id: parkId.value,
      title: form.title.trim(),
      body: form.body.trim(),
      deep_link: form.deep_link,
      send_mode: form.send_mode,
      scheduled_at: form.send_mode === 'scheduled' ? form.scheduled_at || null : null,
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
        tiers: form.tiers,
        online: form.online,
      },
    })
    message.success(form.send_mode === 'now' ? 'Отправлено' : 'Рассылка сохранена')
    form.title = ''
    form.body = ''
    await load()
  } catch (error) {
    message.error(extractErrorMessage(error, 'Не удалось сохранить рассылку'))
  } finally {
    sending.value = false
  }
}

async function sendTest() {
  if (!parkId.value || !testDriverId.value) {
    message.warning('Выберите водителя для проверки')
    return
  }
  if (!form.title.trim() || !form.body.trim()) {
    message.warning('Укажите заголовок и текст')
    return
  }
  testing.value = true
  try {
    const { data } = await http.post<{ sent: boolean }>('/admin/push/test', {
      park_id: parkId.value,
      driver_id: testDriverId.value,
      title: form.title.trim(),
      body: form.body.trim(),
      deep_link: form.deep_link,
    })
    message.success(data.sent ? 'Тест ушёл на телефон водителя' : 'У водителя нет устройства')
  } catch (error) {
    message.error(extractErrorMessage(error, 'Не удалось отправить тест'))
  } finally {
    testing.value = false
  }
}

async function setStatus(row: Record<string, string>, status: string) {
  try {
    await http.put(`/admin/push/campaigns/${row.id}/status`, { status })
    await load()
  } catch (error) {
    message.error(extractErrorMessage(error, 'Не удалось изменить статус'))
  }
}

onMounted(async () => {
  if (!org.parks.length) await org.fetchParks()
  await Promise.all([load(), loadDrivers()])
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 md:gap-6">
    <PageHeader
      title="Push-уведомления"
      subtitle="Сейчас, в выбранное время или по расписанию. В тексте можно писать {driver_name}, {points_balance}, {rank}."
    />

    <section class="lotax-card p-5 md:p-7">
      <a-form layout="vertical">
        <a-form-item label="Парк">
          <a-input :value="org.selectedPark?.name || 'Не выбран'" size="large" disabled />
        </a-form-item>
        <a-form-item label="Куда открыть" required>
          <a-select v-model:value="form.deep_link" size="large" :options="deepLinkOptions" />
        </a-form-item>
        <a-form-item label="Кому">
          <div class="flex flex-col gap-2">
            <a-select
              v-model:value="form.tiers"
              mode="multiple"
              size="large"
              placeholder="Все уровни"
              :options="tierOptions"
            />
            <a-select v-model:value="form.online" size="large" :options="onlineOptions" />
          </div>
        </a-form-item>
        <a-form-item label="Когда" required>
          <a-select v-model:value="form.send_mode" size="large" :options="modeOptions" />
        </a-form-item>
        <a-form-item v-if="form.send_mode === 'scheduled'" label="Дата и время (Москва)">
          <a-input v-model:value="form.scheduled_at" size="large" placeholder="2026-11-02T07:30:00" />
        </a-form-item>
        <template v-if="form.send_mode === 'recurring'">
          <a-form-item label="Периодичность">
            <a-select v-model:value="form.frequency" size="large" :options="frequencyOptions" />
          </a-form-item>
          <a-form-item v-if="form.frequency === 'weekly'" label="Дни">
            <a-select
              v-model:value="form.weekdays"
              mode="multiple"
              size="large"
              :options="weekdayOptions"
            />
          </a-form-item>
          <a-form-item label="Время">
            <a-input v-model:value="form.time" size="large" placeholder="07:30" />
          </a-form-item>
          <a-form-item label="До даты, если нужно">
            <a-input v-model:value="form.until" size="large" placeholder="2026-12-31" />
          </a-form-item>
        </template>
        <a-form-item label="Заголовок" required>
          <a-input v-model:value="form.title" size="large" :maxlength="65" />
        </a-form-item>
        <a-form-item label="Текст" required>
          <a-textarea v-model:value="form.body" :rows="4" :maxlength="240" />
        </a-form-item>
        <a-form-item label="Проверка на одном водителе">
          <a-select
            v-model:value="testDriverId"
            size="large"
            show-search
            option-filter-prop="label"
            placeholder="Выберите водителя"
            :options="driverOptions"
          />
        </a-form-item>
        <div class="flex flex-wrap gap-2">
          <a-button
            v-if="canSend"
            type="primary"
            class="lotax-btn-primary"
            :loading="sending"
            :disabled="!parkId"
            @click="send"
          >
            <template #icon><SendOutlined /></template>
            {{ form.send_mode === 'now' ? 'Отправить' : 'Сохранить' }}
          </a-button>
          <a-button
            v-if="canSend"
            class="lotax-btn-secondary"
            :loading="testing"
            :disabled="!parkId || !testDriverId"
            @click="sendTest"
          >
            Тест водителю
          </a-button>
        </div>
      </a-form>
    </section>

    <section class="lotax-card p-5">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="campaigns"
        :pagination="false"
        size="small"
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
              v-if="record.status !== 'cancelled'"
              type="link"
              danger
              @click="setStatus(record, 'cancelled')"
            >
              Удалить
            </a-button>
          </template>
        </template>
      </a-table>
    </section>
  </div>
</template>
