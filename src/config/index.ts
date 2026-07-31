const DEFAULT_API_HOST = 'https://admin.xn--80aubmrd.xn--p1ai'
const DEFAULT_API_PREFIX = '/api/v1'

export const API_HOST =
  String(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_HOST).replace(/\/$/, '')

export const API_PREFIX =
  String(import.meta.env.VITE_API_PREFIX || DEFAULT_API_PREFIX)

/** Base URL for `/api/v1` requests. */
export const API_BASE_URL = `${API_HOST}${API_PREFIX}`

export const APP_NAME = 'Lotax'
