<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { adminParkGroupsApi } from '@/api/adminParkGroups'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage } from '@/utils/labels'
import type { ParkGroupItem } from '@/types/api'

const auth = useAuthStore()
const org = useOrgStore()

const loading = ref(false)
const items = ref<ParkGroupItem[]>([])
const modalOpen = ref(false)
const saving = ref(false)
const editing = ref<ParkGroupItem | null>(null)

const form = reactive({
  name: '',
  description: '',
  color: '#3B82F6',
  park_ids: [] as string[],
  is_active: true,
})

const canEdit = computed(() => auth.canManageParkGroups)

const parkOptions = computed(() =>
  org.parks.map((p) => ({ value: p.id, label: p.name })),
)

function parkNames(ids: string[]) {
  const map = new Map(org.parks.map((p) => [p.id, p.name]))
  return ids.map((id) => map.get(id) || id).join(', ') || '—'
}

async function load() {
  loading.value = true
  try {
    const { data } = await adminParkGroupsApi.list()
    items.value = data.items
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.name = ''
  form.description = ''
  form.color = '#3B82F6'
  form.park_ids = []
  form.is_active = true
  modalOpen.value = true
}

function openEdit(item: ParkGroupItem) {
  editing.value = item
  form.name = item.name
  form.description = item.description || ''
  form.color = item.color || '#3B82F6'
  form.park_ids = [...item.park_ids]
  form.is_active = item.is_active
  modalOpen.value = true
}

async function save() {
  if (!form.name.trim()) {
    message.warning('Укажите название')
    return
  }
  if (!form.park_ids.length) {
    message.warning('Выберите хотя бы один парк')
    return
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(form.color.trim())) {
    message.warning('Цвет должен быть HEX, например #FF9800')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      color: form.color.trim() || '#3B82F6',
      park_ids: form.park_ids,
      is_active: form.is_active,
    }
    if (editing.value) {
      await adminParkGroupsApi.update(editing.value.id, payload)
      message.success('Группа обновлена')
    } else {
      await adminParkGroupsApi.create(payload)
      message.success('Группа создана')
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

function remove(item: ParkGroupItem) {
  Modal.confirm({
    title: 'Удалить группу парков?',
    content: item.name,
    okText: 'Удалить',
    cancelText: 'Отмена',
    okButtonProps: { danger: true },
    centered: true,
    async onOk() {
      try {
        await adminParkGroupsApi.remove(item.id)
        message.success('Группа удалена')
        await load()
      } catch (e) {
        message.error(extractErrorMessage(e))
      }
    },
  })
}

onMounted(async () => {
  if (!org.parks.length) await org.fetchParks()
  await load()
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="lotax-page-title">Группы парков</h1>
        <p class="lotax-caption mt-1">Объединения парков для области действия</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a-button class="lotax-btn-secondary" @click="load">
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

    <div v-if="loading" class="flex justify-center py-16"><a-spin size="large" /></div>
    <div v-else-if="!items.length" class="lotax-card p-8 text-center lotax-caption">
      Групп пока нет
    </div>
    <div v-else class="flex flex-col gap-3">
      <article
        v-for="item in items"
        :key="item.id"
        class="lotax-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex min-w-0 items-start gap-3">
          <span
            class="mt-1 h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
            :style="{ backgroundColor: item.color || '#94a3b8' }"
            aria-hidden="true"
          />
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-ink">{{ item.name }}</span>
              <span
                class="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset"
                :class="
                  item.is_active
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : 'bg-slate-100 text-slate-600 ring-slate-300'
                "
              >
                {{ item.is_active ? 'активна' : 'неактивна' }}
              </span>
            </div>
            <div v-if="item.description" class="mt-1 text-[13px] text-ink-muted">
              {{ item.description }}
            </div>
            <div class="mt-1 text-[13px] text-ink-muted">
              Парков: {{ item.parks_count ?? item.park_ids.length }} ·
              {{ parkNames(item.park_ids) }}
            </div>
          </div>
        </div>
        <div v-if="canEdit" class="flex gap-2">
          <a-button class="lotax-btn-secondary" @click="openEdit(item)">Изменить</a-button>
          <a-button danger @click="remove(item)">Удалить</a-button>
        </div>
      </article>
    </div>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? 'Редактировать группу' : 'Новая группа'"
      ok-text="Сохранить"
      cancel-text="Отмена"
      :confirm-loading="saving"
      centered
      :width="520"
      destroy-on-close
      @ok="save"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Название" required>
          <a-input v-model:value="form.name" placeholder="Например: Центр" />
        </a-form-item>
        <a-form-item label="Описание">
          <a-textarea
            v-model:value="form.description"
            :rows="2"
            :auto-size="{ minRows: 2, maxRows: 4 }"
          />
        </a-form-item>
        <a-form-item label="Цвет (hex)">
          <div class="flex items-center gap-3">
            <input
              v-model="form.color"
              type="color"
              class="h-10 w-12 cursor-pointer rounded border border-line bg-white"
            />
            <a-input v-model:value="form.color" class="!flex-1" placeholder="#3B82F6" />
          </div>
        </a-form-item>
        <a-form-item label="Парки" required>
          <a-select
            v-model:value="form.park_ids"
            mode="multiple"
            :options="parkOptions"
            placeholder="Выберите парки"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="Статус">
          <div class="flex items-center gap-2">
            <a-switch v-model:checked="form.is_active" />
            <span class="text-[13px] text-ink-muted">
              {{ form.is_active ? 'Активна' : 'Неактивна' }}
            </span>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
