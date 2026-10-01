<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage, formatPhone } from '@/utils/labels'
import InfoField from '@/components/InfoField.vue'
import CopyableId from '@/components/CopyableId.vue'
import PageHeader from '@/components/PageHeader.vue'

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

function formatCount(value: number | null | undefined) {
  return new Intl.NumberFormat('ru-RU').format(value ?? 0)
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
    <PageHeader title="Организация" subtitle="Ваша организация и парки ЛК">
      <template #actions>
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
      </template>
    </PageHeader>

    <div v-if="org.loading && !org.organization" class="flex justify-center py-20">
      <a-spin size="large" />
    </div>

    <template v-else-if="org.organization">
      <section class="lotax-card org-card">
        <div class="org-card__head">
          <div class="min-w-0">
            <h2 class="org-card__title">{{ org.organization.name }}</h2>
            <p class="org-card__legal">
              {{ org.organization.legal_name || 'Юридическое название не указано' }}
            </p>
          </div>
          <span
            class="lotax-badge"
            :class="org.organization.subscription_active ? 'lotax-badge--success' : 'lotax-badge--danger'"
          >
            {{ org.organization.subscription_active ? 'Подписка активна' : 'Подписка отключена' }}
          </span>
        </div>

        <div class="org-stats">
          <div class="org-stat">
            <span class="org-stat__label">Парков</span>
            <span class="org-stat__value">{{ org.organization.parks_count ?? org.parksTotal }}</span>
          </div>
          <div class="org-stat">
            <span class="org-stat__label">Водители</span>
            <span class="org-stat__value">{{ formatCount(org.organization.drivers_count) }}</span>
          </div>
          <div class="org-stat">
            <span class="org-stat__label">Поездки</span>
            <span class="org-stat__value">{{ formatCount(org.organization.completed_orders_count) }}</span>
          </div>
        </div>

        <div class="org-meta">
          <InfoField label="Создана" :value="dayjs(org.organization.created_at).format('DD.MM.YYYY')" />
          <InfoField label="Статус" :value="org.organization.is_active ? 'Активна' : 'Неактивна'" />
          <InfoField label="Телефон" :value="formatPhone(org.organization.phone)" />
          <InfoField label="Контактное лицо" :value="org.organization.contact_person || '—'" />
        </div>

        <CopyableId label="UUID организации" :value="org.organization.id" />
      </section>

      <section class="lotax-card org-card">
        <h2 class="lotax-section-title mb-4">Парки</h2>
        <div v-if="!org.parks.length" class="lotax-caption py-8 text-center">
          В организации пока нет парков
        </div>
        <div v-else class="flex flex-col gap-2">
          <article v-for="park in org.parks" :key="park.id" class="org-park">
            <div class="org-park__main">
              <span class="org-park__name">{{ park.name }}</span>
              <span class="org-park__id">
                {{ park.legal_name || 'Без юр. названия' }}
                · {{ park.yandex_park_id || 'нет Yandex ID' }}
              </span>
            </div>
            <div class="org-park__side">
              <span class="lotax-badge" :class="park.is_active ? 'lotax-badge--success' : 'lotax-badge--muted'">
                {{ park.is_active ? 'Активен' : 'Неактивен' }}
              </span>
              <span
                class="lotax-badge"
                :class="park.subscription_active ? 'lotax-badge--info' : 'lotax-badge--danger'"
              >
                {{ park.subscription_active ? 'Подписка' : 'Нет подписки' }}
              </span>
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

<style scoped>
.org-card {
  padding: 20px;
}

.org-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.org-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--lotax-text);
}

.org-card__legal {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--lotax-text-secondary);
}

.org-stats {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: 16px;
}

.org-stat {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--lotax-border);
  border-radius: 12px;
  background: transparent;
}

.org-stat__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--lotax-text-secondary);
}

.org-stat__value {
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--lotax-text);
}

.org-meta {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  margin-bottom: 16px;
}

.org-park {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--lotax-border);
  border-radius: 14px;
  background: transparent;
}

.org-park__main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.org-park__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 600;
  color: var(--lotax-text);
}

.org-park__id {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--lotax-text-tertiary);
}

.org-park__side {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

@media (min-width: 768px) {
  .org-card {
    padding: 22px 24px;
  }

  .org-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .org-stat {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .org-meta {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .org-park {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .org-park__side {
    flex-shrink: 0;
    margin-left: auto;
  }
}
</style>
