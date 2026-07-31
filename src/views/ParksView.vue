<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import dayjs from 'dayjs'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { useParksStore } from '@/stores/parks'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { extractErrorMessage } from '@/utils/labels'
import type { ParkResponse } from '@/types/api'

const parks = useParksStore()
const router = useRouter()
const { isMobile } = useBreakpoint()

const subscriptionFilter = ref<'all' | 'active' | 'off'>('all')
const createOpen = ref(false)
const saving = ref(false)

const createForm = reactive({
  name: '',
  legal_name: '',
  yandex_park_id: '',
  yandex_client_id: '',
  yandex_api_key: '',
  subscription_active: true,
  notes: '',
})

const columns: TableColumnsType<ParkResponse> = [
  { title: 'Парк', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: 'Yandex ID', dataIndex: 'yandex_park_id', key: 'yandex_park_id', width: 160 },
  { title: 'Подписка', key: 'subscription', width: 140 },
  { title: 'Статус', key: 'is_active', width: 140 },
  { title: 'Создан', dataIndex: 'created_at', key: 'created_at', width: 170 },
]

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `Всего: ${total}`,
})

async function load() {
  try {
    const sub =
      subscriptionFilter.value === 'all'
        ? null
        : subscriptionFilter.value === 'active'
    await parks.fetchList({
      page: pagination.current,
      page_size: pagination.pageSize,
      subscription_active: sub,
    })
    pagination.total = parks.total
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function openPark(record: ParkResponse) {
  router.push({ name: 'park-detail', params: { id: record.id } })
}

function onTableChange(pag: { current?: number; pageSize?: number }) {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 20
  load()
}

function resetCreate() {
  createForm.name = ''
  createForm.legal_name = ''
  createForm.yandex_park_id = ''
  createForm.yandex_client_id = ''
  createForm.yandex_api_key = ''
  createForm.subscription_active = true
  createForm.notes = ''
}

async function submitCreate() {
  if (!createForm.name.trim()) {
    message.warning('Укажите название парка')
    return
  }
  saving.value = true
  try {
    const park = await parks.create({
      name: createForm.name.trim(),
      legal_name: createForm.legal_name.trim() || null,
      yandex_park_id: createForm.yandex_park_id.trim() || null,
      yandex_client_id: createForm.yandex_client_id.trim() || null,
      yandex_api_key: createForm.yandex_api_key.trim() || null,
      subscription_active: createForm.subscription_active,
      notes: createForm.notes.trim() || null,
    })
    message.success('Парк создан')
    createOpen.value = false
    resetCreate()
    router.push({ name: 'park-detail', params: { id: park.id } })
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось создать парк'))
  } finally {
    saving.value = false
  }
}

watch(subscriptionFilter, () => {
  pagination.current = 1
  load()
})

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="lotax-page-title">Таксопарки</h1>
        <p class="lotax-caption mt-1">Глобальное управление парками LOTAX</p>
      </div>
      <div class="lotax-filter-stack md:flex md:flex-wrap md:items-center md:gap-2">
        <a-select
          v-model:value="subscriptionFilter"
          class="md:!w-48"
          size="large"
          :options="[
            { value: 'all', label: 'Все подписки' },
            { value: 'active', label: 'Активна' },
            { value: 'off', label: 'Отключена' },
          ]"
        />
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button
          type="primary"
          class="lotax-btn-primary"
          @click="createOpen = true; resetCreate()"
        >
          <template #icon><PlusOutlined /></template>
          Создать парк
        </a-button>
      </div>
    </div>

    <div v-if="isMobile" class="flex flex-col gap-4">
      <div v-if="parks.loading" class="flex justify-center py-16">
        <a-spin size="large" />
      </div>

      <template v-else-if="parks.items.length">
        <article
          v-for="park in parks.items"
          :key="park.id"
          class="lotax-card park-mobile-card cursor-pointer p-4 active:scale-[0.99]"
          role="button"
          tabindex="0"
          @click="openPark(park)"
          @keydown.enter="openPark(park)"
        >
          <div class="mb-3 min-w-0">
            <h3 class="truncate text-[16px] font-semibold text-ink">{{ park.name }}</h3>
            <p class="mt-0.5 truncate text-[13px] text-ink-muted">
              {{ park.legal_name || 'Без юр. названия' }}
            </p>
          </div>

          <div class="mb-3 flex flex-wrap gap-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
              :class="
                park.subscription_active
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-red-50 text-red-700 ring-red-200'
              "
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="park.subscription_active ? 'bg-emerald-500' : 'bg-red-500'"
              />
              {{ park.subscription_active ? 'Подписка' : 'Без подписки' }}
            </span>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
              :class="
                park.is_active
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-slate-100 text-slate-600 ring-slate-300'
              "
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="park.is_active ? 'bg-emerald-500' : 'bg-slate-400'"
              />
              {{ park.is_active ? 'Активен' : 'Неактивен' }}
            </span>
          </div>

          <div class="flex items-center justify-between border-t border-line pt-3 text-[12px] text-ink-muted">
            <span class="font-mono">{{ park.yandex_park_id || '—' }}</span>
            <span>{{ dayjs(park.created_at).format('DD.MM.YYYY · HH:mm') }}</span>
          </div>
        </article>

        <div class="flex justify-center py-2">
          <a-pagination
            :current="pagination.current"
            :page-size="pagination.pageSize"
            :total="pagination.total"
            :show-size-changer="false"
            size="small"
            @change="(page: number) => { pagination.current = page; load() }"
          />
        </div>
      </template>

      <div
        v-else
        class="lotax-card flex flex-col items-center justify-center gap-2 px-4 py-16 text-center"
      >
        <p class="text-[15px] font-medium text-ink">Парки не найдены</p>
        <p class="lotax-caption">Измените фильтр или создайте новый парк</p>
      </div>
    </div>

    <div v-else class="lotax-card parks-table-card !p-0">
      <a-table
        row-key="id"
        class="parks-table"
        :columns="columns"
        :data-source="parks.items"
        :loading="parks.loading"
        :pagination="pagination"
        :locale="{ emptyText: 'Парки не найдены' }"
        :custom-row="(record: ParkResponse) => ({
          onClick: () => openPark(record),
          class: 'cursor-pointer transition-colors duration-fast',
        })"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="min-w-0">
              <div class="truncate font-medium text-ink">
                {{ (record as ParkResponse).name }}
              </div>
              <div class="truncate text-[13px] text-ink-muted">
                {{ (record as ParkResponse).legal_name || '—' }}
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'yandex_park_id'">
            <span class="font-mono text-[13px] tabular-nums text-ink-muted">
              {{ (record as ParkResponse).yandex_park_id || '—' }}
            </span>
          </template>
          <template v-else-if="column.key === 'subscription'">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
              :class="
                (record as ParkResponse).subscription_active
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-red-50 text-red-700 ring-red-200'
              "
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="
                  (record as ParkResponse).subscription_active
                    ? 'bg-emerald-500'
                    : 'bg-red-500'
                "
              />
              {{ (record as ParkResponse).subscription_active ? 'Активна' : 'Отключена' }}
            </span>
          </template>
          <template v-else-if="column.key === 'is_active'">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
              :class="
                (record as ParkResponse).is_active
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-slate-100 text-slate-600 ring-slate-300'
              "
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="
                  (record as ParkResponse).is_active ? 'bg-emerald-500' : 'bg-slate-400'
                "
              />
              {{ (record as ParkResponse).is_active ? 'Активен' : 'Неактивен' }}
            </span>
          </template>
          <template v-else-if="column.key === 'created_at'">
            <span class="whitespace-nowrap text-[13px] text-ink-muted">
              {{ dayjs((record as ParkResponse).created_at).format('DD.MM.YYYY · HH:mm') }}
            </span>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="createOpen"
      title="Создать таксопарк"
      ok-text="Создать"
      cancel-text="Отмена"
      centered
      :width="520"
      :confirm-loading="saving"
      @ok="submitCreate"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Название" required>
          <a-input v-model:value="createForm.name" size="large" />
        </a-form-item>
        <a-form-item label="Юридическое название">
          <a-input v-model:value="createForm.legal_name" size="large" />
        </a-form-item>
        <a-form-item label="Yandex Park ID">
          <a-input v-model:value="createForm.yandex_park_id" size="large" />
        </a-form-item>
        <a-form-item label="Yandex Client ID">
          <a-input v-model:value="createForm.yandex_client_id" size="large" />
        </a-form-item>
        <a-form-item label="Yandex API Key">
          <a-input-password v-model:value="createForm.yandex_api_key" size="large" />
        </a-form-item>
        <a-form-item label="Подписка">
          <a-switch v-model:checked="createForm.subscription_active" />
        </a-form-item>
        <a-form-item label="Заметки">
          <a-textarea v-model:value="createForm.notes" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.park-mobile-card {
  animation: lotax-fade-in 180ms ease;
}

@keyframes lotax-fade-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.parks-table-card :deep(.ant-table-container),
.parks-table-card :deep(.ant-table-content),
.parks-table-card :deep(.ant-table-body),
.parks-table-card :deep(.ant-table-header) {
  overflow-x: hidden !important;
}

.parks-table-card :deep(.ant-table table) {
  width: 100% !important;
  table-layout: fixed !important;
}

:deep(.ant-table) {
  border: none !important;
  border-radius: 0 !important;
}

:deep(.ant-table-thead > tr > th) {
  position: sticky !important;
  top: 56px;
  z-index: 12;
  background: #fafafa !important;
  padding: 10px 16px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  color: #71717a !important;
  box-shadow: inset 0 -1px 0 var(--lotax-border);
}

@media (min-width: 768px) {
  :deep(.ant-table-thead > tr > th) {
    top: 64px;
  }
}

@media (min-width: 1280px) {
  :deep(.ant-table-thead > tr > th) {
    top: 72px;
  }
}

:deep(.ant-table-tbody > tr > td) {
  padding: 14px 16px !important;
  vertical-align: middle !important;
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: #fffbf5 !important;
}
</style>
