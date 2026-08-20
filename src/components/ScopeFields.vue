<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { adminParkGroupsApi } from '@/api/adminParkGroups'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage } from '@/utils/labels'
import type { ParkGroupItem, ScopeType } from '@/types/api'

export interface ScopeFieldsValue {
  scope_type: ScopeType
  park_group_id?: string | null
  park_ids?: string[] | null
}

const props = withDefaults(
  defineProps<{
    modelValue: ScopeFieldsValue
    disabled?: boolean
  }>(),
  { disabled: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: ScopeFieldsValue]
}>()

const org = useOrgStore()
const groups = ref<ParkGroupItem[]>([])
const groupsLoading = ref(false)

const scopeTypeOptions = [
  { value: 'all', label: 'Все парки' },
  { value: 'group', label: 'Группа' },
  { value: 'specific', label: 'Выбранные парки' },
]

const groupOptions = computed(() =>
  groups.value
    .filter((g) => g.is_active)
    .map((g) => ({ value: g.id, label: g.name })),
)

const parkOptions = computed(() =>
  org.parks.map((p) => ({ value: p.id, label: p.name })),
)

function patch(partial: Partial<ScopeFieldsValue>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

function onScopeTypeChange(value: ScopeType) {
  patch({
    scope_type: value,
    park_group_id: value === 'group' ? props.modelValue.park_group_id : null,
    park_ids: value === 'specific' ? props.modelValue.park_ids ?? [] : null,
  })
}

onMounted(async () => {
  if (!org.parks.length) {
    try {
      await org.fetchParks()
    } catch {
      /* ignore */
    }
  }
  groupsLoading.value = true
  try {
    const { data } = await adminParkGroupsApi.list()
    groups.value = data.items
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось загрузить группы парков'))
  } finally {
    groupsLoading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col gap-0">
    <a-form-item label="Область действия">
      <a-select
        :value="modelValue.scope_type"
        :options="scopeTypeOptions"
        :disabled="disabled"
        @change="(v) => onScopeTypeChange(v as ScopeType)"
      />
    </a-form-item>
    <a-form-item v-if="modelValue.scope_type === 'group'" label="Группа парков">
      <a-select
        :value="modelValue.park_group_id ?? undefined"
        :options="groupOptions"
        :loading="groupsLoading"
        :disabled="disabled"
        allow-clear
        placeholder="Выберите группу"
        @change="(v) => patch({ park_group_id: v ? String(v) : null })"
      />
    </a-form-item>
    <a-form-item
      v-if="modelValue.scope_type === 'specific'"
      label="Парки"
    >
      <a-select
        :value="modelValue.park_ids ?? []"
        mode="multiple"
        :options="parkOptions"
        :disabled="disabled"
        allow-clear
        placeholder="Выберите парки"
        @change="(v) => patch({ park_ids: (v as string[]) ?? [] })"
      />
    </a-form-item>
  </div>
</template>
