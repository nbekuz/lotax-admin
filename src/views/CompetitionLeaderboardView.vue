<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import { LeftOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { adminCompetitionsApi } from '@/api/adminCompetitions'
import { competitionCriteriaLabel, extractErrorMessage } from '@/utils/labels'
import type { CompetitionLeaderboardItem, CompetitionLeaderboardResponse } from '@/types/api'

const route = useRoute()
const router = useRouter()

const competitionId = computed(() => route.params.id as string)
const loading = ref(false)
const board = ref<CompetitionLeaderboardResponse | null>(null)

const columns: TableColumnsType<CompetitionLeaderboardItem> = [
  { title: 'Место', key: 'rank', width: 90 },
  { title: 'Водитель', key: 'driver', dataIndex: 'display_name' },
  { title: 'Результат', key: 'score', width: 140, align: 'right' },
]

async function load() {
  loading.value = true
  try {
    const { data } = await adminCompetitionsApi.leaderboard(competitionId.value)
    board.value = data
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loading.value = false
  }
}

watch(competitionId, load)
onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div>
      <button
        type="button"
        class="lotax-btn-secondary mb-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[14px]"
        @click="router.push({ name: 'competitions' })"
      >
        <LeftOutlined />
        Назад к соревнованиям
      </button>
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 class="lotax-page-title">Лидерборд</h1>
          <p v-if="board" class="lotax-caption mt-1">
            Критерий: {{ competitionCriteriaLabel[board.criteria] }}
          </p>
        </div>
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16"><a-spin size="large" /></div>
    <div v-else-if="!board?.items?.length" class="lotax-card p-8 text-center lotax-caption">
      Участников пока нет
    </div>
    <div v-else class="lotax-card !p-0">
      <a-table
        row-key="driver_id"
        :columns="columns"
        :data-source="board.items"
        :pagination="false"
        :locale="{ emptyText: 'Участников пока нет' }"
        :custom-row="(record: CompetitionLeaderboardItem) => ({
          class: record.is_me ? 'bg-brand-soft' : '',
        })"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'rank'">
            <span class="font-semibold tabular-nums">
              #{{ (record as CompetitionLeaderboardItem).rank }}
            </span>
          </template>
          <template v-else-if="column.key === 'driver'">
            <span class="font-medium text-ink">
              {{ (record as CompetitionLeaderboardItem).display_name || (record as CompetitionLeaderboardItem).driver_id }}
              <span v-if="(record as CompetitionLeaderboardItem).is_me" class="ml-1 text-[12px] text-brand">(вы)</span>
            </span>
          </template>
          <template v-else-if="column.key === 'score'">
            <span class="font-semibold tabular-nums">
              {{ (record as CompetitionLeaderboardItem).score }}
            </span>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>
