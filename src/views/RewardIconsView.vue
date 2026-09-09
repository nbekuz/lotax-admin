<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'
import { adminRewardIconsApi } from '@/api/adminRewardIcons'
import { useAuthStore } from '@/stores/auth'
import { extractErrorMessage } from '@/utils/labels'
import type { RewardIconItem } from '@/types/api'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const items = ref<RewardIconItem[]>([])
const modalOpen = ref(false)
const editing = ref<RewardIconItem | null>(null)

const form = reactive({
  title: '',
})
const file = ref<File | null>(null)
const preview = ref<string | null>(null)

const canEdit = computed(() => auth.canManageRewards)
const canView = computed(() => auth.canViewRewards)

const pagination = reactive({
  current: 1,
  pageSize: 50,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `Всего: ${total}`,
})

const columns = [
  { title: 'Иконка', key: 'preview', width: 88 },
  { title: 'Название', key: 'title', dataIndex: 'title', ellipsis: true },
  { title: '', key: 'actions', width: 180 },
]

async function load() {
  if (!canView.value) return
  loading.value = true
  try {
    const { data } = await adminRewardIconsApi.list({
      page: pagination.current,
      page_size: pagination.pageSize,
    })
    items.value = data.items ?? []
    pagination.total = data.total ?? items.value.length
    pagination.current = data.page ?? pagination.current
    pagination.pageSize = data.page_size ?? pagination.pageSize
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось загрузить иконки'))
  } finally {
    loading.value = false
  }
}

function onTableChange(pag: { current?: number; pageSize?: number }) {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 50
  void load()
}

function openCreate() {
  editing.value = null
  form.title = ''
  file.value = null
  preview.value = null
  modalOpen.value = true
}

function openEdit(item: RewardIconItem) {
  editing.value = item
  form.title = item.title
  file.value = null
  preview.value = item.image_url
  modalOpen.value = true
}

function onFileSelect(selected: File) {
  const name = selected.name.toLowerCase()
  const mime = (selected.type || '').toLowerCase()
  const okExt =
    name.endsWith('.svg') ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg')
  const okMime =
    !mime ||
    mime === 'image/svg+xml' ||
    mime === 'image/png' ||
    mime === 'image/jpeg' ||
    mime === 'image/jpg'
  if (!okExt || !okMime) {
    message.error('Допустимы иконки: SVG, PNG, JPG')
    return false
  }
  file.value = selected
  preview.value = URL.createObjectURL(selected)
  return false
}

async function save() {
  if (!form.title.trim()) {
    message.warning('Укажите название')
    return
  }
  if (!editing.value && !file.value) {
    message.warning('Выберите файл SVG / PNG / JPG')
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await adminRewardIconsApi.update(editing.value.id, {
        title: form.title.trim(),
        file: file.value,
      })
      message.success('Иконка обновлена')
    } else {
      await adminRewardIconsApi.create({
        title: form.title.trim(),
        file: file.value!,
      })
      message.success('Иконка создана')
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

function confirmRemove(item: RewardIconItem) {
  Modal.confirm({
    title: 'Удалить иконку?',
    content: `«${item.title}» будет удалена. У наград icon_id станет пустым.`,
    okText: 'Удалить',
    okButtonProps: { danger: true },
    cancelText: 'Отмена',
    centered: true,
    async onOk() {
      try {
        await adminRewardIconsApi.remove(item.id)
        message.success('Иконка удалена')
        await load()
      } catch (e) {
        message.error(extractErrorMessage(e))
        throw e
      }
    },
  })
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="lotax-page-title">Иконки наград</h1>
        <p class="lotax-caption mt-1">
          Каталог организации для dropdown «Иконка» в наградах парка · SVG / PNG / JPG
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a-button class="lotax-btn-secondary" :loading="loading" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button
          v-if="canEdit"
          type="primary"
          class="lotax-btn-primary"
          @click="openCreate"
        >
          <template #icon><PlusOutlined /></template>
          Добавить
        </a-button>
      </div>
    </div>

    <div v-if="!items.length && !loading" class="lotax-card flex flex-col items-center gap-3 px-4 py-14 text-center">
      <p class="text-[15px] font-medium text-ink">Иконок пока нет</p>
      <p class="lotax-caption max-w-sm">
        Загрузите SVG, PNG или JPG — они появятся в dropdown «Иконка» при создании награды парка
      </p>
      <a-button
        v-if="canEdit"
        type="primary"
        class="lotax-btn-primary"
        @click="openCreate"
      >
        <template #icon><PlusOutlined /></template>
        Добавить иконку
      </a-button>
    </div>

    <div v-else class="lotax-card !p-0">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="pagination"
        :locale="{ emptyText: 'Иконок пока нет' }"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'preview'">
            <img
              v-if="(record as RewardIconItem).image_url"
              :src="(record as RewardIconItem).image_url"
              alt=""
              class="h-10 w-10 rounded-lg object-contain ring-1 ring-line bg-white"
            />
            <span v-else class="text-ink-muted">—</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div v-if="canEdit" class="flex gap-2">
              <a-button size="small" @click="openEdit(record as RewardIconItem)">
                Изменить
              </a-button>
              <a-button
                size="small"
                danger
                @click="confirmRemove(record as RewardIconItem)"
              >
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? 'Редактировать иконку' : 'Новая иконка'"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="saving"
      centered
      :width="440"
      destroy-on-close
      @ok="save"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Название" required>
          <a-input
            v-model:value="form.title"
            maxlength="100"
            placeholder="Например: кофэман"
          />
        </a-form-item>
        <a-form-item
          :label="editing ? 'Файл (необязательно)' : 'Файл'"
          :required="!editing"
        >
          <a-upload
            accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
            :show-upload-list="false"
            :before-upload="onFileSelect"
          >
            <a-button class="lotax-btn-secondary">Выбрать файл</a-button>
          </a-upload>
          <p class="lotax-caption mt-1">SVG, PNG или JPG</p>
          <img
            v-if="preview"
            :src="preview"
            alt=""
            class="mt-2 h-16 w-16 rounded-lg object-contain ring-1 ring-line bg-white"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
