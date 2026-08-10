<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { orgApi } from '@/api/org'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage } from '@/utils/labels'
import type { YandexSettingsResponse } from '@/types/api'

const auth = useAuthStore()
const org = useOrgStore()
const loading = ref(false)
const saving = ref(false)
const settings = ref<YandexSettingsResponse | null>(null)

const form = reactive({
  yandex_park_id: '',
  yandex_client_id: '',
  yandex_api_key: '',
})

const parkId = computed(() => org.selectedParkId)

async function load() {
  if (!parkId.value) {
    settings.value = null
    return
  }
  loading.value = true
  try {
    if (!org.parks.length) await org.fetchParks()
    const { data } = await orgApi.getYandexSettings(parkId.value)
    settings.value = data
    form.yandex_park_id = data.yandex_park_id || ''
    form.yandex_client_id = data.yandex_client_id || ''
    form.yandex_api_key = ''
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!parkId.value) {
    message.warning('Выберите парк')
    return
  }
  saving.value = true
  try {
    const { data } = await orgApi.updateYandexSettings(parkId.value, {
      yandex_park_id: form.yandex_park_id.trim() || null,
      yandex_client_id: form.yandex_client_id.trim() || null,
      yandex_api_key: form.yandex_api_key.trim() || null,
    })
    settings.value = data
    form.yandex_api_key = ''
    message.success('Настройки Yandex сохранены')
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

watch(parkId, load)
onMounted(async () => {
  if (!auth.canManageYandex) return
  if (!org.parks.length) await org.fetchParks()
  await load()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="lotax-page-title">Yandex Fleet</h1>
        <p class="lotax-caption mt-1">
          Ключи парка для синхронизации водителей и поездок
        </p>
      </div>
      <a-button class="lotax-btn-secondary" :loading="loading" @click="load">
        <template #icon><ReloadOutlined /></template>
        Обновить
      </a-button>
    </div>

    <div v-if="!parkId" class="lotax-card p-6 text-center">
      <p class="text-[15px] font-medium text-ink">Сначала выберите парк</p>
      <p class="lotax-caption mt-1">Используйте переключатель парка в шапке</p>
    </div>

    <section v-else class="lotax-card p-5 md:p-7">
      <div class="mb-5 flex flex-wrap gap-2">
        <span
          class="rounded-full px-2.5 py-1 text-[13px] font-medium ring-1 ring-inset"
          :class="
            settings?.has_yandex_api_key
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-slate-100 text-slate-600 ring-slate-300'
          "
        >
          {{ settings?.has_yandex_api_key ? 'API-ключ задан' : 'API-ключ не задан' }}
        </span>
        <span class="lotax-caption self-center">
          Парк: {{ org.selectedPark?.name || parkId }}
        </span>
      </div>

      <a-form layout="vertical">
        <a-form-item label="ID парка Яндекс">
          <a-input v-model:value="form.yandex_park_id" size="large" />
        </a-form-item>
        <a-form-item label="Client ID Яндекс">
          <a-input v-model:value="form.yandex_client_id" size="large" />
        </a-form-item>
        <a-form-item label="API-ключ Яндекс">
          <a-input-password
            v-model:value="form.yandex_api_key"
            size="large"
            placeholder="Оставьте пустым, чтобы не менять"
          />
        </a-form-item>
        <a-button
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
