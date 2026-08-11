<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { adminTaskTemplatesApi } from '@/api/adminTaskTemplates'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage } from '@/utils/labels'
import type { TaskTemplateItem } from '@/types/api'

const auth = useAuthStore()
const org = useOrgStore()

const loading = ref(false)
const items = ref<TaskTemplateItem[]>([])
const togglingKey = ref<string | null>(null)

const enableOpen = ref(false)
const enableSaving = ref(false)
const enableTarget = ref<TaskTemplateItem | null>(null)
const enableForm = reactive({
  reward_points: 50,
  reward_points_type: 'park' as 'park' | 'system',
})

const parkId = computed(() => org.selectedParkId)
const canEdit = computed(() => auth.canManageTasks)

async function load() {
  if (!parkId.value) {
    items.value = []
    return
  }
  loading.value = true
  try {
    const { data } = await adminTaskTemplatesApi.list(parkId.value)
    items.value = data.items
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    loading.value = false
  }
}

function openEnable(item: TaskTemplateItem) {
  enableTarget.value = item
  enableForm.reward_points = item.default_reward_points
  enableForm.reward_points_type = 'park'
  enableOpen.value = true
}

async function confirmEnable() {
  if (!parkId.value || !enableTarget.value) return
  enableSaving.value = true
  togglingKey.value = enableTarget.value.key
  try {
    await adminTaskTemplatesApi.enable(enableTarget.value.key, {
      park_id: parkId.value,
      reward_points: enableForm.reward_points,
      reward_points_type: enableForm.reward_points_type,
    })
    message.success('Шаблон включён')
    enableOpen.value = false
    await load()
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    enableSaving.value = false
    togglingKey.value = null
  }
}

function requestDisable(item: TaskTemplateItem) {
  if (!parkId.value) return
  Modal.confirm({
    title: 'Отключить шаблон?',
    content: `«${item.title}» станет недоступен водителям.`,
    okText: 'Отключить',
    cancelText: 'Отмена',
    okButtonProps: { danger: true },
    centered: true,
    async onOk() {
      togglingKey.value = item.key
      try {
        await adminTaskTemplatesApi.disable(item.key, parkId.value!)
        message.success('Шаблон отключён')
        await load()
      } catch (e) {
        message.error(extractErrorMessage(e))
      } finally {
        togglingKey.value = null
      }
    },
  })
}

function onSwitch(item: TaskTemplateItem, checked: boolean) {
  if (!canEdit.value) return
  if (checked) {
    openEnable(item)
  } else {
    requestDisable(item)
  }
}

function metaLine(item: TaskTemplateItem) {
  const bits = [
    item.task_type,
    `цель ${item.target_value}`,
    `${item.default_reward_points} б.`,
  ]
  if (item.period_days) bits.push(`${item.period_days} дн.`)
  if (item.is_claimable) bits.push('claim')
  if (item.renew_on_complete) bits.push('renew')
  return bits.join(' · ')
}

watch(parkId, load)
onMounted(async () => {
  if (!org.parks.length) await org.fetchParks()
  await load()
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="lotax-page-title">Шаблоны заданий</h1>
        <p class="lotax-caption mt-1">
          Готовые задания парка: включите и задайте награду
        </p>
      </div>
      <a-button class="lotax-btn-secondary" @click="load">
        <template #icon><ReloadOutlined /></template>
        Обновить
      </a-button>
    </div>

    <div v-if="!parkId" class="lotax-card p-8 text-center">Выберите парк в шапке</div>
    <div v-else-if="loading" class="flex justify-center py-16"><a-spin size="large" /></div>
    <div v-else-if="!items.length" class="lotax-card p-8 text-center lotax-caption">
      Шаблоны недоступны
    </div>
    <div v-else class="flex flex-col gap-3">
      <article
        v-for="item in items"
        :key="item.key"
        class="lotax-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-semibold text-ink">{{ item.title }}</span>
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset"
              :class="
                item.enabled
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-slate-100 text-slate-600 ring-slate-300'
              "
            >
              {{ item.enabled ? 'Включено' : 'Выкл.' }}
            </span>
            <span
              v-if="item.task_status"
              class="text-[12px] text-ink-muted"
            >
              task: {{ item.task_status }}
            </span>
          </div>
          <p class="mt-1 text-[13px] text-ink-muted">{{ item.description }}</p>
          <p class="mt-1 text-[12px] text-ink-muted">{{ metaLine(item) }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-3">
          <a-switch
            :checked="Boolean(item.enabled)"
            :disabled="!canEdit || togglingKey === item.key"
            :loading="togglingKey === item.key"
            @change="(v) => onSwitch(item, Boolean(v))"
          />
        </div>
      </article>
    </div>

    <a-modal
      v-model:open="enableOpen"
      title="Включить шаблон"
      ok-text="Включить"
      cancel-text="Отмена"
      :confirm-loading="enableSaving"
      centered
      :width="420"
      destroy-on-close
      @ok="confirmEnable"
      @cancel="enableTarget = null"
    >
      <p v-if="enableTarget" class="mb-3 text-[14px] text-ink">
        {{ enableTarget.title }}
      </p>
      <a-form layout="vertical">
        <a-form-item label="Награда (баллы)">
          <a-input-number
            v-model:value="enableForm.reward_points"
            class="!w-full"
            :min="0"
            addon-after="б."
          />
          <p class="lotax-caption mt-1">
            По умолчанию: {{ enableTarget?.default_reward_points ?? '—' }} б.
          </p>
        </a-form-item>
        <a-form-item label="Тип баллов">
          <a-select
            v-model:value="enableForm.reward_points_type"
            :options="[
              { value: 'park', label: 'Парковые' },
              { value: 'system', label: 'Системные' },
            ]"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
