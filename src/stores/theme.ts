import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'lotax_admin_theme'

export function readStoredTheme(): ThemeMode {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  return 'system'
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'light' || mode === 'dark') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyDocumentTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStoredTheme())
  const resolved = ref<ResolvedTheme>(resolveTheme(mode.value))

  const isDark = computed(() => resolved.value === 'dark')

  const hint = computed(() => {
    if (mode.value === 'light') return 'Всегда светлая тема'
    if (mode.value === 'dark') return 'Всегда тёмная тема'
    return resolved.value === 'dark'
      ? 'Сейчас тёмная — как в системе'
      : 'Сейчас светлая — как в системе'
  })

  function sync() {
    resolved.value = resolveTheme(mode.value)
    applyDocumentTheme(resolved.value)
  }

  function setMode(next: ThemeMode) {
    mode.value = next
    localStorage.setItem(STORAGE_KEY, next)
    sync()
  }

  function bindSystem() {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', () => {
      if (mode.value === 'system') sync()
    })
    sync()
  }

  return { mode, resolved, isDark, hint, setMode, bindSystem, sync }
})
