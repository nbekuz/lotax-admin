<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import type { TableColumnsType } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useAdminsStore } from '@/stores/admins'
import { useChatStore } from '@/stores/chat'
import { useBreakpoint } from '@/composables/useBreakpoint'
import {
  adminStatusLabel,
  adminStatusTone,
  extractErrorMessage,
  roleLabel,
} from '@/utils/labels'
import type {
  AdminListItem,
  AdminStatus,
  StaffAssignableRole,
} from '@/types/api'

const auth = useAuthStore()
const admins = useAdminsStore()
const chat = useChatStore()
const router = useRouter()
const { isMobile, width } = useBreakpoint()

const stickyConfig = computed(() => ({
  offsetHeader: width.value >= 1280 ? 72 : width.value >= 768 ? 64 : 56,
}))

const roleFilter = ref<'manager' | 'all'>('manager')
const createOpen = ref(false)
const editOpen = ref(false)
const saving = ref(false)
const editing = ref<AdminListItem | null>(null)

const createForm = reactive({
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  role: 'manager' as StaffAssignableRole,
})

const editForm = reactive({
  first_name: '',
  last_name: '',
  status: 'active' as AdminStatus,
  password: '',
})

const roleFilterOptions = [{ value: 'manager', label: 'Менеджер' }]

const createRoleOptions = computed(() =>
  auth.creatableRoles.map((role) => ({
    value: role,
    label: roleLabel[role],
  })),
)

const createRules: Record<string, Rule[]> = {
  email: [
    { required: true, message: 'Введите email', trigger: 'blur' },
    { type: 'email', message: 'Некорректный email', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Введите пароль', trigger: 'blur' },
    { min: 8, message: 'Минимум 8 символов', trigger: 'blur' },
  ],
  first_name: [{ required: true, message: 'Введите имя', trigger: 'blur' }],
  last_name: [{ required: true, message: 'Введите фамилию', trigger: 'blur' }],
  role: [{ required: true, message: 'Выберите роль', trigger: 'change' }],
}

const columns = computed<TableColumnsType<AdminListItem>>(() => [
  { title: 'Имя', key: 'name' },
  { title: 'Эл. почта', dataIndex: 'email', key: 'email' },
  { title: 'Роль', dataIndex: 'role', key: 'role', width: 130 },
  { title: 'Статус', dataIndex: 'status', key: 'status', width: 150 },
  { title: 'Создан', dataIndex: 'created_at', key: 'created_at', width: 160 },
  { title: '', key: 'actions', width: 180 },
])

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `Всего: ${total}`,
})

