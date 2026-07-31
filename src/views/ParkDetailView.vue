<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  LeftOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue'
import { useParksStore } from '@/stores/parks'
import {
  extractErrorMessage,
  roleLabel,
  adminStatusLabel,
  adminStatusTone,
} from '@/utils/labels'
import InfoField from '@/components/InfoField.vue'
import CopyableId from '@/components/CopyableId.vue'

const route = useRoute()
const router = useRouter()
const parks = useParksStore()

const parkId = computed(() => route.params.id as string)
const saving = ref(false)
const directorOpen = ref(false)
const directorSaving = ref(false)

const editForm = reactive({
  name: '',
  legal_name: '',
  yandex_park_id: '',
  yandex_client_id: '',
  yandex_api_key: '',
  is_active: true,
  notes: '',
})

const directorForm = reactive({
  email: '',
  password: '',
  first_name: '',
  last_name: '',
})

async function load() {
  try {
    await parks.fetchById(parkId.value)
    if (parks.current) {
      editForm.name = parks.current.name
      editForm.legal_name = parks.current.legal_name || ''
      editForm.yandex_park_id = parks.current.yandex_park_id || ''
      editForm.yandex_client_id = parks.current.yandex_client_id || ''
      editForm.yandex_api_key = ''
      editForm.is_active = parks.current.is_active
      editForm.notes = parks.current.notes || ''
    }
    await parks.fetchStaff(parkId.value)
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

async function savePark() {
  saving.value = true
  try {
    await parks.update(parkId.value, {
      name: editForm.name.trim() || null,
      legal_name: editForm.legal_name.trim() || null,
      yandex_park_id: editForm.yandex_park_id.trim() || null,
      yandex_client_id: editForm.yandex_client_id.trim() || null,
      yandex_api_key: editForm.yandex_api_key.trim() || null,
      is_active: editForm.is_active,
      notes: editForm.notes.trim() || null,
    })
    message.success('Парк обновлён')
    editForm.yandex_api_key = ''
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

async function toggleSubscription() {
  if (!parks.current) return
  const next = !parks.current.subscription_active
  try {
    await parks.setSubscription(parkId.value, next)
    message.success(next ? 'Подписка включена' : 'Подписка отключена')
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

async function submitDirector() {
  directorSaving.value = true
  try {
    await parks.createDirector(parkId.value, {
      email: directorForm.email.trim(),
      password: directorForm.password,
      first_name: directorForm.first_name.trim(),
      last_name: directorForm.last_name.trim(),
    })
    message.success('Директор назначен')
    directorOpen.value = false
    directorForm.email = ''
    directorForm.password = ''
    directorForm.first_name = ''
    directorForm.last_name = ''
    await parks.fetchStaff(parkId.value)
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось создать директора'))
  } finally {
    directorSaving.value = false
  }
}

watch(parkId, load)
onMounted(load)
</script>

<template>
  <div v-if="parks.current" class="flex flex-col gap-6 md:gap-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <button type="button" class="driver-back mb-4" @click="router.push('/parks')">
          <LeftOutlined />
          К списку парков
        </button>
        <p class="lotax-caption mb-1">Таксопарк</p>
        <h1 class="lotax-page-title">{{ parks.current.name }}</h1>
        <div class="mt-3 flex flex-wrap gap-2">
          <span
            class="rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
            :class="
              parks.current.subscription_active
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-red-50 text-red-700 ring-red-200'
            "
          >
            {{ parks.current.subscription_active ? 'Подписка активна' : 'Подписка отключена' }}
          </span>
          <span
            class="rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset bg-slate-100 text-slate-700 ring-slate-300"
          >
            {{ parks.current.is_active ? 'Парк активен' : 'Парк неактивен' }}
          </span>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button
          :class="parks.current.subscription_active ? 'lotax-btn-danger' : 'lotax-btn-primary'"
          :type="parks.current.subscription_active ? 'default' : 'primary'"
          @click="toggleSubscription"
        >
          {{ parks.current.subscription_active ? 'Отключить подписку' : 'Включить подписку' }}
        </a-button>
        <a-button class="lotax-btn-secondary" @click="directorOpen = true">
          <template #icon><UserAddOutlined /></template>
          Назначить директора
        </a-button>
      </div>
    </div>

    <section class="lotax-card p-5 md:p-7">
      <h2 class="lotax-section-title mb-5">Данные парка</h2>
      <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <InfoField
          label="Создан"
          :value="dayjs(parks.current.created_at).format('DD.MM.YYYY HH:mm')"
        />
        <InfoField
          label="Обновлён"
          :value="dayjs(parks.current.updated_at).format('DD.MM.YYYY HH:mm')"
        />
        <InfoField
          label="Yandex API Key"
          :value="parks.current.has_yandex_api_key ? 'Задан' : 'Не задан'"
        />
      </div>
      <CopyableId label="Park UUID" :value="parks.current.id" />

      <a-form layout="vertical" class="mt-6">
        <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <a-form-item label="Название">
            <a-input v-model:value="editForm.name" size="large" />
          </a-form-item>
          <a-form-item label="Юридическое название">
            <a-input v-model:value="editForm.legal_name" size="large" />
          </a-form-item>
          <a-form-item label="Yandex Park ID">
            <a-input v-model:value="editForm.yandex_park_id" size="large" />
          </a-form-item>
          <a-form-item label="Yandex Client ID">
            <a-input v-model:value="editForm.yandex_client_id" size="large" />
          </a-form-item>
          <a-form-item label="Новый Yandex API Key">
            <a-input-password
              v-model:value="editForm.yandex_api_key"
              size="large"
              placeholder="Оставьте пустым, чтобы не менять"
            />
          </a-form-item>
          <a-form-item label="Парк активен">
            <a-switch v-model:checked="editForm.is_active" />
          </a-form-item>
        </div>
        <a-form-item label="Заметки">
          <a-textarea v-model:value="editForm.notes" :rows="3" />
        </a-form-item>
        <a-button
          type="primary"
          class="lotax-btn-primary"
          :loading="saving"
          @click="savePark"
        >
          Сохранить
        </a-button>
      </a-form>
    </section>

    <section class="lotax-card p-5 md:p-7">
      <h2 class="lotax-section-title mb-5">Сотрудники парка</h2>
      <div v-if="!parks.staff.length" class="lotax-caption py-6 text-center">
        Сотрудников пока нет
      </div>
      <div v-else class="flex flex-col gap-3">
        <div
          v-for="member in parks.staff"
          :key="member.id"
          class="flex flex-col gap-1 rounded-xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div class="font-medium text-ink">
              {{ member.first_name }} {{ member.last_name }}
            </div>
            <div class="text-[13px] text-ink-muted">{{ member.email }}</div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-medium text-brand ring-1 ring-inset ring-orange-200"
            >
              {{ roleLabel[member.role] }}
            </span>
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
              :class="adminStatusTone[member.status]"
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="{
                  'bg-emerald-500': member.status === 'active',
                  'bg-red-500': member.status === 'blocked',
                  'bg-slate-400': member.status === 'inactive',
                }"
              />
              {{ adminStatusLabel[member.status] }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <a-modal
      v-model:open="directorOpen"
      title="Назначить директора"
      ok-text="Создать"
      cancel-text="Отмена"
      centered
      :width="480"
      :confirm-loading="directorSaving"
      @ok="submitDirector"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Email" required>
          <a-input v-model:value="directorForm.email" size="large" type="email" />
        </a-form-item>
        <a-form-item label="Пароль" required>
          <a-input-password v-model:value="directorForm.password" size="large" />
        </a-form-item>
        <div class="grid grid-cols-1 md:grid-cols-2 md:gap-3">
          <a-form-item label="Имя" required>
            <a-input v-model:value="directorForm.first_name" size="large" />
          </a-form-item>
          <a-form-item label="Фамилия" required>
            <a-input v-model:value="directorForm.last_name" size="large" />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>
  </div>

  <div v-else class="flex justify-center py-24">
    <a-spin size="large" />
  </div>
</template>

<style scoped>
.driver-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid #ececec;
  background: #fff;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
</style>
