<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import dayjs from 'dayjs'
import { LeftOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { adminTasksApi } from '@/api/adminTasks'
import { extractErrorMessage } from '@/utils/labels'
import type { TaskProgressParticipant, TaskProgressResponse } from '@/types/api'

const route = useRoute()
const router = useRouter()

const taskId = computed(() => route.params.id as string)
const loading = ref(false)
const progress = ref<TaskProgressResponse | null>(null)

const columns: TableColumnsType<TaskProgressParticipant> = [
  { title: 'Водитель', key: 'driver', dataIndex: 'driver_display_name' },
  { title: 'Прогресс', key: 'progress', width: 220 },
  { title: 'Статус', key: 'status', width: 140 },
  { title: 'Присоединился', key: 'joined_at', width: 170 },
  { title: 'Выполнено', key: 'completed_at', width: 170 },
]

async function load() {
  loading.value = true
  try {
    const { data } = await adminTasksApi.progress(taskId.value)
    progress.value = data
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loading.value = false
  }
}

watch(taskId, load)
onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div>
      <button type="button" class="lotax-btn-secondary mb-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[14px]" @click="router.push({ name: 'tasks' })">
        <LeftOutlined />
        Назад к заданиям
      </button>
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 class="lotax-page-title">Прогресс участников</h1>
          <p v-if="progress" class="lotax-caption mt-1">
            Цель: {{ progress.target_value }} · участников: {{ progress.participants_count }} ·
            выполнили: {{ progress.completed_count }}
          </p>
          <p class="lotax-caption mt-1">
            При автоучастии активные водители отображаются даже с прогрессом 0
          </p>
        </div>
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16"><a-spin size="large" /></div>
    <div v-else-if="!progress?.items?.length" class="lotax-card p-8 text-center lotax-caption">
      Участников пока нет
    </div>
    <div v-else class="lotax-card !p-0">
      <a-table
        row-key="driver_id"
        :columns="columns"
        :data-source="progress.items"
        :pagination="false"
        :locale="{ emptyText: 'Участников пока нет' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'driver'">
            <span class="font-medium text-ink">
              {{ (record as TaskProgressParticipant).driver_display_name || (record as TaskProgressParticipant).driver_id }}
            </span>
          </template>
          <template v-else-if="column.key === 'progress'">
            <div class="flex items-center gap-2">
              <a-progress
                :percent="Math.min(100, Math.round((record as TaskProgressParticipant).percent || 0))"
                :status="(record as TaskProgressParticipant).is_completed ? 'success' : 'active'"
                size="small"
                class="!w-32"
              />
              <span class="text-[12px] text-ink-muted tabular-nums">
                {{ (record as TaskProgressParticipant).progress }}/{{ (record as TaskProgressParticipant).target_value }}
              </span>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <span
              class="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 ring-inset"
              :class="(record as TaskProgressParticipant).is_completed
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-blue-50 text-blue-700 ring-blue-200'"
            >
              {{ (record as TaskProgressParticipant).is_completed ? 'Выполнено' : 'В процессе' }}
            </span>
          </template>
          <template v-else-if="column.key === 'joined_at'">
            <span class="text-[13px] text-ink-muted">
              {{ (record as TaskProgressParticipant).joined_at
                ? dayjs((record as TaskProgressParticipant).joined_at).format('DD.MM.YYYY HH:mm')
                : '—' }}
            </span>
          </template>
          <template v-else-if="column.key === 'completed_at'">
            <span class="text-[13px] text-ink-muted">
              {{ (record as TaskProgressParticipant).completed_at
                ? dayjs((record as TaskProgressParticipant).completed_at).format('DD.MM.YYYY HH:mm')
                : '—' }}
            </span>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>
