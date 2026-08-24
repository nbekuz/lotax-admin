<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { adminLeaderboardSettingsApi } from '@/api/adminMultiparkSettings'
import ScopeFields, { type ScopeFieldsValue } from '@/components/ScopeFields.vue'
import { useAuthStore } from '@/stores/auth'
import { extractErrorMessage } from '@/utils/labels'
import { validateScopeFields } from '@/utils/scope'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)

const scope = ref<ScopeFieldsValue>({
  scope_type: 'all',
  park_group_id: null,
  park_ids: [],
})
const showParkName = ref(false)

const canEdit = computed(() => auth.canManageLeaderboardSettings)

async function load() {
  loading.value = true
  try {
    const { data } = await adminLeaderboardSettingsApi.get()
    scope.value = {
      scope_type: data.scope.scope_type,
      park_group_id: data.scope.park_group_id ?? null,
      park_ids: data.scope.park_ids ?? [],
    }
    showParkName.value = Boolean(data.show_park_name)
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loading.value = false
  }
}

async function save() {
  const error = validateScopeFields(scope.value, { requireSpecificParks: true })
  if (error) {
    message.warning(error)
    return
  }
  saving.value = true
  try {
    await adminLeaderboardSettingsApi.update({
      scope_type: scope.value.scope_type,
      park_group_id:
        scope.value.scope_type === 'group' ? scope.value.park_group_id : null,
      park_ids:
        scope.value.scope_type === 'specific'
          ? scope.value.park_ids ?? []
          : undefined,
      points_type: 'park',
      show_park_name: showParkName.value,
    })
    message.success('Настройки ТОП-5 сохранены')
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="lotax-page-title">ТОП-5</h1>
        <p class="lotax-caption mt-1">Охват рейтинга организации</p>
      </div>
      <a-button class="lotax-btn-secondary" :loading="loading" @click="load">
        <template #icon><ReloadOutlined /></template>
        Обновить
      </a-button>
    </div>

    <div v-if="loading" class="flex justify-center py-16"><a-spin size="large" /></div>
    <section v-else class="lotax-card p-5 md:p-7">
      <p class="mb-5 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-ink-muted">
        Метрика всегда <strong class="font-medium text-ink">поездки</strong>
        за день / неделю / месяц. Баллы в рейтинге не используются.
      </p>
      <a-form layout="vertical">
        <ScopeFields v-model="scope" :disabled="!canEdit" />
        <a-form-item label="Показывать названия парков">
          <div class="flex items-center gap-2">
            <a-switch
              v-model:checked="showParkName"
              :disabled="!canEdit"
            />
            <span class="text-[13px] text-ink-muted">
              {{
                showParkName
                  ? 'В ТОП-5 у водителя виден парк'
                  : 'Названия парков скрыты'
              }}
            </span>
          </div>
        </a-form-item>
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
    </section>
  </div>
</template>
