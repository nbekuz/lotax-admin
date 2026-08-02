<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  LeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue'
import { useOrganizationsStore } from '@/stores/organizations'
import {
  extractErrorMessage,
  roleLabel,
  adminStatusLabel,
  adminStatusTone,
} from '@/utils/labels'
import InfoField from '@/components/InfoField.vue'
import CopyableId from '@/components/CopyableId.vue'
import type { ParkResponse } from '@/types/api'

const route = useRoute()
const router = useRouter()
const orgs = useOrganizationsStore()

const orgId = computed(() => route.params.id as string)
const saving = ref(false)
const directorOpen = ref(false)
const directorSaving = ref(false)
const parkOpen = ref(false)
const parkSaving = ref(false)
const editingPark = ref<ParkResponse | null>(null)

const editForm = reactive({
  name: '',
  legal_name: '',
  is_active: true,
  notes: '',
})

const directorForm = reactive({
  email: '',
  password: '',
  first_name: '',
  last_name: '',
})

const parkForm = reactive({
  name: '',
  legal_name: '',
  yandex_park_id: '',
  yandex_client_id: '',
  yandex_api_key: '',
  subscription_active: true,
  is_active: true,
  notes: '',
})

async function load() {
  try {
    await orgs.fetchById(orgId.value)
    if (orgs.current) {
      editForm.name = orgs.current.name
      editForm.legal_name = orgs.current.legal_name || ''
      editForm.is_active = orgs.current.is_active
      editForm.notes = orgs.current.notes || ''
    }
    await Promise.all([
      orgs.fetchParks(orgId.value),
      orgs.fetchStaff(orgId.value),
    ])
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

async function saveOrg() {
  saving.value = true
  try {
    await orgs.update(orgId.value, {
      name: editForm.name.trim() || null,
      legal_name: editForm.legal_name.trim() || null,
      is_active: editForm.is_active,
      notes: editForm.notes.trim() || null,
    })
    message.success('Организация обновлена')
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

async function toggleSubscription() {
  if (!orgs.current) return
  const next = !orgs.current.subscription_active
  try {
    await orgs.setSubscription(orgId.value, next)
    message.success(next ? 'Подписка включена' : 'Подписка отключена')
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function openCreatePark() {
  editingPark.value = null
  parkForm.name = ''
  parkForm.legal_name = ''
  parkForm.yandex_park_id = ''
  parkForm.yandex_client_id = ''
  parkForm.yandex_api_key = ''
  parkForm.subscription_active = true
  parkForm.is_active = true
  parkForm.notes = ''
  parkOpen.value = true
}

function openEditPark(park: ParkResponse) {
  editingPark.value = park
  parkForm.name = park.name
  parkForm.legal_name = park.legal_name || ''
  parkForm.yandex_park_id = park.yandex_park_id || ''
  parkForm.yandex_client_id = park.yandex_client_id || ''
  parkForm.yandex_api_key = ''
  parkForm.subscription_active = park.subscription_active
  parkForm.is_active = park.is_active
  parkForm.notes = park.notes || ''
  parkOpen.value = true
}

async function submitPark() {
  if (!parkForm.name.trim()) {
    message.warning('Укажите название парка')
    return
  }
  parkSaving.value = true
  try {
    if (editingPark.value) {
      await orgs.updatePark(editingPark.value.id, {
        name: parkForm.name.trim() || null,
        legal_name: parkForm.legal_name.trim() || null,
        yandex_park_id: parkForm.yandex_park_id.trim() || null,
        yandex_client_id: parkForm.yandex_client_id.trim() || null,
        yandex_api_key: parkForm.yandex_api_key.trim() || null,
        subscription_active: parkForm.subscription_active,
        is_active: parkForm.is_active,
        notes: parkForm.notes.trim() || null,
      })
      message.success('Парк обновлён')
    } else {
      await orgs.createPark(orgId.value, {
        name: parkForm.name.trim(),
        legal_name: parkForm.legal_name.trim() || null,
        yandex_park_id: parkForm.yandex_park_id.trim() || null,
        yandex_client_id: parkForm.yandex_client_id.trim() || null,
        yandex_api_key: parkForm.yandex_api_key.trim() || null,
        subscription_active: parkForm.subscription_active,
        notes: parkForm.notes.trim() || null,
      })
      message.success('Парк добавлен')
    }
    parkOpen.value = false
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось сохранить парк'))
  } finally {
    parkSaving.value = false
  }
}

async function submitDirector() {
  if (!directorForm.email.trim()) {
    message.warning('Укажите email')
    return
  }
  if (directorForm.password.length < 8) {
    message.warning('Пароль: минимум 8 символов')
    return
  }
  if (!directorForm.first_name.trim() || !directorForm.last_name.trim()) {
    message.warning('Укажите имя и фамилию')
    return
  }
  directorSaving.value = true
  try {
    await orgs.createDirector(orgId.value, {
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
    await orgs.fetchStaff(orgId.value)
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось создать директора'))
  } finally {
    directorSaving.value = false
  }
}

watch(orgId, load)
onMounted(load)
</script>

<template>
  <div v-if="orgs.current" class="flex flex-col gap-6 md:gap-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <button
          type="button"
          class="driver-back mb-4"
          @click="router.push('/organizations')"
        >
          <LeftOutlined />
          К списку организаций
        </button>
        <p class="lotax-caption mb-1">Организация</p>
        <h1 class="lotax-page-title">{{ orgs.current.name }}</h1>
        <div class="mt-3 flex flex-wrap gap-2">
          <span
            class="rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
            :class="
              orgs.current.subscription_active
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-red-50 text-red-700 ring-red-200'
            "
          >
            {{
              orgs.current.subscription_active
                ? 'Подписка активна'
                : 'Подписка отключена'
            }}
          </span>
          <span
            class="rounded-full bg-slate-100 px-2.5 py-1 text-[13px] font-medium text-slate-700 ring-1 ring-inset ring-slate-300"
          >
            {{ orgs.current.is_active ? 'Активна' : 'Неактивна' }}
          </span>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button
          :class="orgs.current.subscription_active ? 'lotax-btn-danger' : 'lotax-btn-primary'"
          :type="orgs.current.subscription_active ? 'default' : 'primary'"
          @click="toggleSubscription"
        >
          {{
            orgs.current.subscription_active
              ? 'Отключить подписку'
              : 'Включить подписку'
          }}
        </a-button>
        <a-button class="lotax-btn-secondary" @click="directorOpen = true">
          <template #icon><UserAddOutlined /></template>
          Назначить директора
        </a-button>
      </div>
    </div>

    <section class="lotax-card p-5 md:p-7">
      <h2 class="lotax-section-title mb-5">Данные организации</h2>
      <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <InfoField
          label="Создана"
          :value="dayjs(orgs.current.created_at).format('DD.MM.YYYY HH:mm')"
        />
        <InfoField
          label="Обновлена"
          :value="dayjs(orgs.current.updated_at).format('DD.MM.YYYY HH:mm')"
        />
        <InfoField
          label="Парков"
          :value="String(orgs.parksTotal || orgs.current.parks_count || 0)"
        />
      </div>
      <CopyableId label="UUID организации" :value="orgs.current.id" />

      <a-form layout="vertical" class="mt-6">
        <div class="grid grid-cols-1 gap-x-4 md:grid-cols-2">
          <a-form-item label="Название">
            <a-input v-model:value="editForm.name" size="large" />
          </a-form-item>
          <a-form-item label="Юридическое название">
            <a-input v-model:value="editForm.legal_name" size="large" />
          </a-form-item>
          <a-form-item label="Организация активна">
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
          @click="saveOrg"
        >
          Сохранить
        </a-button>
      </a-form>
    </section>

    <section class="lotax-card p-5 md:p-7">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 class="lotax-section-title">Парки организации</h2>
        <a-button class="lotax-btn-primary" type="primary" @click="openCreatePark">
          <template #icon><PlusOutlined /></template>
          Добавить парк
        </a-button>
      </div>
      <div v-if="!orgs.parks.length" class="lotax-caption py-6 text-center">
        Парков пока нет — добавьте первый
      </div>
      <div v-else class="flex flex-col gap-3">
        <button
          v-for="park in orgs.parks"
          :key="park.id"
          type="button"
          class="flex flex-col gap-1 rounded-xl border border-line bg-surface px-4 py-3 text-left transition-colors md:hover:border-orange-200 sm:flex-row sm:items-center sm:justify-between"
          @click="openEditPark(park)"
        >
          <div>
            <div class="font-medium text-ink">{{ park.name }}</div>
            <div class="font-mono text-[13px] text-ink-muted">
              {{ park.yandex_park_id || 'Без Yandex ID' }}
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
              :class="
                park.subscription_active
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-red-50 text-red-700 ring-red-200'
              "
            >
              {{ park.subscription_active ? 'Подписка' : 'Нет подписки' }}
            </span>
            <span class="text-[13px] text-ink-muted">
              {{ park.has_yandex_api_key ? 'API-ключ задан' : 'Нет API-ключа' }}
            </span>
          </div>
        </button>
      </div>
    </section>

    <section class="lotax-card p-5 md:p-7">
      <h2 class="lotax-section-title mb-5">Сотрудники ЛК</h2>
      <div v-if="!orgs.staff.length" class="lotax-caption py-6 text-center">
        Сотрудников пока нет
      </div>
      <div v-else class="flex flex-col gap-3">
        <div
          v-for="member in orgs.staff"
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
              {{ adminStatusLabel[member.status] }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <a-modal
      v-model:open="parkOpen"
      :title="editingPark ? 'Редактировать парк' : 'Добавить парк'"
      ok-text="Сохранить"
      cancel-text="Отмена"
      centered
      :width="520"
      :confirm-loading="parkSaving"
      @ok="submitPark"
    >
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Название" required>
          <a-input v-model:value="parkForm.name" size="large" />
        </a-form-item>
        <a-form-item label="Юридическое название">
          <a-input v-model:value="parkForm.legal_name" size="large" />
        </a-form-item>
        <a-form-item label="ID парка Яндекс">
          <a-input v-model:value="parkForm.yandex_park_id" size="large" />
        </a-form-item>
        <a-form-item label="ID клиента Яндекс">
          <a-input v-model:value="parkForm.yandex_client_id" size="large" />
        </a-form-item>
        <a-form-item label="API-ключ Яндекс">
          <a-input-password
            v-model:value="parkForm.yandex_api_key"
            size="large"
            :placeholder="editingPark ? 'Пусто — не менять' : ''"
          />
        </a-form-item>
        <a-form-item label="Подписка парка">
          <a-switch v-model:checked="parkForm.subscription_active" />
        </a-form-item>
        <a-form-item v-if="editingPark" label="Парк активен">
          <a-switch v-model:checked="parkForm.is_active" />
        </a-form-item>
        <a-form-item label="Заметки">
          <a-textarea v-model:value="parkForm.notes" :rows="2" />
        </a-form-item>
      </a-form>
    </a-modal>

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
        <a-form-item label="Эл. почта" required>
          <a-input v-model:value="directorForm.email" size="large" type="email" />
        </a-form-item>
        <a-form-item label="Пароль" required>
          <a-input-password
            v-model:value="directorForm.password"
            size="large"
            placeholder="Минимум 8 символов"
          />
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
