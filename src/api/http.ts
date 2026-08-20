import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL } from '@/config'
import { tokenStorage } from '@/utils/tokenStorage'
import type { TokenResponse } from '@/types/api'

const PUBLIC_API_PATHS = [
  '/auth/admin/login',
  '/auth/refresh',
  '/auth/driver/sms/request',
  '/auth/driver/sms/verify',
]

/** SPA routes that must never force a login redirect (legal / auth pages). */
const PUBLIC_PAGE_PATHS = new Set([
  '/login',
  '/privacy',
  '/termofuse',
  '/delete-account',
])

function isPublic(url?: string) {
  if (!url) return false
  return PUBLIC_API_PATHS.some((p) => url.includes(p))
}

function isPublicPagePath(pathname = window.location.pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  return PUBLIC_PAGE_PATHS.has(path)
}

function redirectToLoginIfNeeded() {
  if (isPublicPagePath()) return
  if (window.location.pathname === '/login') return
  window.location.href = '/login'
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh()
  if (!refresh) return null

  const { data } = await axios.post<TokenResponse>(
    `${API_BASE_URL}/auth/refresh`,
    { refresh_token: refresh },
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  )

  tokenStorage.setTokens(data.access_token, data.refresh_token)
  return data.access_token
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.data instanceof FormData) {
    // Let the browser set multipart boundary.
    delete config.headers['Content-Type']
  }
  if (!isPublic(config.url)) {
    const token = tokenStorage.getAccess()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isPublic(original.url)
    ) {
      original._retry = true

      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null
        })
        const access = await refreshPromise
        if (!access) {
          tokenStorage.clear()
          redirectToLoginIfNeeded()
          return Promise.reject(error)
        }
        original.headers.Authorization = `Bearer ${access}`
        return http(original)
      } catch {
        tokenStorage.clear()
        redirectToLoginIfNeeded()
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  },
)
