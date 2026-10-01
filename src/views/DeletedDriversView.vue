<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { ReloadOutlined, UndoOutlined } from '@ant-design/icons-vue'
import { superAdminApi } from '@/api/superAdmin'
import { extractErrorMessage } from '@/utils/labels'
import type { DeletedDriverItem } from '@/types/api'
import PageHeader from '@/components/PageHeader.vue'
import dayjs from 'dayjs'

const loading = ref(false)
const restoringId = ref<string | null>(null)
const query = ref('')
const items = ref<DeletedDriverItem[]>([])
let searchTimer: ReturnType<typeof setTimeout> | null = null

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['20', '50', '100'],
  showTotal: (total: number) => `Всего: ${total}`,
})

const columns = [
  { title: 'Имя', key: 'display_name', dataIndex: 'display_name', width: 180 },
  { title: 'Телефон', key: 'phone_masked', dataIndex: 'phone_masked', width: 180 },
  { title: 'Парк', key: 'park_name', dataIndex: 'park_name', width: 180 },
  { title: 'Почему в архиве', key: 'archive_reason', dataIndex: 'archive_reason', width: 200 },
  { title: 'В архиве', key: 'deleted_at', dataIndex: 'deleted_at', width: 168 },
  { title: '', key: 'actions', width: 148, fixed: 'right' as const },
]

function reasonClass(reason?: string | null) {
  if (reason === 'Удалил аккаунт') return 'lotax-badge--muted'
  if (reason === 'Смена парка') return 'lotax-badge--info'
  return 'lotax-badge--warning'
}

async function load() {
  loading.value = true
  try {
    const { data } = await superAdminApi.listDeletedDrivers({
      page: pagination.current,
      page_size: pagination.pageSize,
      q: query.value,
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
      'Статус станет «Ожидание». Водитель снова сможет войти по SMS и стать активным. Если Яндекс по-прежнему отдаёт его как уволенного, следующий синхрон снова уберёт его из списка директора.',
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

watch(query, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.current = 1
    void load()
  }, 300)
})

onMounted(load)
onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <PageHeader
      title="Архив водителей"
      subtitle="Их убрал синхрон Яндекса: в парке они уже не «работающие». Аккаунт сами не удаляли. Восстановление → «Ожидание», затем SMS → «Активен»."
    >
      <template #actions>
        <a-button class="lotax-btn-secondary" :loading="loading" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
      </template>
    </PageHeader>

    <div class="lotax-card overflow-hidden !p-0">
      <div class="flex flex-col gap-2 border-b border-line px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <a-input
          v-model:value="query"
          allow-clear
          placeholder="Имя, телефон или парк"
          class="!w-full sm:!max-w-sm"
        />
        <span class="text-[12px] text-ink-muted">{{ pagination.total }} в архиве</span>
      </div>
      <a-table
        row-key="id"
        size="small"
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 980 }"
        :locale="{ emptyText: query.trim() ? 'Ничего не найдено' : 'Удалённых водителей нет' }"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'display_name'">
            <span class="font-medium text-ink">
              {{ (record as DeletedDriverItem).display_name || 'Без имени' }}
            </span>
          </template>
          <template v-else-if="column.key === 'phone_masked'">
            <span
              v-if="(record as DeletedDriverItem).phone_masked"
              class="font-mono text-[12px] text-ink"
            >
              {{ (record as DeletedDriverItem).phone_masked }}
            </span>
            <span v-else class="text-[12px] text-ink-muted">Нет номера</span>
          </template>
          <template v-else-if="column.key === 'park_name'">
            <span v-if="(record as DeletedDriverItem).park_name" class="text-ink">
              {{ (record as DeletedDriverItem).park_name }}
            </span>
            <span v-else class="text-[12px] text-ink-muted">Не привязан</span>
          </template>
          <template v-else-if="column.key === 'archive_reason'">
            <span
              class="lotax-badge"
              :class="reasonClass((record as DeletedDriverItem).archive_reason)"
            >
              {{ (record as DeletedDriverItem).archive_reason || 'Нет в активном списке Яндекса' }}
            </span>
          </template>
          <template v-else-if="column.key === 'deleted_at'">
            <span
              v-if="(record as DeletedDriverItem).deleted_at"
              class="lotax-badge lotax-badge--muted tabular-nums"
              :title="
                (record as DeletedDriverItem).deleted_at_exact
                  ? 'Точное время архива'
                  : 'Синхрон не записал время. Показана дата последнего обновления карточки'
              "
            >
              {{ dayjs((record as DeletedDriverItem).deleted_at).format('DD.MM.YYYY HH:mm') }}
            </span>
            <span v-else class="text-[12px] text-ink-muted">Нет даты</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button
              size="small"
              class="lotax-btn-secondary"
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
