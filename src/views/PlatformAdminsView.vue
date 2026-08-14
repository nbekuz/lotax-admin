<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { superAdminApi } from '@/api/superAdmin'
import { extractErrorMessage, roleLabel } from '@/utils/labels'
import type { AdminListItem } from '@/types/api'

const loading = ref(false)
const saving = ref(false)
const createOpen = ref(false)
const items = ref<AdminListItem[]>([])
const total = ref(0)

const pagination = reactive({
  current: 1,
  pageSize: 20,
})

const createForm = reactive({
  email: '',
  password: '',
  first_name: '',
  last_name: '',
})

async function load() {
  loading.value = true
  try {
    const { data } = await superAdminApi.listPlatformAdmins({
      page: pagination.current,
      page_size: pagination.pageSize,
    })
    items.value = data.items
    total.value = data.total
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loading.value = false
  }
}

function onPageChange(page: number, pageSize: number) {
  pagination.current = page
  pagination.pageSize = pageSize
  load()
}

function resetCreate() {
  createForm.email = ''
  createForm.password = ''
  createForm.first_name = ''
  createForm.last_name = ''
}

async function submitCreate() {
  if (!createForm.email.trim() || !createForm.password || !createForm.first_name.trim() || !createForm.last_name.trim()) {
    message.warning('Заполните все поля')
    return
  }
  saving.value = true
  try {
    await superAdminApi.createPlatformAdmin({
      email: createForm.email.trim(),
      password: createForm.password,
      first_name: createForm.first_name.trim(),
      last_name: createForm.last_name.trim(),
      role: 'admin',
    })
    message.success('Админ платформы создан')
    createOpen.value = false
    resetCreate()
    pagination.current = 1
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось создать админа'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="lotax-page-title">Админы платформы</h1>
        <p class="lotax-caption mt-1">
          Роль admin: организации и парки, без доступа к водителям
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button type="primary" class="lotax-btn-primary" @click="createOpen = true">
          <template #icon><PlusOutlined /></template>
          Добавить
        </a-button>
      </div>
    </div>

    <div v-if="loading && !items.length" class="flex justify-center py-20">
      <a-spin size="large" />
    </div>

    <div v-else class="flex flex-col gap-3">
      <article
        v-for="item in items"
        :key="item.id"
        class="lotax-card flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between md:p-5"
      >
        <div>
          <p class="text-[16px] font-semibold text-ink">
            {{ item.first_name }} {{ item.last_name }}
          </p>
          <p class="text-[13px] text-ink-muted">{{ item.email }}</p>
        </div>
        <span
          class="inline-flex w-fit items-center rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-medium text-brand ring-1 ring-inset ring-orange-200"
        >
          {{ roleLabel[item.role] ?? item.role }}
        </span>
      </article>

      <div v-if="!items.length && !loading" class="lotax-card p-8 text-center lotax-caption">
        Админы платформы не найдены
      </div>

      <div v-if="total > pagination.pageSize" class="flex justify-center py-2">
        <a-pagination
          :current="pagination.current"
          :page-size="pagination.pageSize"
          :total="total"
          @change="onPageChange"
        />
      </div>
    </div>

    <a-modal
      v-model:open="createOpen"
      title="Новый админ платформы"
      ok-text="Создать"
      cancel-text="Отмена"
      centered
      :width="440"
      :confirm-loading="saving"
      @ok="submitCreate"
      @cancel="resetCreate"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Email" required>
          <a-input v-model:value="createForm.email" size="large" />
        </a-form-item>
        <a-form-item label="Пароль" required>
          <a-input-password v-model:value="createForm.password" size="large" />
        </a-form-item>
        <a-form-item label="Имя" required>
          <a-input v-model:value="createForm.first_name" size="large" />
        </a-form-item>
        <a-form-item label="Фамилия" required>
          <a-input v-model:value="createForm.last_name" size="large" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
