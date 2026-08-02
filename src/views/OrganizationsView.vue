<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import dayjs from 'dayjs'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { useOrganizationsStore } from '@/stores/organizations'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { extractErrorMessage } from '@/utils/labels'
import type { OrganizationResponse } from '@/types/api'

const orgs = useOrganizationsStore()
const router = useRouter()
const { isMobile, width } = useBreakpoint()

const stickyConfig = computed(() => ({
  offsetHeader: width.value >= 1280 ? 72 : width.value >= 768 ? 64 : 56,
}))

const subscriptionFilter = ref<'all' | 'active' | 'off'>('all')
const createOpen = ref(false)
const saving = ref(false)

const createForm = reactive({
  name: '',
  legal_name: '',
  subscription_active: true,
  notes: '',
})

const columns: TableColumnsType<OrganizationResponse> = [
  { title: 'Организация', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: 'Парки', key: 'parks_count', width: 100 },
  { title: 'Подписка', key: 'subscription', width: 140 },
  { title: 'Статус', key: 'is_active', width: 140 },
  { title: 'Создана', dataIndex: 'created_at', key: 'created_at', width: 170 },
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
    await orgs.fetchList({
      page: pagination.current,
      page_size: pagination.pageSize,
      subscription_active: sub,
    })
    pagination.total = orgs.total
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function openOrg(record: OrganizationResponse) {
  router.push({ name: 'organization-detail', params: { id: record.id } })
}

function onTableChange(pag: { current?: number; pageSize?: number }) {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 20
  load()
}

function resetCreate() {
  createForm.name = ''
  createForm.legal_name = ''
  createForm.subscription_active = true
  createForm.notes = ''
}

async function submitCreate() {
  if (!createForm.name.trim()) {
    message.warning('Укажите название организации')
    return
  }
  saving.value = true
  try {
    const org = await orgs.create({
      name: createForm.name.trim(),
      legal_name: createForm.legal_name.trim() || null,
      subscription_active: createForm.subscription_active,
      notes: createForm.notes.trim() || null,
    })
    message.success('Организация создана')
    createOpen.value = false
    resetCreate()
    router.push({ name: 'organization-detail', params: { id: org.id } })
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось создать организацию'))
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
        <h1 class="lotax-page-title">Организации</h1>
        <p class="lotax-caption mt-1">Клиенты LOTAX: организации → парки → директора</p>
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
          Создать организацию
        </a-button>
      </div>
    </div>

    <div v-if="isMobile" class="flex flex-col gap-4">
      <div v-if="orgs.loading" class="flex justify-center py-16">
        <a-spin size="large" />
      </div>

      <template v-else-if="orgs.items.length">
        <article
          v-for="org in orgs.items"
          :key="org.id"
          class="lotax-card cursor-pointer p-4 active:scale-[0.99]"
          role="button"
          tabindex="0"
          @click="openOrg(org)"
          @keydown.enter="openOrg(org)"
        >
          <div class="mb-3 min-w-0">
            <h3 class="truncate text-[16px] font-semibold text-ink">{{ org.name }}</h3>
            <p class="mt-0.5 truncate text-[13px] text-ink-muted">
              {{ org.legal_name || 'Без юр. названия' }}
            </p>
          </div>
          <div class="mb-3 flex flex-wrap gap-2">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
              :class="
                org.subscription_active
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-red-50 text-red-700 ring-red-200'
              "
            >
              {{ org.subscription_active ? 'Подписка' : 'Без подписки' }}
            </span>
            <span
              class="inline-flex items-center rounded-full bg-surface px-2.5 py-1 text-[13px] font-medium text-ink-muted ring-1 ring-inset ring-line"
            >
              Парков: {{ org.parks_count ?? '—' }}
            </span>
          </div>
          <div class="border-t border-line pt-3 text-[12px] text-ink-muted">
            {{ dayjs(org.created_at).format('DD.MM.YYYY · HH:mm') }}
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
        <p class="text-[15px] font-medium text-ink">Организации не найдены</p>
        <p class="lotax-caption">Создайте первую организацию клиента</p>
      </div>
    </div>

    <div v-else class="lotax-card !p-0">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="orgs.items"
        :loading="orgs.loading"
        :pagination="pagination"
        :sticky="stickyConfig"
        :locale="{ emptyText: 'Организации не найдены' }"
        :custom-row="(record: OrganizationResponse) => ({
          onClick: () => openOrg(record),
          class: 'cursor-pointer transition-colors duration-fast',
        })"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="min-w-0">
              <div class="truncate font-medium text-ink">
                {{ (record as OrganizationResponse).name }}
              </div>
              <div class="truncate text-[13px] text-ink-muted">
                {{ (record as OrganizationResponse).legal_name || '—' }}
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'parks_count'">
            <span class="tabular-nums text-ink-muted">
              {{ (record as OrganizationResponse).parks_count ?? '—' }}
            </span>
          </template>
          <template v-else-if="column.key === 'subscription'">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
              :class="
                (record as OrganizationResponse).subscription_active
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-red-50 text-red-700 ring-red-200'
              "
            >
              {{
                (record as OrganizationResponse).subscription_active
                  ? 'Активна'
                  : 'Отключена'
              }}
            </span>
          </template>
          <template v-else-if="column.key === 'is_active'">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
              :class="
                (record as OrganizationResponse).is_active
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-slate-100 text-slate-600 ring-slate-300'
              "
            >
              {{ (record as OrganizationResponse).is_active ? 'Активна' : 'Неактивна' }}
            </span>
          </template>
          <template v-else-if="column.key === 'created_at'">
            <span class="whitespace-nowrap text-[13px] text-ink-muted">
              {{
                dayjs((record as OrganizationResponse).created_at).format(
                  'DD.MM.YYYY · HH:mm',
                )
              }}
            </span>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="createOpen"
      title="Создать организацию"
      ok-text="Создать"
      cancel-text="Отмена"
      centered
      :width="520"
      :confirm-loading="saving"
      @ok="submitCreate"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Название" required>
          <a-input v-model:value="createForm.name" size="large" placeholder="Ситиус" />
        </a-form-item>
        <a-form-item label="Юридическое название">
          <a-input v-model:value="createForm.legal_name" size="large" />
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
