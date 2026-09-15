<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { SendOutlined } from '@ant-design/icons-vue'
import { superAdminApi } from '@/api/superAdmin'
import { extractErrorMessage } from '@/utils/labels'
import type { OrganizationResponse, PushNotifyCategory } from '@/types/api'
import PageHeader from '@/components/PageHeader.vue'

const sending = ref(false)
const loadingOrgs = ref(false)
const organizations = ref<OrganizationResponse[]>([])

const form = reactive({
  title: '',
  body: '',
  category: 'promo' as PushNotifyCategory,
  all_organizations: false,
  organization_ids: [] as string[],
})

const categoryOptions = [
  { value: 'promo', label: 'Промо' },
  { value: 'tasks', label: 'Задания' },
  { value: 'competitions', label: 'Соревнования' },
  { value: 'referrals', label: 'Рефералы' },
  { value: 'earn_points', label: 'Баллы' },
]

const orgOptions = computed(() =>
  organizations.value.map((o) => ({ value: o.id, label: o.name })),
)

async function loadOrganizations() {
  loadingOrgs.value = true
  try {
    const pageSize = 10
    const all: OrganizationResponse[] = []
    let page = 1
    let total = Infinity

    while (all.length < total) {
      const { data } = await superAdminApi.listOrganizations({
        page,
        page_size: pageSize,
      })
      
      const batch = data.items ?? []
      all.push(...batch)
      total = data.total ?? all.length
      if (batch.length < pageSize) break
      page += 1
      if (page > 100) break
    }

    organizations.value = all
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось загрузить организации'))
  } finally {
    loadingOrgs.value = false
  }
}

function onAllOrgsChange(checked: boolean | string | number) {
  const on = Boolean(checked)
  form.all_organizations = on
  if (on) form.organization_ids = []
}

async function send() {
  if (!form.title.trim() || !form.body.trim()) {
    message.warning('Укажите заголовок и текст')
    return
  }
  if (!form.all_organizations && form.organization_ids.length === 0) {
    message.warning('Выберите организации или «Все организации»')
    return
  }
  sending.value = true
  try {
    const { data } = await superAdminApi.pushNotify({
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      all_organizations: form.all_organizations || undefined,
      organization_ids: form.all_organizations
        ? undefined
        : form.organization_ids,
      data: { type: 'promo' },
    })
    if (data.devices_targeted === 0) {
      message.warning(data.detail || 'Нет активных устройств')
    } else {
      message.success(
        `Отправлено: ${data.success_count} · ошибок: ${data.failure_count} · устройств: ${data.devices_targeted}`,
      )
    }
    form.title = ''
    form.body = ''
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось отправить push'))
  } finally {
    sending.value = false
  }
}

onMounted(loadOrganizations)
</script>

<template>
  <div class="mx-auto flex w-full max-w-xl flex-col gap-4 md:gap-6">
    <PageHeader
      title="Push по организациям"
      subtitle="Рассылка водителям выбранных организаций или всей платформы"
    />

    <section class="lotax-card p-5 md:p-7">
      <a-form layout="vertical">
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
            placeholder="Акция LOTAX"
          />
        </a-form-item>
        <a-form-item label="Текст" required>
          <a-textarea
            v-model:value="form.body"
            :rows="4"
            :maxlength="500"
            placeholder="Купите купон розыгрыша и выиграйте приз"
          />
        </a-form-item>
        <a-form-item>
          <div class="flex items-center gap-2">
            <a-switch
              :checked="form.all_organizations"
              @change="onAllOrgsChange"
            />
            <span class="text-[14px] text-ink">Все организации</span>
          </div>
        </a-form-item>
        <a-form-item v-if="!form.all_organizations" label="Организации" required>
          <a-select
            v-model:value="form.organization_ids"
            mode="multiple"
            size="large"
            class="!w-full"
            :loading="loadingOrgs"
            :options="orgOptions"
            option-filter-prop="label"
            show-search
            placeholder="Выберите организации"
          />
        </a-form-item>
        <a-button
          type="primary"
          class="lotax-btn-primary"
          :loading="sending"
          @click="send"
        >
          <template #icon><SendOutlined /></template>
          Отправить
        </a-button>
      </a-form>
    </section>
  </div>
</template>