async function load() {
  try {
    await admins.fetchList({
      page: pagination.current,
      page_size: pagination.pageSize,
      role: roleFilter.value === 'all' ? 'manager' : roleFilter.value,
    })
    pagination.total = admins.total
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function onTableChange(pag: { current?: number; pageSize?: number }) {
  pagination.current = pag.current ?? 1
  pagination.pageSize = pag.pageSize ?? 20
  load()
}

function onMobilePageChange(page: number) {
  pagination.current = page
  load()
}

async function openChat(record: AdminListItem) {
  try {
    const conversation = await chat.openStaff(record.id)
    await router.push({
      name: 'chat-conversation',
      params: { id: conversation.id },
    })
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function resetCreateForm() {
  createForm.email = ''
  createForm.password = ''
  createForm.first_name = ''
  createForm.last_name = ''
  createForm.role = auth.creatableRoles[0] ?? 'manager'
}

function openCreate() {
  resetCreateForm()
  createOpen.value = true
}

function openEdit(record: AdminListItem) {
  editing.value = record
  editForm.first_name = record.first_name
  editForm.last_name = record.last_name
  editForm.status = record.status
  editForm.password = ''
  editOpen.value = true
}

async function submitCreate() {
  saving.value = true
  try {
    await admins.create({
      email: createForm.email.trim(),
      password: createForm.password,
      first_name: createForm.first_name.trim(),
      last_name: createForm.last_name.trim(),
      role: createForm.role,
    })
    message.success('Сотрудник создан')
    createOpen.value = false
    pagination.current = 1
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось создать сотрудника'))
  } finally {
    saving.value = false
  }
}

async function submitEdit() {
  if (!editing.value) return
  if (editForm.password.trim() && editForm.password.trim().length < 8) {
    message.warning('Пароль: минимум 8 символов')
    return
  }
  saving.value = true
  try {
    await admins.update(editing.value.id, {
      first_name: editForm.first_name.trim() || null,
      last_name: editForm.last_name.trim() || null,
      status: editForm.status,
      password: editForm.password.trim() || null,
    })
    message.success('Данные обновлены')
    editOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось обновить сотрудника'))
  } finally {
    saving.value = false
  }
}

watch(roleFilter, () => {
  pagination.current = 1
  load()
})

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <h1 class="lotax-page-title">Сотрудники</h1>
        <p class="lotax-caption mt-1">
          Менеджеры парка. Роль admin в парке не создаётся.
        </p>
      </div>

      <div class="lotax-filter-stack md:flex md:flex-wrap md:items-center md:gap-2">
        <a-select
          v-model:value="roleFilter"
          class="md:!w-44"
          size="large"
          :options="roleFilterOptions"
        />
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button
          v-if="auth.creatableRoles.length"
          type="primary"
          class="lotax-btn-primary"
          @click="openCreate"
        >
          <template #icon><PlusOutlined /></template>
          Добавить
        </a-button>
      </div>
    </div>

    <!-- Mobile cards -->
    <div v-if="isMobile" class="flex flex-col gap-4">
      <div v-if="admins.loading" class="flex justify-center py-16">
        <a-spin size="large" />
      </div>

      <template v-else-if="admins.items.length">
        <article
          v-for="item in admins.items"
          :key="item.id"
          class="lotax-card p-4"
        >
          <div class="mb-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="truncate text-[16px] font-semibold text-ink">
                {{ item.first_name }} {{ item.last_name }}
              </h3>
              <p class="mt-0.5 truncate text-[13px] text-ink-muted">
                {{ item.email }}
              </p>
            </div>
            <TeamOutlined class="mt-1 shrink-0 text-ink-muted" />
          </div>

          <div class="mb-3 flex flex-wrap gap-2">
            <span
              class="inline-flex items-center rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-medium text-brand ring-1 ring-inset ring-orange-200"
            >
              {{ roleLabel[item.role] }}
            </span>
            <span
              class="inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
              :class="adminStatusTone[item.status]"
            >
              {{ adminStatusLabel[item.status] }}
            </span>
          </div>

          <p class="mb-3 text-[12px] text-ink-muted">
            Создан · {{ dayjs(item.created_at).format('DD.MM.YYYY HH:mm') }}
          </p>

          <a-button class="lotax-btn-secondary" block @click="openEdit(item)">
            Изменить
          </a-button>
        </article>

        <div class="flex justify-center py-2">
          <a-pagination
            :current="pagination.current"
            :page-size="pagination.pageSize"
            :total="pagination.total"
            :show-size-changer="false"
            size="small"
            @change="onMobilePageChange"
          />
        </div>
      </template>

      <div
        v-else
        class="lotax-card flex flex-col items-center justify-center gap-2 px-4 py-16 text-center"
      >
        <p class="text-[15px] font-medium text-ink">Сотрудники не найдены</p>
        <p class="lotax-caption">Добавьте первого сотрудника или смените фильтр</p>
      </div>
    </div>

    <!-- Desktop / tablet table -->
    <div v-else class="lotax-card staff-table-card !p-0">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="admins.items"
        :loading="admins.loading"
        :pagination="pagination"
        :sticky="stickyConfig"
        :locale="{ emptyText: 'Сотрудники не найдены' }"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="font-medium text-ink">
              {{ (record as AdminListItem).first_name }}
              {{ (record as AdminListItem).last_name }}
            </div>
          </template>
          <template v-else-if="column.key === 'role'">
            <span
              class="inline-flex items-center rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-medium text-brand ring-1 ring-inset ring-orange-200"
            >
              {{ roleLabel[(record as AdminListItem).role] }}
            </span>
          </template>
          <template v-else-if="column.key === 'status'">
            <span
              class="inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
              :class="adminStatusTone[(record as AdminListItem).status]"
            >
              {{ adminStatusLabel[(record as AdminListItem).status] }}
            </span>
          </template>
          <template v-else-if="column.key === 'created_at'">
            <span class="text-[13px] text-ink-muted">
              {{ dayjs((record as AdminListItem).created_at).format('DD.MM.YYYY HH:mm') }}
            </span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="flex flex-wrap items-center gap-2">
              <a-button
                type="link"
                class="!px-0"
                @click="openChat(record as AdminListItem)"
              >
                Чат
              </a-button>
              <a-button type="link" class="!px-0" @click="openEdit(record as AdminListItem)">
                Изменить
              </a-button>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- Create modal -->
    <a-modal
      v-model:open="createOpen"
      title="Добавить сотрудника"
      ok-text="Создать"
      cancel-text="Отмена"
      centered
      :confirm-loading="saving"
      :width="480"
      @ok="submitCreate"
    >
      <a-form layout="vertical" class="mt-2" :model="createForm" :rules="createRules">
        <a-form-item label="Эл. почта" name="email">
          <a-input v-model:value="createForm.email" size="large" type="email" />
        </a-form-item>
        <a-form-item label="Пароль" name="password">
          <a-input-password v-model:value="createForm.password" size="large" />
        </a-form-item>
        <div class="grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-3">
          <a-form-item label="Имя" name="first_name">
            <a-input v-model:value="createForm.first_name" size="large" />
          </a-form-item>
          <a-form-item label="Фамилия" name="last_name">
            <a-input v-model:value="createForm.last_name" size="large" />
          </a-form-item>
        </div>
        <a-form-item label="Роль" name="role">
          <a-select
            v-model:value="createForm.role"
            size="large"
            class="!w-full"
            :options="createRoleOptions"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Edit modal -->
    <a-modal
      v-model:open="editOpen"
      title="Изменить сотрудника"
      ok-text="Сохранить"
      cancel-text="Отмена"
      centered
      :confirm-loading="saving"
      :width="480"
      @ok="submitEdit"
    >
      <a-form layout="vertical" class="mt-2">
        <p v-if="editing" class="mb-4 text-[13px] text-ink-muted">
          {{ editing.email }} · {{ roleLabel[editing.role] }}
        </p>
        <div class="grid grid-cols-1 gap-0 md:grid-cols-2 md:gap-3">
          <a-form-item label="Имя">
            <a-input v-model:value="editForm.first_name" size="large" />
          </a-form-item>
          <a-form-item label="Фамилия">
            <a-input v-model:value="editForm.last_name" size="large" />
          </a-form-item>
        </div>
        <a-form-item label="Статус">
          <a-select
            v-model:value="editForm.status"
            size="large"
            class="!w-full"
            :options="[
              { value: 'active', label: 'Активен' },
              { value: 'blocked', label: 'Заблокирован' },
              { value: 'inactive', label: 'Неактивен' },
            ]"
          />
        </a-form-item>
        <a-form-item label="Новый пароль (необязательно)">
          <a-input-password
            v-model:value="editForm.password"
            size="large"
            placeholder="Минимум 8 символов"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.staff-table-card {
  overflow: visible;
}

:deep(.ant-table) {
  border: none !important;
}

:deep(.ant-table-pagination.ant-pagination) {
  display: flex !important;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin: 0 !important;
  padding: 12px 16px 16px !important;
  border-top: 1px solid var(--lotax-border);
}
</style>
