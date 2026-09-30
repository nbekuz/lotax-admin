<script setup lang="ts">
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons-vue'
import type { PrizeRow } from '@/utils/rafflePrizes'

const mode = defineModel<'list' | 'identical'>('mode', { required: true })
const rows = defineModel<PrizeRow[]>('rows', { required: true })
const identicalCount = defineModel<number | undefined>('identicalCount')
const identicalPrize = defineModel<string>('identicalPrize', { required: true })

function addRow() {
  const next = (rows.value.at(-1)?.place ?? 0) + 1
  rows.value = [...rows.value, { place: next, prize: '' }]
}

function removeRow(index: number) {
  rows.value = rows.value.filter((_, i) => i !== index)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <a-radio-group v-model:value="mode">
      <a-radio value="list">Разные места</a-radio>
      <a-radio value="identical">Одинаковый приз</a-radio>
    </a-radio-group>

    <template v-if="mode === 'list'">
      <div
        v-for="(row, index) in rows"
        :key="index"
        class="flex items-center gap-2"
      >
        <a-input-number
          v-model:value="row.place"
          :min="1"
          class="!w-24"
          placeholder="Место"
        />
        <a-input v-model:value="row.prize" placeholder="Приз, например 50 000 ₽" />
        <a-button type="text" :disabled="rows.length === 1" @click="removeRow(index)">
          <template #icon><MinusCircleOutlined /></template>
        </a-button>
      </div>
      <a-button class="lotax-btn-secondary w-fit" @click="addRow">
        <template #icon><PlusOutlined /></template>
        Место
      </a-button>
    </template>

    <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-[120px_1fr]">
      <a-input-number
        v-model:value="identicalCount"
        :min="1"
        class="!w-full"
        placeholder="Сколько"
      />
      <a-input v-model:value="identicalPrize" placeholder="Приз, например Заправка 50 литров" />
    </div>
  </div>
</template>
