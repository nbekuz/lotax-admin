<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { ReloadOutlined, UndoOutlined } from '@ant-design/icons-vue'
import { superAdminApi } from '@/api/superAdmin'
import { extractErrorMessage } from '@/utils/labels'
import type { DeletedDriverItem } from '@/types/api'
import PageHeader from '@/components/PageHeader.vue'
import dayjs from 'dayjs'

const loading = ref(false)
const restoringId = ref<string | null>(null)
const items = ref<DeletedDriverItem[]>([])

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `Всего: ${total}`,
})

const columns = [
  { title: 'Имя', key: 'display_name', dataIndex: 'display_name', ellipsis: true },
  { title: 'Телефон', key: 'phone_masked', dataIndex: 'phone_masked', width: 170 },
  { title: 'Парк', key: 'park_name', dataIndex: 'park_name', width: 180 },
  { title: 'Удалён', key: 'deleted_at', dataIndex: 'deleted_at', width: 180 },
  { title: '', key: 'actions', width: 140 },
]

async function load() {
  loading.value = true
  try {
    const { data } = await superAdminApi.listDeletedDrivers({
      page: pagination.current,
      page_size: pagination.pageSize,
    })
    const list = data.items ?? []
    items.value = list
    pagination.total = data.total ?? list.length
    pagination.current = data.page ?? pagination.current
    pagination.pageSize = data.page_size ?? pagination.pageSize
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось загрузить архив'))
  } finally {
    loading.value = false
  }
}

function onTableChange(pag: { current?: number; pageSize?: number }) {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 20
  void load()
}

function confirmRestore(row: DeletedDriverItem) {
  Modal.confirm({
    title: 'Восстановить водителя?',
    content:
      'Статус станет «Ожидание». Водитель снова сможет войти по SMS и стать активным.',
    okText: 'Восстановить',
    cancelText: 'Отмена',
    centered: true,
    async onOk() {
      restoringId.value = row.id
      try {
        await superAdminApi.restoreDriver(row.id)
        message.success('Водитель восстановлен')
        await load()
      } catch (e) {
        message.error(extractErrorMessage(e))
        throw e
      } finally {
        restoringId.value = null
      }
    },
  })
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <PageHeader
      title="Архив водителей"
      subtitle="Soft-delete. Восстановление → «Ожидание», затем SMS → «Активен»"
    >
      <template #actions>
        <a-button class="lotax-btn-secondary" :loading="loading" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
      </template>
    </PageHeader>

    <div class="lotax-card !p-0">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="pagination"
        :locale="{ emptyText: 'Удалённых водителей нет' }"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'display_name'">
            {{ (record as DeletedDriverItem).display_name || '—' }}
          </template>
          <template v-else-if="column.key === 'phone_masked'">
            <span class="font-mono text-[13px] text-ink-muted">
              {{ (record as DeletedDriverItem).phone_masked || '—' }}
            </span>
          </template>
          <template v-else-if="column.key === 'deleted_at'">
            <span v-if="(record as DeletedDriverItem).deleted_at" class="tabular-nums text-ink-muted">
              {{ dayjs((record as DeletedDriverItem).deleted_at).format('DD.MM.YYYY · HH:mm') }}
            </span>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button
              size="small"
              :loading="restoringId === (record as DeletedDriverItem).id"
              @click="confirmRestore(record as DeletedDriverItem)"
            >
              <template #icon><UndoOutlined /></template>
              Восстановить
            </a-button>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>
