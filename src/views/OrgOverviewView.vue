<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage } from '@/utils/labels'
import InfoField from '@/components/InfoField.vue'
import CopyableId from '@/components/CopyableId.vue'

const org = useOrgStore()

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

async function load() {
  try {
    await org.fetchMe()
    await org.fetchParks(pagination.current, pagination.pageSize)
    pagination.total = org.parksTotal
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

async function onPageChange(page: number) {
  pagination.current = page
  try {
    await org.fetchParks(page, pagination.pageSize)
    pagination.total = org.parksTotal
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="lotax-page-title">Организация</h1>
        <p class="lotax-caption mt-1">Ваша организация и парки ЛК</p>
      </div>
      <a-button class="lotax-btn-secondary" @click="load">
        <template #icon><ReloadOutlined /></template>
        Обновить
      </a-button>
    </div>

    <div v-if="org.loading && !org.organization" class="flex justify-center py-20">
      <a-spin size="large" />
    </div>

    <template v-else-if="org.organization">
      <section class="lotax-card p-5 md:p-7">
        <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="lotax-section-title">{{ org.organization.name }}</h2>
            <p class="lotax-caption mt-1">
              {{ org.organization.legal_name || 'Юридическое название не указано' }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              class="rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
              :class="
                org.organization.subscription_active
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-red-50 text-red-700 ring-red-200'
              "
            >
              {{
                org.organization.subscription_active
                  ? 'Подписка активна'
                  : 'Подписка отключена'
              }}
            </span>
          </div>
        </div>

        <div class="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoField
            label="Парков"
            :value="String(org.organization.parks_count ?? org.parksTotal)"
          />
          <InfoField
            label="Создана"
            :value="dayjs(org.organization.created_at).format('DD.MM.YYYY')"
          />
          <InfoField
            label="Статус"
            :value="org.organization.is_active ? 'Активна' : 'Неактивна'"
          />
        </div>
        <CopyableId label="UUID организации" :value="org.organization.id" />
      </section>

      <section class="lotax-card p-5 md:p-7">
        <h2 class="lotax-section-title mb-5">Парки</h2>
        <div v-if="!org.parks.length" class="lotax-caption py-8 text-center">
          В организации пока нет парков
        </div>
        <div v-else class="flex flex-col gap-3">
          <article
            v-for="park in org.parks"
            :key="park.id"
            class="rounded-xl border border-line bg-surface px-4 py-3"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <div class="truncate font-medium text-ink">{{ park.name }}</div>
                <div class="truncate text-[13px] text-ink-muted">
                  {{ park.legal_name || '—' }} ·
                  <span class="font-mono">{{ park.yandex_park_id || 'нет Yandex ID' }}</span>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  class="rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
                  :class="
                    park.is_active
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : 'bg-slate-100 text-slate-600 ring-slate-300'
                  "
                >
                  {{ park.is_active ? 'Активен' : 'Неактивен' }}
                </span>
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
              </div>
            </div>
          </article>
        </div>

        <div v-if="pagination.total > pagination.pageSize" class="mt-4 flex justify-center">
          <a-pagination
            :current="pagination.current"
            :page-size="pagination.pageSize"
            :total="pagination.total"
            :show-size-changer="false"
            @change="onPageChange"
          />
        </div>
      </section>
    </template>

    <div
      v-else
      class="lotax-card flex flex-col items-center justify-center gap-2 px-4 py-16 text-center"
    >
      <p class="text-[15px] font-medium text-ink">Организация недоступна</p>
      <p class="lotax-caption">
        {{ org.error || 'Проверьте подписку или обратитесь в поддержку LOTAX' }}
      </p>
    </div>
  </div>
</template>
