<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import QRCode from 'qrcode'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { extractErrorMessage } from '@/utils/labels'

const auth = useAuthStore()
const router = useRouter()
const secret = ref('')
const otpauth = ref('')
const qrUrl = ref('')
const code = ref('')
const loading = ref(false)
const preparing = ref(true)

const apps = [
  'Яндекс Ключ — удобнее всего в России (RuStore или App Store)',
  'Microsoft Authenticator',
  '2FAS Authenticator',
  'Aegis Authenticator',
]

watch(otpauth, async (value) => {
  if (!value) {
    qrUrl.value = ''
    return
  }
  qrUrl.value = await QRCode.toDataURL(value, {
    width: 240,
    margin: 1,
    errorCorrectionLevel: 'M',
  })
})

onMounted(async () => {
  try {
    const { data } = await authApi.setupTwoFactor()
    secret.value = data.secret
    otpauth.value = data.otpauth_uri
  } catch (e) {
    message.error(extractErrorMessage(e, 'Не удалось начать подключение'))
  } finally {
    preparing.value = false
  }
})

async function confirm() {
  loading.value = true
  try {
    await auth.confirmTwoFactor(code.value.trim())
    message.success('Защита включена')
    await router.replace(auth.homePath)
  } catch (e) {
    message.error(extractErrorMessage(e, 'Неверный код'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex h-full items-center justify-center overflow-hidden p-4">
    <div
      class="lotax-card grid w-full max-w-5xl grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-center gap-8 p-6"
    >
      <div class="min-w-0">
        <h1 class="mb-1 text-xl font-semibold">Двухфакторная защита</h1>
        <p class="mb-3 text-[13px] leading-snug text-ink-muted">
          Это нужно один раз. Дальше при входе, кроме пароля, будет код из телефона.
        </p>
        <ol class="list-decimal space-y-2 pl-5 text-[13px] leading-snug">
          <li>
            Установите одно из приложений. Достаточно любого — аккаунт Google не нужен.
            <ul class="mt-1 list-disc space-y-0.5 pl-4">
              <li v-for="app in apps" :key="app">{{ app }}</li>
            </ul>
          </li>
          <li>
            В приложении нажмите «Добавить аккаунт» и отсканируйте QR-код. Если камера не
            открывается — введите секрет справа.
          </li>
          <li>
            Введите 6 цифр и нажмите «Включить». Код обновляется каждые 30 секунд.
          </li>
        </ol>
        <p class="mt-3 text-[12px] leading-snug text-ink-muted">
          Не обновляйте страницу: секрет сменится, и старый QR перестанет подходить.
        </p>
      </div>
      <a-spin :spinning="preparing">
        <div class="flex flex-col items-stretch">
          <div class="mb-3 flex justify-center">
            <img
              v-if="qrUrl"
              :src="qrUrl"
              alt="QR-код для приложения-аутентификатора"
              width="188"
              height="188"
              class="h-[188px] w-[188px] rounded-lg bg-white p-1.5"
            />
          </div>
          <p class="mb-1 text-[12px] text-ink-muted">Секрет, если QR не сканируется</p>
          <p class="mb-3 break-all font-mono text-[13px] leading-snug">{{ secret || '—' }}</p>
          <a-input
            v-model:value="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            placeholder="6 цифр"
            class="!mb-3"
          />
          <a-button type="primary" block class="!h-10" :loading="loading" @click="confirm">
            Включить
          </a-button>
        </div>
      </a-spin>
    </div>
  </div>
</template>
