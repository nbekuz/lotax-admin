<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons-vue'
import { useParksStore } from '@/stores/parks'
import { extractErrorMessage } from '@/utils/labels'

type SettingsDraftRow = {
  key: string
  value: string
  description: string
}

const parks = useParksStore()
const saving = ref(false)
const draft = ref<SettingsDraftRow[]>([])

async function load() {
  try {
    await parks.fetchSettings()
    draft.value = parks.settings.map((item) => ({
      key: item.key,
      value: item.value,
      description: item.description ?? '',
    }))
  } catch (e) {
    message.error(extractErrorMessage(e))
  }
}

function addRow() {
  draft.value.push({ key: '', value: '', description: '' })
}

function removeRow(index: number) {
  draft.value.splice(index, 1)
}

async function save() {
  const items = draft.value
    .map((item) => ({
      key: item.key.trim(),
      value: item.value,
      description: item.description?.trim() || null,
    }))
    .filter((item) => item.key)

  if (!items.length) {
    message.warning('Добавьте хотя бы одну настройку с ключом')
    return
  }

  saving.value = true
  try {
    await parks.saveSettings(items)
    draft.value = parks.settings.map((item) => ({
      key: item.key,
      value: item.value,
      description: item.description ?? '',
    }))
    message.success('Настройки сохранены')
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось сохранить настройки'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="lotax-page-title">Настройки платформы</h1>
        <p class="lotax-caption mt-1">Глобальные параметры LOTAX (ключ / значение)</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <a-button class="lotax-btn-secondary" @click="load">
          <template #icon><ReloadOutlined /></template>
          Обновить
        </a-button>
        <a-button class="lotax-btn-secondary" @click="addRow">
          <template #icon><PlusOutlined /></template>
          Добавить
        </a-button>
        <a-button
          type="primary"
          class="lotax-btn-primary"
          :loading="saving"
          @click="save"
        >
          <template #icon><SaveOutlined /></template>
          Сохранить
        </a-button>
      </div>
    </div>

    <div v-if="parks.loading && !draft.length" class="flex justify-center py-20">
      <a-spin size="large" />
    </div>

    <section v-else class="lotax-card p-5 md:p-7">
      <div v-if="!draft.length" class="py-10 text-center">
        <p class="text-[15px] font-medium text-ink">Настроек пока нет</p>
        <p class="lotax-caption mt-1">Добавьте первую пару ключ / значение</p>
      </div>

      <div v-else class="flex flex-col gap-4">
        <div
          v-for="(item, index) in draft"
          :key="index"
          class="grid grid-cols-1 gap-3 rounded-2xl border border-line bg-surface p-4 md:grid-cols-[1fr_1fr_1.2fr_auto] md:items-end"
        >
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-ink-muted">Ключ</label>
            <a-input
              v-model:value="item.key"
              size="large"
              placeholder="Например, feature_flag"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-ink-muted">Значение</label>
            <a-input
              v-model:value="item.value"
              size="large"
              placeholder="Значение параметра"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[13px] font-medium text-ink-muted">Описание</label>
            <a-input
              v-model:value="item.description"
              size="large"
              placeholder="Краткое описание"
            />
          </div>
          <a-button class="lotax-btn-danger md:mb-0.5" @click="removeRow(index)">
            Удалить
          </a-button>
        </div>
      </div>
    </section>
  </div>
</template>
