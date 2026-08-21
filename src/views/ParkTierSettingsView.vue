<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { adminParkTierSettingsApi } from '@/api/adminMultiparkSettings'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage } from '@/utils/labels'

const auth = useAuthStore()
const org = useOrgStore()

const loading = ref(false)
const saving = ref(false)

const form = reactive({
  apply_tiers: false,
  silver_rides: 50,
  gold_rides: 150,
  platinum_rides: 400,
  silver_coefficient: 1.1,
  gold_coefficient: 1.3,
  platinum_coefficient: 1.5,
  silver_min_month: 0,
  gold_min_month: 0,
  platinum_min_month: 0,
})

const parkId = computed(() => org.selectedParkId)
const canEdit = computed(() => auth.canManageTierSettings)

const coefficientOptions = Array.from({ length: 11 }, (_, i) => {
  const value = Number((1 + i * 0.1).toFixed(1))
  return { value, label: String(value) }
})

async function load() {
  if (!parkId.value) return
  loading.value = true
  try {
    const { data } = await adminParkTierSettingsApi.get(parkId.value)
    form.apply_tiers = data.apply_tiers
    form.silver_rides = data.silver.rides
    form.gold_rides = data.gold.rides
    form.platinum_rides = data.platinum.rides
    form.silver_coefficient = data.silver.coefficient
    form.gold_coefficient = data.gold.coefficient
    form.platinum_coefficient = data.platinum.coefficient
    form.silver_min_month = data.silver.min_month
    form.gold_min_month = data.gold.min_month
    form.platinum_min_month = data.platinum.min_month
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
  if (form.apply_tiers) {
    if (
      !(
        form.silver_rides < form.gold_rides &&
        form.gold_rides < form.platinum_rides
      )
    ) {
      message.warning('Поездки: серебро < золото < платина')
      return
    }
  }
  saving.value = true
  try {
    await adminParkTierSettingsApi.update(parkId.value, {
      apply_tiers: form.apply_tiers,
      ...(form.apply_tiers
        ? {
            silver_rides: form.silver_rides,
            gold_rides: form.gold_rides,
            platinum_rides: form.platinum_rides,
            silver_coefficient: form.silver_coefficient,
            gold_coefficient: form.gold_coefficient,
            platinum_coefficient: form.platinum_coefficient,
            silver_min_month: form.silver_min_month,
            gold_min_month: form.gold_min_month,
            platinum_min_month: form.platinum_min_month,
          }
        : {}),
    })
    message.success('Настройки уровней сохранены')
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}

watch(parkId, load)
onMounted(async () => {
  if (!org.parks.length) await org.fetchParks()
  await load()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="lotax-page-title">Уровни</h1>
        <p class="lotax-caption mt-1">
          Статусы парка. Порог — поездки во всех парках организации
        </p>
      </div>
      <a-button
        class="lotax-btn-secondary"
        :loading="loading"
        :disabled="!parkId"
        @click="load"
      >
        <template #icon><ReloadOutlined /></template>
        Обновить
      </a-button>
    </div>

    <div v-if="!parkId" class="lotax-card p-6 text-center">
      <p class="text-[15px] font-medium text-ink">Сначала выберите парк</p>
      <p class="lotax-caption mt-1">Используйте переключатель парка в шапке</p>
    </div>

    <div v-else-if="loading" class="flex justify-center py-16">
      <a-spin size="large" />
    </div>

    <section v-else class="lotax-card p-5 md:p-7">
      <p class="lotax-caption mb-5">
        Парк: {{ org.selectedPark?.name || parkId }}
      </p>
      <a-form layout="vertical">
        <a-form-item label="Статусы парка">
          <div class="flex items-center gap-2">
            <a-switch
              v-model:checked="form.apply_tiers"
              :disabled="!canEdit"
            />
            <span class="text-[13px] text-ink-muted">
              {{
                form.apply_tiers
                  ? 'Применять статусы'
                  : 'Не применять статусы'
              }}
            </span>
          </div>
          <p class="lotax-caption mt-1">
            Если выключено — в приложении скрывается блок уровня, коэффициент всегда ×1.0
          </p>
        </a-form-item>

        <template v-if="form.apply_tiers">
          <p class="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-ink-muted">
            Пороги считаются по поездкам во <strong class="font-medium text-ink">всех парках организации</strong>,
            не по текущему парку. Коэффициент 1.0–2.0 (шаг 0.1) умножает только парковые баллы.
            «Мин. месяц» — минимум поездок за календарный месяц для удержания уровня; 0 — не проверять.
          </p>

          <div class="mb-1 text-[14px] font-semibold text-ink">Бронза</div>
          <div class="grid grid-cols-1 gap-x-3 sm:grid-cols-3">
            <a-form-item label="Поездки">
              <a-input-number class="!w-full" :value="0" disabled />
            </a-form-item>
            <a-form-item label="Коэффициент">
              <a-input class="!w-full" value="1.0" disabled />
            </a-form-item>
            <a-form-item label="Мин. месяц">
              <a-input-number class="!w-full" :value="0" disabled />
            </a-form-item>
          </div>

          <div class="mb-1 text-[14px] font-semibold text-ink">Серебро</div>
          <div class="grid grid-cols-1 gap-x-3 sm:grid-cols-3">
            <a-form-item label="Поездки">
              <a-input-number
                v-model:value="form.silver_rides"
                class="!w-full"
                :min="1"
                :disabled="!canEdit"
              />
            </a-form-item>
            <a-form-item label="Коэффициент">
              <a-select
                v-model:value="form.silver_coefficient"
                :options="coefficientOptions"
                :disabled="!canEdit"
              />
            </a-form-item>
            <a-form-item label="Мин. месяц">
              <a-input-number
                v-model:value="form.silver_min_month"
                class="!w-full"
                :min="0"
                :disabled="!canEdit"
              />
            </a-form-item>
          </div>

          <div class="mb-1 text-[14px] font-semibold text-ink">Золото</div>
          <div class="grid grid-cols-1 gap-x-3 sm:grid-cols-3">
            <a-form-item label="Поездки">
              <a-input-number
                v-model:value="form.gold_rides"
                class="!w-full"
                :min="1"
                :disabled="!canEdit"
              />
            </a-form-item>
            <a-form-item label="Коэффициент">
              <a-select
                v-model:value="form.gold_coefficient"
                :options="coefficientOptions"
                :disabled="!canEdit"
              />
            </a-form-item>
            <a-form-item label="Мин. месяц">
              <a-input-number
                v-model:value="form.gold_min_month"
                class="!w-full"
                :min="0"
                :disabled="!canEdit"
              />
            </a-form-item>
          </div>

          <div class="mb-1 text-[14px] font-semibold text-ink">Платина</div>
          <div class="grid grid-cols-1 gap-x-3 sm:grid-cols-3">
            <a-form-item label="Поездки">
              <a-input-number
                v-model:value="form.platinum_rides"
                class="!w-full"
                :min="1"
                :disabled="!canEdit"
              />
            </a-form-item>
            <a-form-item label="Коэффициент">
              <a-select
                v-model:value="form.platinum_coefficient"
                :options="coefficientOptions"
                :disabled="!canEdit"
              />
            </a-form-item>
            <a-form-item label="Мин. месяц">
              <a-input-number
                v-model:value="form.platinum_min_month"
                class="!w-full"
                :min="0"
                :disabled="!canEdit"
              />
            </a-form-item>
          </div>
        </template>

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
