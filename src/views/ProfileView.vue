<script setup lang="ts">
import dayjs from 'dayjs'
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { roleLabel } from '@/utils/labels'
import InfoField from '@/components/InfoField.vue'

const auth = useAuthStore()

const userInitial = computed(() =>
  (auth.admin?.first_name?.[0] || auth.admin?.email?.[0] || 'A').toUpperCase(),
)
</script>

<template>
  <div v-if="auth.admin" class="mx-auto flex w-full max-w-3xl flex-col gap-4 md:gap-6">
    <div>
      <h1 class="lotax-page-title">Профиль</h1>
      <p class="lotax-caption mt-1">Данные администратора и права роли</p>
    </div>

    <section class="lotax-card p-4 md:p-6 xl:p-7">
      <!-- Mobile: stacked identity -->
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
        <InfoField label="Email" :value="auth.admin.email" />
        <InfoField label="Имя" :value="auth.admin.first_name" />
        <InfoField label="Фамилия" :value="auth.admin.last_name" />
        <InfoField label="Статус" :value="auth.admin.status" />
        <InfoField
          label="Создан"
          :value="dayjs(auth.admin.created_at).format('DD.MM.YYYY HH:mm')"
        />
      </div>
    </section>

    <section class="lotax-card p-4 md:p-6 xl:p-7">
      <h2 class="lotax-section-title mb-4">Права роли</h2>
      <ul class="flex flex-col gap-2">
        <li
          v-if="auth.canViewPdn"
          class="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-[14px] text-ink md:text-[15px]"
        >
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          Просмотр расшифрованных ПДн
        </li>
        <li
          v-if="auth.canEditBalance"
          class="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-[14px] text-ink md:text-[15px]"
        >
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          Изменение баланса
        </li>
        <li
          v-if="auth.canEditStatus"
          class="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-[14px] text-ink md:text-[15px]"
        >
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          Изменение статуса водителя
        </li>
        <li
          v-if="auth.canSync"
          class="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-[14px] text-ink md:text-[15px]"
        >
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          Синхронизация водителей и поездок
        </li>
        <li
          v-if="auth.canManageStaff"
          class="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-[14px] text-ink md:text-[15px]"
        >
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          Управление сотрудниками
        </li>
        <li
          class="flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-[14px] text-ink md:text-[15px]"
        >
          <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          Просмотр списка водителей
        </li>
      </ul>
    </section>
  </div>
</template>
