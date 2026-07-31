<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, h } from 'vue'
import {
  BankOutlined,
  CarOutlined,
  CheckOutlined,
  CloudSyncOutlined,
  EyeOutlined,
  SettingOutlined,
  TeamOutlined,
  WalletOutlined,
  EditOutlined,
} from '@ant-design/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { adminStatusLabel, adminStatusTone, roleLabel } from '@/utils/labels'
import InfoField from '@/components/InfoField.vue'

const auth = useAuthStore()

const userInitial = computed(() =>
  (auth.admin?.first_name?.[0] || auth.admin?.email?.[0] || 'A').toUpperCase(),
)

const permissions = computed(() => {
  const items: { key: string; label: string; icon: () => ReturnType<typeof h> }[] = []

  if (auth.isSuperAdmin) {
    items.push({
      key: 'parks',
      label: 'Управление таксопарками и подписками',
      icon: () => h(BankOutlined),
    })
    items.push({
      key: 'settings',
      label: 'Глобальные настройки платформы',
      icon: () => h(SettingOutlined),
    })
  }
  if (auth.canViewPdn) {
    items.push({
      key: 'pdn',
      label: 'Просмотр расшифрованных ПДн',
      icon: () => h(EyeOutlined),
    })
  }
  if (auth.canEditBalance) {
    items.push({
      key: 'balance',
      label: 'Изменение баланса',
      icon: () => h(WalletOutlined),
    })
  }
  if (auth.canEditStatus) {
    items.push({
      key: 'status',
      label: 'Изменение статуса водителя',
      icon: () => h(EditOutlined),
    })
  }
  if (auth.canSync) {
    items.push({
      key: 'sync',
      label: 'Синхронизация водителей и поездок',
      icon: () => h(CloudSyncOutlined),
    })
  }
  if (auth.canManageStaff) {
    items.push({
      key: 'staff',
      label: 'Управление сотрудниками',
      icon: () => h(TeamOutlined),
    })
  }
  if (auth.isParkAdmin) {
    items.push({
      key: 'drivers',
      label: 'Просмотр списка водителей',
      icon: () => h(CarOutlined),
    })
  }

  return items
})
</script>

<template>
  <div v-if="auth.admin" class="mx-auto flex w-full max-w-3xl flex-col gap-4 md:gap-6">
    <div>
      <h1 class="lotax-page-title">Профиль</h1>
      <p class="lotax-caption mt-1">Данные администратора и права роли</p>
    </div>

    <section class="lotax-card p-4 md:p-6 xl:p-7">
      <div class="mb-5 flex flex-col items-center gap-3 text-center md:mb-6 md:flex-row md:items-center md:gap-4 md:text-left">
        <div
          class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFB000] via-brand to-[#E67E00] text-xl font-semibold text-white md:h-14 md:w-14 md:text-lg"
        >
          {{ userInitial }}
        </div>
        <div class="min-w-0">
          <div class="truncate text-[20px] font-semibold tracking-tight text-ink">
            {{ auth.fullName || auth.admin.email }}
          </div>
          <div class="mt-2 flex justify-center md:mt-1 md:justify-start">
            <span
              class="inline-flex items-center rounded-full bg-brand-soft px-2.5 py-1 text-[13px] font-medium text-brand ring-1 ring-inset ring-orange-200"
            >
              {{ roleLabel[auth.admin.role] }}
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <InfoField label="Эл. почта" :value="auth.admin.email" />
        <InfoField label="Имя" :value="auth.admin.first_name" />
        <InfoField label="Фамилия" :value="auth.admin.last_name" />
        <InfoField label="Статус">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
            :class="adminStatusTone[auth.admin.status]"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="{
                'bg-emerald-500': auth.admin.status === 'active',
                'bg-red-500': auth.admin.status === 'blocked',
                'bg-slate-400': auth.admin.status === 'inactive',
              }"
            />
            {{ adminStatusLabel[auth.admin.status] }}
          </span>
        </InfoField>
        <InfoField
          label="Создан"
          :value="dayjs(auth.admin.created_at).format('DD.MM.YYYY HH:mm')"
        />
      </div>
    </section>

    <section class="lotax-card p-4 md:p-6 xl:p-7">
      <div class="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 class="lotax-section-title">Права роли</h2>
          <p class="lotax-caption mt-1">
            Доступно для роли «{{ roleLabel[auth.admin.role] }}»
          </p>
        </div>
        <span
          class="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[12px] font-medium tabular-nums text-ink-muted ring-1 ring-inset ring-line"
        >
          {{ permissions.length }}
        </span>
      </div>

      <div
        v-if="permissions.length"
        class="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
      >
        <div
          v-for="item in permissions"
          :key="item.key"
          class="group flex items-start gap-3 rounded-2xl border border-line bg-surface/70 px-3.5 py-3 transition-colors duration-fast md:hover:border-orange-200 md:hover:bg-brand-soft/40"
        >
          <span
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-brand ring-1 ring-inset ring-orange-100"
          >
            <component :is="item.icon" />
          </span>
          <div class="min-w-0 flex-1 pt-0.5">
            <p class="text-[14px] font-medium leading-snug text-ink md:text-[15px]">
              {{ item.label }}
            </p>
          </div>
          <span
            class="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] text-emerald-600 ring-1 ring-inset ring-emerald-200"
          >
            <CheckOutlined />
          </span>
        </div>
      </div>

      <div
        v-else
        class="rounded-2xl border border-dashed border-line bg-surface px-4 py-10 text-center"
      >
        <p class="text-[14px] font-medium text-ink">Нет специальных прав</p>
        <p class="lotax-caption mt-1">Для этой роли доступ ограничен</p>
      </div>
    </section>
  </div>
</template>
