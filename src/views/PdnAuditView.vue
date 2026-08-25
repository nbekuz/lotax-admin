<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { pdnApi } from '@/api/pdn'
import { useAuthStore } from '@/stores/auth'
import { extractErrorMessage, isForbiddenError } from '@/utils/labels'
import type { PdnAuditLogItem } from '@/types/api'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const items = ref<PdnAuditLogItem[]>([])

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `Всего: ${total}`,
})

async function load() {
  loading.value = true
  try {
    const { data } = await pdnApi.auditLogs({
      page: pagination.current,
      page_size: pagination.pageSize,
    })
    items.value = data.items
    pagination.total = data.total
    pagination.current = data.page
    pagination.pageSize = data.page_size
  } catch (e) {
    if (isForbiddenError(e)) {
      message.error('Нет доступа к журналу ПДн')
      router.replace(auth.homePath)
      return
    }
    message.error(extractErrorMessage(e, 'Не удалось загрузить журнал'))
  } finally {
    loading.value = false
  }
}

function onTableChange(pag: { current?: number; pageSize?: number }) {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 20
  void load()
}

function actionLabel(action: string) {
  if (action === 'view_personal_data') return 'Просмотр ПДн'
  return action
}

onMounted(() => {
  if (!auth.canViewPdnAudit) return
  void load()
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="lotax-page-title">Журнал ПДн</h1>
        <p class="lotax-caption mt-1">
          Кто, когда и какого водителя расшифровал. Каждое нажатие «Показать ПДн» пишется сюда
        </p>
      </div>
      <a-button class="lotax-btn-secondary" :loading="loading" @click="load">
        <template #icon><ReloadOutlined /></template>
        Обновить
      </a-button>
    </div>

    <section class="lotax-card overflow-hidden">
      <a-table
        row-key="id"
        :data-source="items"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 920 }"
        @change="onTableChange"
      >
        <a-table-column key="created_at" title="Когда" :width="170">
          <template #default="{ record }: { record: PdnAuditLogItem }">
            {{ dayjs(record.created_at).format('DD.MM.YYYY HH:mm') }}
          </template>
        </a-table-column>
        <a-table-column key="director" title="Кто" ellipsis>
          <template #default="{ record }: { record: PdnAuditLogItem }">
            {{ record.director_email || record.director_id }}
          </template>
        </a-table-column>
        <a-table-column key="driver" title="Водитель" ellipsis>
          <template #default="{ record }: { record: PdnAuditLogItem }">
            {{ record.driver_display_name || record.driver_id }}
          </template>
        </a-table-column>
        <a-table-column key="action" title="Действие" :width="160">
          <template #default="{ record }: { record: PdnAuditLogItem }">
            {{ actionLabel(record.action) }}
          </template>
        </a-table-column>
        <a-table-column
          key="details"
          title="Детали"
          data-index="action_details"
          ellipsis
        />
        <a-table-column key="ip" title="IP" :width="140">
          <template #default="{ record }: { record: PdnAuditLogItem }">
            {{ record.ip_address || '—' }}
          </template>
        </a-table-column>
      </a-table>
    </section>
  </div>
</template>
