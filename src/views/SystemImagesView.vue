<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { adminSystemImagesApi } from '@/api/adminSystemImages'
import { useAuthStore } from '@/stores/auth'
import { extractErrorMessage } from '@/utils/labels'
import type { SystemImageItem } from '@/types/api'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const items = ref<SystemImageItem[]>([])
const modalOpen = ref(false)
const editing = ref<SystemImageItem | null>(null)

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
  { title: 'Картинка', key: 'preview', width: 88 },
  { title: 'Название', key: 'title', dataIndex: 'title', ellipsis: true },
  { title: '', key: 'actions', width: 180 },
]

async function load() {
  if (!canView.value) return
  loading.value = true
  try {
    const { data } = await adminSystemImagesApi.list({
      page: pagination.current,
      page_size: pagination.pageSize,
    })
    items.value = data.items ?? []
    pagination.total = data.total ?? items.value.length
    pagination.current = data.page ?? pagination.current
    pagination.pageSize = data.page_size ?? pagination.pageSize
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось загрузить картинки'))
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

function openEdit(item: SystemImageItem) {
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
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif')
  const okMime =
    !mime ||
    mime === 'image/png' ||
    mime === 'image/jpeg' ||
    mime === 'image/jpg' ||
    mime === 'image/webp' ||
    mime === 'image/gif'
  if (!okExt || !okMime) {
    message.error('Допустимы JPEG, PNG, WEBP, GIF')
    return false
  }
  file.value = selected
  preview.value = URL.createObjectURL(selected)
  return false
}

async function save() {
  if (!form.title.trim()) {
    message.warning('Укажите название')
    return Promise.reject()
  }
  if (!editing.value && !file.value) {
    message.warning('Выберите изображение')
    return Promise.reject()
  }
  saving.value = true
  try {
    if (editing.value) {
      await adminSystemImagesApi.update(editing.value.id, {
        title: form.title.trim(),
        file: file.value,
      })
      message.success('Картинка обновлена')
    } else {
      await adminSystemImagesApi.create({
        title: form.title.trim(),
        file: file.value!,
      })
      message.success('Картинка создана')
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
    return Promise.reject()
  } finally {
    saving.value = false
  }
}

function confirmRemove(item: SystemImageItem) {
  Modal.confirm({
    title: 'Удалить картинку?',
    content: `«${item.title}» будет удалена. У наград выбор картинки станет пустым.`,
    okText: 'Удалить',
    okButtonProps: { danger: true },
    cancelText: 'Отмена',
    centered: true,
    async onOk() {
      try {
        await adminSystemImagesApi.remove(item.id)
        message.success('Картинка удалена')
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
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="lotax-page-title">Системные картинки</h1>
        <p class="lotax-caption mt-1">
          Каталог организации для поля «Системная картинка» в наградах парка · JPEG / PNG / WEBP / GIF
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
      <p class="text-[15px] font-medium text-ink">Картинок пока нет</p>
      <p class="lotax-caption max-w-sm">
        Загрузите фото — оно появится в списке «Системная картинка» при создании награды
      </p>
      <a-button
        v-if="canEdit"
        type="primary"
        class="lotax-btn-primary"
        @click="openCreate"
      >
        <template #icon><PlusOutlined /></template>
        Добавить картинку
      </a-button>
    </div>

    <div v-else class="lotax-card !p-0">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :pagination="pagination"
        :locale="{ emptyText: 'Картинок пока нет' }"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'preview'">
            <span
              v-if="(record as SystemImageItem).image_url"
              class="picture-frame"
            >
              <img :src="(record as SystemImageItem).image_url" alt="" />
            </span>
            <span v-else class="text-ink-muted">—</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div v-if="canEdit" class="flex gap-2">
              <a-button size="small" @click="openEdit(record as SystemImageItem)">
                Изменить
              </a-button>
              <a-button
                size="small"
                danger
                @click="confirmRemove(record as SystemImageItem)"
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
      :title="editing ? 'Редактировать картинку' : 'Новая картинка'"
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
            :maxlength="100"
            placeholder="Например: Мойка"
          />
        </a-form-item>
        <a-form-item
          :label="editing ? 'Файл (необязательно)' : 'Файл'"
          :required="!editing"
        >
          <a-upload
            accept="image/jpeg,image/png,image/webp,image/gif"
            :show-upload-list="false"
            :before-upload="onFileSelect"
          >
            <a-button class="lotax-btn-secondary">Выбрать файл</a-button>
          </a-upload>
          <p class="lotax-caption mt-1">JPEG, PNG, WEBP или GIF</p>
          <span v-if="preview" class="picture-frame picture-frame--lg mt-2">
            <img :src="preview" alt="" />
          </span>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.picture-frame {
  display: inline-flex;
  width: 56px;
  height: 56px;
  min-width: 56px;
  min-height: 56px;
  flex: 0 0 56px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 12px;
  background: var(--lotax-media-well);
  box-shadow: inset 0 0 0 1px var(--lotax-border);
  vertical-align: middle;
}

.picture-frame--lg {
  width: 80px;
  height: 80px;
  min-width: 80px;
  min-height: 80px;
  flex-basis: 80px;
}

.picture-frame img {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: contain;
  object-position: center;
}

.picture-frame--lg img {
  width: 100%;
  height: 100%;
}
</style>
