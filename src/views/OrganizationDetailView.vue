<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  BankOutlined,
  CarOutlined,
  DeleteOutlined,
  LeftOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import {
  extractErrorMessage,
  formatPhone,
  roleLabel,
  adminStatusLabel,
} from '@/utils/labels'
import InfoField from '@/components/InfoField.vue'
import CopyableId from '@/components/CopyableId.vue'
import KpiCard from '@/components/KpiCard.vue'
import type { ParkResponse } from '@/types/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
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
  phone: '',
  contact_person: '',
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
      editForm.phone = orgs.current.phone || ''
      editForm.contact_person = orgs.current.contact_person || ''
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
      phone: editForm.phone.trim() || null,
      contact_person: editForm.contact_person.trim() || null,
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
  const isNewAccount = Boolean(directorForm.password.trim())
  if (isNewAccount && directorForm.password.length < 8) {
    message.warning('Пароль нового директора: минимум 8 символов')
    return
  }
  if (isNewAccount && (!directorForm.first_name.trim() || !directorForm.last_name.trim())) {
    message.warning('Для нового директора укажите имя и фамилию')
    return
  }
  directorSaving.value = true
  try {
    await orgs.createDirector(orgId.value, {
      email: directorForm.email.trim(),
      password: isNewAccount ? directorForm.password : null,
      first_name: directorForm.first_name.trim() || undefined,
      last_name: directorForm.last_name.trim() || undefined,
    })
    message.success(
      isNewAccount
        ? 'Директор создан и привязан к организации'
        : 'Существующий директор привязан к организации',
    )
    directorOpen.value = false
    directorForm.email = ''
    directorForm.password = ''
    directorForm.first_name = ''
    directorForm.last_name = ''
    await orgs.fetchStaff(orgId.value)
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось назначить директора'))
  } finally {
    directorSaving.value = false
  }
}

function confirmDeleteOrg() {
  if (!orgs.current) return
  Modal.confirm({
    title: 'Удалить организацию?',
    content: `«${orgs.current.name}» будет деактивирована. Это действие доступно только супер-админу.`,
    okText: 'Удалить',
    cancelText: 'Отмена',
    okButtonProps: { danger: true },
    centered: true,
    async onOk() {
      try {
        await orgs.deleteOrganization(orgId.value)
        message.success('Организация удалена')
        router.push('/organizations')
      } catch (e) {
        message.error(extractErrorMessage(e, 'Не удалось удалить организацию'))
      }
    },
  })
}

function confirmDeletePark(park: ParkResponse) {
  Modal.confirm({
    title: 'Удалить парк?',
    content: `«${park.name}» будет деактивирован.`,
    okText: 'Удалить',
    cancelText: 'Отмена',
    okButtonProps: { danger: true },
    centered: true,
    async onOk() {
      try {
        await orgs.deletePark(orgId.value, park.id)
        if (editingPark.value?.id === park.id) {
          parkOpen.value = false
          editingPark.value = null
        }
        message.success('Парк удалён')
      } catch (e) {
        message.error(extractErrorMessage(e, 'Не удалось удалить парк'))
      }
    },
  })
}

watch(orgId, load)
onMounted(load)
</script>

