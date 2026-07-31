<script setup lang="ts">
import dayjs from 'dayjs'
import { useAuthStore } from '@/stores/auth'
import { roleLabel } from '@/utils/labels'

const auth = useAuthStore()
</script>

<template>
  <div v-if="auth.admin" class="mx-auto max-w-xl space-y-4">
    <h2 class="text-xl font-semibold">Профиль администратора</h2>
    <a-card class="!rounded-2xl">
      <a-descriptions :column="1" bordered>
        <a-descriptions-item label="Email">
          {{ auth.admin.email }}
        </a-descriptions-item>
        <a-descriptions-item label="Имя">
          {{ auth.admin.first_name }}
        </a-descriptions-item>
        <a-descriptions-item label="Фамилия">
          {{ auth.admin.last_name }}
        </a-descriptions-item>
        <a-descriptions-item label="Роль">
          <a-tag color="blue">{{ roleLabel[auth.admin.role] }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="Статус">
          {{ auth.admin.status }}
        </a-descriptions-item>
        <a-descriptions-item label="Создан">
          {{ dayjs(auth.admin.created_at).format('DD.MM.YYYY HH:mm') }}
        </a-descriptions-item>
      </a-descriptions>
    </a-card>

    <a-card title="Права роли" class="!rounded-2xl">
      <ul class="list-disc space-y-1 pl-5 text-sm text-neutral-600">
        <li v-if="auth.canViewPdn">Просмотр расшифрованных ПДн</li>
        <li v-if="auth.canEditBalance">Изменение баланса</li>
        <li v-if="auth.canEditStatus">Изменение статуса водителя</li>
        <li v-if="auth.canSync">Синхронизация водителей и поездок</li>
        <li>Просмотр списка водителей</li>
      </ul>
    </a-card>
  </div>
</template>
