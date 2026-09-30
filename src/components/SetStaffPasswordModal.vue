<script setup lang="ts">
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { superAdminApi } from '@/api/superAdmin'
import { extractErrorMessage } from '@/utils/labels'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  adminId: string | null
  label?: string
}>()

const emit = defineEmits<{
  saved: [roomId: string]
}>()

const password = ref('')
const note = ref('')
const saving = ref(false)

watch(open, (value) => {
  if (value) {
    password.value = ''
    note.value = ''
  }
})

async function submit() {
  if (!props.adminId) return
  if (password.value.trim().length < 8) {
    message.warning('Пароль — минимум 8 символов')
    return
  }
  saving.value = true
  try {
    const { data } = await superAdminApi.setStaffPassword(props.adminId, {
      password: password.value.trim(),
      message: note.value.trim() || null,
    })
    message.success(data.message || 'Пароль обновлён')
    open.value = false
    emit('saved', data.room_id)
  } catch (e) {
    message.error(extractErrorMessage(e))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <a-modal
    v-model:open="open"
    title="Новый пароль"
    ok-text="Сохранить"
    cancel-text="Отмена"
    :confirm-loading="saving"
    centered
    @ok="submit"
  >
    <p v-if="label" class="mb-3 text-[14px] text-ink">{{ label }}</p>
    <a-form layout="vertical">
      <a-form-item label="Пароль" required>
        <a-input-password v-model:value="password" size="large" placeholder="Минимум 8 символов" />
      </a-form-item>
      <a-form-item label="Сообщение в чат">
        <a-textarea
          v-model:value="note"
          :rows="3"
          placeholder="Пусто — шаблон с ФИО, email и новым паролем"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