<template>
  <div v-if="orgs.current" class="flex flex-col gap-3">
    <div class="lotax-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <button
          type="button"
          class="driver-back mb-2"
          @click="router.push('/organizations')"
        >
          <LeftOutlined />
          К списку организаций
        </button>
        <h1 class="lotax-page-title">{{ orgs.current.name }}</h1>
        <div class="mt-2 flex flex-wrap gap-2">
          <span
            class="lotax-badge"
            :class="
              orgs.current.subscription_active
                ? 'lotax-badge--success'
                : 'lotax-badge--danger'
            "
          >
            {{
              orgs.current.subscription_active
                ? 'Подписка активна'
                : 'Подписка отключена'
            }}
          </span>
          <span
            class="lotax-badge"
            :class="orgs.current.is_active ? 'lotax-badge--info' : 'lotax-badge--muted'"
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
        <a-button
          v-if="auth.canDeleteOrganizations"
          danger
          class="lotax-btn-danger"
          @click="confirmDeleteOrg"
        >
          <template #icon><DeleteOutlined /></template>
          Удалить
        </a-button>
      </div>
    </div>

    <section class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <KpiCard
        title="Парки"
        :value="orgs.current.parks_count ?? orgs.parksTotal ?? 0"
        hint="В организации"
        tone="orange"
      >
        <template #icon><BankOutlined /></template>
      </KpiCard>
      <KpiCard
        title="Водители"
        :value="orgs.current.drivers_count ?? 0"
        hint="Все парки"
        tone="blue"
      >
        <template #icon><TeamOutlined /></template>
      </KpiCard>
      <KpiCard
        title="Поездки"
        :value="orgs.current.completed_orders_count ?? 0"
        hint="Завершённые заказы"
        tone="green"
      >
        <template #icon><CarOutlined /></template>
      </KpiCard>
    </section>

    <section class="lotax-card p-4 md:p-5">
      <h2 class="lotax-section-title mb-4">Данные организации</h2>
      <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoField
          label="Создана"
          :value="dayjs(orgs.current.created_at).format('DD.MM.YYYY HH:mm')"
        />
        <InfoField
          label="Обновлена"
          :value="dayjs(orgs.current.updated_at).format('DD.MM.YYYY HH:mm')"
        />
        <InfoField
          label="Телефон"
          :value="formatPhone(orgs.current.phone)"
        />
        <InfoField
          label="Контактное лицо"
          :value="orgs.current.contact_person || '—'"
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
          <a-form-item label="Телефон">
            <a-input
              v-model:value="editForm.phone"
              size="large"
              placeholder="+79001234567"
            />
          </a-form-item>
          <a-form-item label="Контактное лицо">
            <a-input
              v-model:value="editForm.contact_person"
              size="large"
              placeholder="Иван Петров"
            />
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

    <section class="lotax-card p-4 md:p-5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="lotax-section-title">Парки организации</h2>
        <a-button class="lotax-btn-primary" type="primary" @click="openCreatePark">
          <template #icon><PlusOutlined /></template>
          Добавить парк
        </a-button>
      </div>
      <div v-if="!orgs.parks.length" class="lotax-caption py-6 text-center">
        Парков пока нет — добавьте первый
      </div>
      <div v-else class="flex flex-col gap-2">
        <article
          v-for="park in orgs.parks"
          :key="park.id"
          class="park-row"
        >
          <div class="park-row__main" @click="openEditPark(park)">
            <span class="park-row__name">{{ park.name }}</span>
            <span class="park-row__id">
              {{ park.yandex_park_id || 'Без Yandex ID' }}
            </span>
          </div>
          <div class="park-row__side">
            <span
              class="lotax-badge"
              :class="park.subscription_active ? 'lotax-badge--success' : 'lotax-badge--danger'"
            >
              {{ park.subscription_active ? 'Подписка' : 'Нет подписки' }}
            </span>
            <span
              class="lotax-badge"
              :class="park.has_yandex_api_key ? 'lotax-badge--info' : 'lotax-badge--muted'"
            >
              {{ park.has_yandex_api_key ? 'API-ключ задан' : 'Нет API-ключа' }}
            </span>
            <a-button size="small" class="lotax-btn-secondary" @click="openEditPark(park)">
              Изменить
            </a-button>
            <a-button
              v-if="auth.canDeleteOrganizations"
              size="small"
              danger
              @click="confirmDeletePark(park)"
            >
              Удалить
            </a-button>
          </div>
        </article>
      </div>
    </section>

    <section class="lotax-card p-4 md:p-5">
      <h2 class="lotax-section-title mb-4">Сотрудники ЛК</h2>
      <div v-if="!orgs.staff.length" class="lotax-caption py-6 text-center">
        Сотрудников пока нет
      </div>
      <div v-else class="flex flex-col gap-2">
        <article v-for="member in orgs.staff" :key="member.id" class="staff-row">
          <div class="staff-row__main">
            <span class="staff-row__name">{{ member.first_name }} {{ member.last_name }}</span>
            <span class="staff-row__email">{{ member.email }}</span>
          </div>
          <div class="staff-row__side">
            <span
              class="lotax-badge"
              :class="member.role === 'director' ? 'lotax-badge--warning' : 'lotax-badge--info'"
            >
              {{ roleLabel[member.role] }}
            </span>
            <span
              class="lotax-badge"
              :class="
                member.status === 'active'
                  ? 'lotax-badge--success'
                  : member.status === 'blocked'
                    ? 'lotax-badge--danger'
                    : 'lotax-badge--muted'
              "
            >
              {{ adminStatusLabel[member.status] }}
            </span>
          </div>
        </article>
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
      ok-text="Назначить"
      cancel-text="Отмена"
      centered
      :width="520"
      :confirm-loading="directorSaving"
      @ok="submitDirector"
    >
      <p class="mb-4 text-[13px] text-ink-muted">
        Новый аккаунт — укажите пароль (мин. 8). Существующий директор другой org —
        достаточно email, пароль не нужен.
      </p>
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Эл. почта" required>
          <a-input v-model:value="directorForm.email" size="large" type="email" />
        </a-form-item>
        <a-form-item label="Пароль (для нового аккаунта)">
          <a-input-password
            v-model:value="directorForm.password"
            size="large"
            placeholder="Оставьте пустым для существующего директора"
          />
        </a-form-item>
        <div class="grid grid-cols-1 md:grid-cols-2 md:gap-3">
          <a-form-item label="Имя">
            <a-input v-model:value="directorForm.first_name" size="large" />
          </a-form-item>
          <a-form-item label="Фамилия">
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
  border: 1px solid var(--lotax-border);
  background: var(--lotax-card);
  color: var(--lotax-text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.park-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--lotax-border);
  border-radius: 14px;
  background: transparent;
}

.park-row__main {
  display: flex;
  min-width: 0;
  flex: 0 1 280px;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  box-shadow: none;
  text-align: left;
  cursor: pointer;
}

.park-row__name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--lotax-text);
}

.park-row__id {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.3;
  color: var(--lotax-text-tertiary);
}

.park-row__side {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

@media (min-width: 768px) {
  .park-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .park-row__side {
    flex-wrap: nowrap;
  }
}

.staff-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--lotax-border);
  border-radius: 14px;
  background: transparent;
}

.staff-row__main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.staff-row__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--lotax-text);
}

.staff-row__email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1.3;
  color: var(--lotax-text-secondary);
}

.staff-row__side {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

@media (min-width: 768px) {
  .staff-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .staff-row__side {
    flex-shrink: 0;
    flex-wrap: nowrap;
    margin-left: auto;
  }
}
</style>
