<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { TableColumnsType } from 'ant-design-vue'
import {
  GiftOutlined,
  ReloadOutlined,
  RiseOutlined,
  StarOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import { adminReferralApi } from '@/api/adminReferral'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage } from '@/utils/labels'
import KpiCard from '@/components/KpiCard.vue'
import type {
  PointsType,
  ReferralStatsAdminResponse,
  ReferralTopReferrerItem,
} from '@/types/api'

const auth = useAuthStore()
const org = useOrgStore()

const loadingSettings = ref(false)
const loadingStats = ref(false)
const saving = ref(false)
const stats = ref<ReferralStatsAdminResponse | null>(null)

const form = reactive({
  is_active: true,
  rides_required: 50,
  referrer_bonus: 100,
  referee_bonus: 50,
  bonus_points_type: 'park' as PointsType,
  max_referrals: 0,
  share_text_template: 'Присоединяйся! Код {CODE}. Ссылка: {LINK}',
})

const parkId = computed(() => org.selectedParkId)
const canEdit = computed(() => auth.canManageReferral)

const columns: TableColumnsType<ReferralTopReferrerItem> = [
  { title: 'Водитель', key: 'driver', dataIndex: 'display_name' },
  { title: 'Приглашено', key: 'total_referrals', width: 130, align: 'right' },
  { title: 'Активировано', key: 'activated_referrals', width: 140, align: 'right' },
  { title: 'Баллов начислено', key: 'points_earned', width: 160, align: 'right' },
]

async function loadSettings() {
  if (!parkId.value) return
  loadingSettings.value = true
  try {
    const { data } = await adminReferralApi.getSettings({ park_id: parkId.value })
    form.is_active = data.is_active
    form.rides_required = data.rides_required
    form.referrer_bonus = data.referrer_bonus
    form.referee_bonus = data.referee_bonus
    form.bonus_points_type = data.bonus_points_type
    form.max_referrals = data.max_referrals
    form.share_text_template =
      data.share_text_template || 'Присоединяйся! Код {CODE}. Ссылка: {LINK}'
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loadingSettings.value = false
  }
}

async function loadStats() {
  if (!parkId.value) return
  loadingStats.value = true
  try {
    const { data } = await adminReferralApi.getStats({ park_id: parkId.value })
    stats.value = data
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loadingStats.value = false
  }
}

async function loadAll() {
  if (!parkId.value) {
    stats.value = null
    return
  }
  await Promise.all([loadSettings(), loadStats()])
}

