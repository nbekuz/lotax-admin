<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Rule } from 'ant-design-vue/es/form'
import { message } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import BrandMark from '@/components/BrandMark.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({
  email: '',
  password: '',
})
const loading = ref(false)

const rules: Record<string, Rule[]> = {
  email: [
    { required: true, message: 'Введите email', trigger: 'blur' },
    { type: 'email', message: 'Некорректный email', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'Введите пароль', trigger: 'blur' },
    { min: 6, message: 'Минимум 6 символов', trigger: 'blur' },
  ],
}

async function onSubmit() {
  loading.value = true
  const ok = await auth.login({
    email: form.email.trim(),
    password: form.password,
  })
  loading.value = false

  if (!ok) {
    message.error(auth.error || 'Ошибка входа')
    return
  }

  message.success('Добро пожаловать')
  const fallback = auth.homePath
  let redirect = (route.query.redirect as string) || fallback
  if (auth.isPlatformOperator) {
    const parkOnly =
      redirect.startsWith('/drivers') ||
      redirect.startsWith('/sync') ||
      redirect === '/organization' ||
      redirect.startsWith('/organization/') ||
      redirect.startsWith('/staff') ||
      redirect.startsWith('/rewards') ||
      redirect.startsWith('/orders') ||
      redirect.startsWith('/tasks')
    if (parkOnly) redirect = fallback
  }
  router.replace(redirect)
}
</script>

<template>
  <div class="relative flex min-h-full items-center justify-center overflow-hidden p-4 md:p-6">
    <div
      class="pointer-events-none absolute inset-0"
      style="background: radial-gradient(ellipse at top, var(--lotax-primary-soft), transparent 55%), linear-gradient(180deg, var(--lotax-bg) 0%, #ffffff 100%)"
    />
    <div
      class="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl"
    />
    <div
      class="pointer-events-none absolute -right-16 bottom-16 h-64 w-64 rounded-full bg-amber-200/25 blur-3xl"
    />

    <div class="relative w-full max-w-md">
      <div class="mb-6 flex justify-center overflow-visible md:mb-8">
        <BrandMark :size="72" layout="stack" class="md:!hidden">
          <p class="mt-3 text-[14px] text-ink-muted">Вход для администраторов</p>
        </BrandMark>
        <BrandMark :size="80" layout="stack" class="!hidden md:!flex">
          <p class="mt-3 text-[15px] text-ink-muted">Вход для администраторов</p>
        </BrandMark>
      </div>

      <div class="lotax-card p-5 md:p-8">
        <a-form
          :model="form"
          :rules="rules"
          layout="vertical"
          @finish="onSubmit"
        >
          <a-form-item label="Эл. почта" name="email">
            <a-input
              v-model:value="form.email"
              size="large"
              type="email"
              placeholder="email@example.com"
              autocomplete="username"
              class="!w-full"
            />
          </a-form-item>

          <a-form-item label="Пароль" name="password">
            <a-input-password
              v-model:value="form.password"
              size="large"
              placeholder="Минимум 6 символов"
              autocomplete="current-password"
              class="!w-full"
            />
          </a-form-item>

          <a-button
            type="primary"
            html-type="submit"
            size="large"
            block
            class="lotax-btn-primary !mt-2 !h-12"
            :loading="loading"
          >
            Войти
          </a-button>
        </a-form>
      </div>
    </div>
  </div>
</template>
