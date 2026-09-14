<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { adminOrdersApi } from '@/api/adminOrders'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage, formatPhone } from '@/utils/labels'
import type { OrderAdminItem, OrderStatus } from '@/types/api'
import PageHeader from '@/components/PageHeader.vue'

const org = useOrgStore()
const loading = ref(false)
const items = ref<OrderAdminItem[]>([])
/** Default: all statuses (no status query). */
const statusFilter = ref<OrderStatus | 'all'>('all')
/** Empty = all parks in org (no park_id query). */
const parkFilter = ref<string | 'all'>('all')
const approveOpen = ref(false)
const rejectOpen = ref(false)
const current = ref<OrderAdminItem | null>(null)
const saving = ref(false)
const approveForm = reactive({ certificate_code: '' })
const rejectForm = reactive({ reason: '' })

const parkOptions = computed(() => [
  { value: 'all', label: 'Все парки' },
  ...org.parks.map((p) => ({ value: p.id, label: p.name })),
])

function driverLine(item: OrderAdminItem) {
  const name =
    item.driver_display_name ||
    [item.driver_first_name, item.driver_last_name].filter(Boolean).join(' ') ||
    item.driver_id
  const phone = item.driver_phone ? formatPhone(item.driver_phone) : null
  return phone ? `${name} · ${phone}` : name
}

async function load() {
  loading.value = true
  try {
    const { data } = await adminOrdersApi.list({
      park_id: parkFilter.value === 'all' ? undefined : parkFilter.value,
      status: statusFilter.value === 'all' ? null : statusFilter.value,
    })
    items.value = data.items
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loading.value = false
  }
}

function openApprove(item: OrderAdminItem) {
  current.value = item
  approveForm.certificate_code = ''
  approveOpen.value = true
}

function openReject(item: OrderAdminItem) {
  current.value = item
  rejectForm.reason = ''
  rejectOpen.value = true
}

async function submitApprove() {
  if (!current.value) return
  saving.value = true
  try {
    await adminOrdersApi.approve(current.value.id, {
      certificate_code: approveForm.certificate_code.trim() || null,
    })
    message.success('Заявка одобрена')
    approveOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

async function submitReject() {
  if (!current.value) return
  if (!rejectForm.reason.trim()) {
    message.warning('Укажите причину отказа')
    return
  }
  saving.value = true
  try {
    await adminOrdersApi.reject(current.value.id, {
      reason: rejectForm.reason.trim(),
    })
    message.success('Заявка отклонена, баллы возвращены')
    rejectOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

watch([parkFilter, statusFilter], load)
onMounted(async () => {
  if (!org.parks.length) await org.fetchParks()
  await load()
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <PageHeader
      title="Заявки на награды"
      subtitle="По умолчанию — все парки организации. Модерация обменов баллов."
    >
      <template #actions>
        <a-select
          v-model:value="parkFilter"
          class="!w-48"
          size="large"
          :options="parkOptions"
        />
        <a-select
          v-model:value="statusFilter"
          class="!w-44"
          size="large"
          :options="[
            { value: 'all', label: 'Все статусы' },
            { value: 'pending', label: 'На модерации' },
            { value: 'approved', label: 'Одобрены' },
            { value: 'rejected', label: 'Отклонены' },
            { value: 'cancelled', label: 'Отменены' },
          ]"
        />
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
      </template>
    </PageHeader>

    <div v-if="loading" class="flex justify-center py-16"><a-spin size="large" /></div>
    <div v-else-if="!items.length" class="lotax-card p-8 text-center lotax-caption">
      Заявок нет
    </div>
    <div v-else class="flex flex-col gap-3">
      <article
        v-for="item in items"
        :key="item.id"
        class="lotax-card flex flex-col gap-3 p-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div class="font-semibold text-ink">{{ item.reward_title }}</div>
            <div class="text-[13px] text-ink-muted">
              {{ driverLine(item) }} · −{{ item.points_spent }} б.
              ({{ item.points_type }})
            </div>
            <div class="text-[12px] text-ink-muted">
              <template v-if="item.park_name">{{ item.park_name }} · </template>
              {{ dayjs(item.created_at).format('DD.MM.YYYY HH:mm') }}
            </div>
          </div>
          <span class="rounded-full bg-surface px-2.5 py-1 text-[12px] font-medium ring-1 ring-line">
            {{ item.status }}
          </span>
        </div>
        <div v-if="item.status === 'pending'" class="flex flex-wrap gap-2">
          <a-button type="primary" class="lotax-btn-primary" @click="openApprove(item)">
            Одобрить
          </a-button>
          <a-button danger @click="openReject(item)">Отклонить</a-button>
        </div>
      </article>
    </div>

    <a-modal
      v-model:open="approveOpen"
      title="Одобрить заявку"
      ok-text="Одобрить"
      cancel-text="Отмена"
      :confirm-loading="saving"
      @ok="submitApprove"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Код сертификата (если нужно)">
          <a-input v-model:value="approveForm.certificate_code" size="large" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="rejectOpen"
      title="Отклонить заявку"
      ok-text="Отклонить"
      cancel-text="Отмена"
      :confirm-loading="saving"
      @ok="submitReject"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Причина" required>
          <a-textarea v-model:value="rejectForm.reason" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
