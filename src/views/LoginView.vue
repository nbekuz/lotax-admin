<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { APP_NAME } from '@/config'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({
  email: '',
  password: '',
})
const loading = ref(false)

async function onSubmit() {
  if (!form.email || !form.password) {
    message.warning('Введите email и пароль')
    return
  }
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
  const redirect = (route.query.redirect as string) || '/drivers'
  router.replace(redirect)
}
</script>

<template>
  <div
    class="flex min-h-full items-center justify-center bg-[linear-gradient(160deg,#f5f5f7_0%,#fff7ed_50%,#f5f5f7_100%)] p-4"
  >
    <div class="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-black/5">
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1c1c1e] text-2xl font-bold text-amber-500"
        >
          L
        </div>
        <h1 class="text-2xl font-bold text-neutral-900">{{ APP_NAME }}</h1>
        <p class="mt-2 text-neutral-500">Вход для администраторов</p>
      </div>

      <a-form layout="vertical" @finish="onSubmit">
        <a-form-item label="Email" name="email" :required="true">
          <a-input
            v-model:value="form.email"
            size="large"
            type="email"
            placeholder="director@lotax.local"
            autocomplete="username"
          />
        </a-form-item>

        <a-form-item label="Пароль" name="password" :required="true">
          <a-input-password
            v-model:value="form.password"
            size="large"
            placeholder="Пароль"
            autocomplete="current-password"
          />
        </a-form-item>

        <a-button
          type="primary"
          html-type="submit"
          size="large"
          block
          class="!mt-2 !h-12 !rounded-xl !bg-[#1c1c1e] !border-[#1c1c1e]"
          :loading="loading"
        >
          Войти
        </a-button>
      </a-form>
    </div>
  </div>
</template>