async function save() {
  if (!parkId.value) return
  saving.value = true
  try {
    await adminReferralApi.updateSettings(
      { park_id: parkId.value },
      {
        is_active: form.is_active,
        rides_required: form.rides_required,
        referrer_bonus: form.referrer_bonus,
        referee_bonus: form.referee_bonus,
        bonus_points_type: form.bonus_points_type,
        max_referrals: form.max_referrals,
        share_text_template: form.share_text_template,
      },
    )
    message.success('Настройки реферальной программы сохранены')
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

watch(parkId, loadAll)
onMounted(async () => {
  if (!org.parks.length) await org.fetchParks()
  await loadAll()
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="lotax-page-title">Реферальная программа</h1>
        <p class="lotax-caption mt-1">Настройки и статистика приглашений водителей</p>
      </div>
      <a-button class="lotax-btn-secondary" @click="loadAll">
        <template #icon><ReloadOutlined /></template>
        Обновить
      </a-button>
    </div>

    <div v-if="!parkId" class="lotax-card p-8 text-center">Выберите парк в шапке</div>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Всего приглашений"
          :value="stats?.total_referrals ?? (loadingStats ? '…' : 0)"
          tone="blue"
        >
          <template #icon><TeamOutlined /></template>
        </KpiCard>
        <KpiCard
          title="Активировано"
          :value="stats?.activated_referrals ?? (loadingStats ? '…' : 0)"
          tone="green"
        >
          <template #icon><RiseOutlined /></template>
        </KpiCard>
        <KpiCard
          title="В ожидании"
          :value="stats?.pending_referrals ?? (loadingStats ? '…' : 0)"
          tone="orange"
        >
          <template #icon><StarOutlined /></template>
        </KpiCard>
        <KpiCard
          title="Баллов выдано"
          :value="
            loadingStats
              ? '…'
              : (stats?.points_awarded ??
                (stats?.total_referrer_bonus_paid ?? 0) +
                  (stats?.total_referee_bonus_paid ?? 0))
          "
          tone="orange"
        >
          <template #icon><GiftOutlined /></template>
        </KpiCard>
      </div>

      <div class="lotax-card overflow-hidden p-0">
        <div class="flex items-center gap-2 border-b border-line px-5 py-4 md:px-6">
          <GiftOutlined class="text-brand" />
          <h2 class="lotax-section-title !mb-0">Настройки программы</h2>
        </div>

        <div v-if="loadingSettings" class="flex justify-center py-10"><a-spin /></div>
        <div v-else class="px-5 py-5 md:px-6">
          <div
            class="mb-5 flex items-center justify-between gap-4 rounded-xl bg-surface px-4 py-3"
          >
            <div>
              <div class="text-[14px] font-medium text-ink">Программа активна</div>
              <div class="text-[12px] text-ink-muted">
                Новые приглашения {{ form.is_active ? 'принимаются' : 'отключены' }}
              </div>
            </div>
            <a-switch v-model:checked="form.is_active" :disabled="!canEdit" />
          </div>

          <a-form layout="vertical" class="referral-settings-form">
            <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <a-form-item label="Поездок для активации">
                <a-input-number
                  v-model:value="form.rides_required"
                  class="!w-full"
                  :min="1"
                  :disabled="!canEdit"
                />
              </a-form-item>
              <a-form-item label="Лимит приглашений">
                <a-input-number
                  v-model:value="form.max_referrals"
                  class="!w-full"
                  :min="0"
                  :disabled="!canEdit"
                  placeholder="0 — без лимита"
                />
              </a-form-item>
              <a-form-item label="Бонус пригласившему">
                <a-input-number
                  v-model:value="form.referrer_bonus"
                  class="!w-full"
                  :min="0"
                  :disabled="!canEdit"
                  addon-after="б."
                />
              </a-form-item>
              <a-form-item label="Бонус приглашённому">
                <a-input-number
                  v-model:value="form.referee_bonus"
                  class="!w-full"
                  :min="0"
                  :disabled="!canEdit"
                  addon-after="б."
                />
              </a-form-item>
              <a-form-item label="Тип баллов бонуса" class="sm:col-span-2 sm:!max-w-xs">
                <a-select
                  v-model:value="form.bonus_points_type"
                  :disabled="!canEdit"
                  :options="[
                    { value: 'system', label: 'Системные' },
                    { value: 'park', label: 'Парковые' },
                  ]"
                />
              </a-form-item>
              <a-form-item label="Шаблон текста для приглашения" class="sm:col-span-2">
                <a-textarea
                  v-model:value="form.share_text_template"
                  :rows="2"
                  :auto-size="{ minRows: 2, maxRows: 4 }"
                  :disabled="!canEdit"
                />
                <p class="lotax-caption mt-1">Переменные: {CODE}, {LINK}</p>
              </a-form-item>
            </div>
            <a-button
              v-if="canEdit"
              type="primary"
              class="lotax-btn-primary"
              :loading="saving"
              @click="save"
            >
              Сохранить
            </a-button>
          </a-form>
        </div>
      </div>

      <div class="lotax-card !p-0">
        <div class="border-b border-line p-4">
          <h2 class="lotax-section-title">Топ рефереров</h2>
        </div>
        <div v-if="loadingStats" class="flex justify-center py-10"><a-spin /></div>
        <a-table
          v-else
          row-key="driver_id"
          :columns="columns"
          :data-source="stats?.top_referrers || []"
          :pagination="false"
          :locale="{ emptyText: 'Пока нет рефереров' }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'driver'">
              <span class="font-medium text-ink">
                {{ (record as ReferralTopReferrerItem).display_name || (record as ReferralTopReferrerItem).driver_id }}
              </span>
            </template>
            <template v-else-if="column.key === 'total_referrals'">
              {{ (record as ReferralTopReferrerItem).total_referrals }}
            </template>
            <template v-else-if="column.key === 'activated_referrals'">
              {{ (record as ReferralTopReferrerItem).activated_referrals }}
            </template>
            <template v-else-if="column.key === 'points_earned'">
              {{ (record as ReferralTopReferrerItem).points_earned ?? '—' }}
            </template>
          </template>
        </a-table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.referral-settings-form :deep(.ant-form-item) {
  margin-bottom: 14px;
}

.referral-settings-form :deep(.ant-form-item-label) {
  padding-bottom: 2px;
}

.referral-settings-form :deep(.ant-form-item-label > label) {
  font-size: 13px;
  color: var(--lotax-ink-muted, #6b7280);
}
</style>
