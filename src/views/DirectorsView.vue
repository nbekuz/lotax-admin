<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { superAdminApi } from '@/api/superAdmin'
import { extractErrorMessage } from '@/utils/labels'
import type { AdminListItem } from '@/types/api'

const loading = ref(false)
const items = ref<AdminListItem[]>([])
const total = ref(0)

const pagination = reactive({
  current: 1,
  pageSize: 20,
})

async function load() {
  loading.value = true
  try {
    const { data } = await superAdminApi.listDirectors({
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

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="lotax-page-title">Директоры платформы</h1>
        <p class="lotax-caption mt-1">
          Активные директора и их организации
        </p>
      </div>
      <a-button class="lotax-btn-secondary" @click="load">
        <template #icon><ReloadOutlined /></template>
        Обновить
      </a-button>
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
        <div class="text-[13px] text-ink-muted">
          Org:
          <span class="font-mono text-ink">
            {{
              (item.organization_ids || [])
                .map((id) => id.slice(0, 8))
                .join(', ') || item.organization_id?.slice(0, 8) || '—'
            }}
          </span>
        </div>
      </article>

      <div v-if="!items.length" class="lotax-card py-16 text-center">
        <p class="text-[15px] font-medium text-ink">Директоров пока нет</p>
      </div>

      <div class="flex justify-center py-2">
        <a-pagination
          :current="pagination.current"
          :page-size="pagination.pageSize"
          :total="total"
          show-size-changer
          @change="onPageChange"
        />
      </div>
    </div>
  </div>
</template>
