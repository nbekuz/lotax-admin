<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { SendOutlined } from '@ant-design/icons-vue'
import { orgApi } from '@/api/org'
import { useAuthStore } from '@/stores/auth'
import { useOrgStore } from '@/stores/org'
import { extractErrorMessage } from '@/utils/labels'
import type { PushNotifyCategory } from '@/types/api'

const auth = useAuthStore()
const org = useOrgStore()
const sending = ref(false)

const form = reactive({
  title: '',
  body: '',
  category: 'promo' as PushNotifyCategory,
})

const categoryOptions = [
  { value: 'promo', label: 'Промо' },
  { value: 'tasks', label: 'Задания' },
  { value: 'competitions', label: 'Соревнования' },
  { value: 'referrals', label: 'Рефералы' },
  { value: 'earn_points', label: 'Баллы' },
]

const parkId = computed(() => org.selectedParkId)
const canSend = computed(() => auth.canManageRewards)

async function send() {
  if (!parkId.value) {
    message.warning('Выберите парк')
    return
  }
  if (!form.title.trim() || !form.body.trim()) {
    message.warning('Укажите заголовок и текст')
    return
  }
  sending.value = true
  try {
    const { data } = await orgApi.pushNotify({
      park_id: parkId.value,
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
    })
    message.success(
      `Отправлено: ${data.success_count} · ошибок: ${data.failure_count} · устройств: ${data.devices_targeted}`,
    )
    form.title = ''
    form.body = ''
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось отправить push'))
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  if (!org.parks.length) await org.fetchParks()
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-xl flex-col gap-4 md:gap-6">
    <div>
      <h1 class="lotax-page-title">Push-уведомления</h1>
      <p class="lotax-caption mt-1">
        Отправка водителям выбранного парка (нужны device tokens)
      </p>
    </div>

    <section class="lotax-card p-5 md:p-7">
      <a-form layout="vertical">
        <a-form-item label="Парк">
          <a-input
            :value="org.selectedPark?.name || 'Не выбран'"
            size="large"
            disabled
          />
        </a-form-item>
        <a-form-item label="Категория">
          <a-select
            v-model:value="form.category"
            size="large"
            class="!w-full"
            :options="categoryOptions"
          />
        </a-form-item>
        <a-form-item label="Заголовок" required>
          <a-input
            v-model:value="form.title"
            size="large"
            :maxlength="120"
            placeholder="Новое задание"
          />
        </a-form-item>
        <a-form-item label="Текст" required>
          <a-textarea
            v-model:value="form.body"
            :rows="4"
            :maxlength="500"
            placeholder="Выполните 100 поездок и получите бонус"
          />
        </a-form-item>
        <a-button
          v-if="canSend"
          type="primary"
          class="lotax-btn-primary"
          :loading="sending"
          :disabled="!parkId"
          @click="send"
        >
          <template #icon><SendOutlined /></template>
          Отправить
        </a-button>
      </a-form>
    </section>
  </div>
</template>
