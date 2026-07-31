export const API_HOST =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

export const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1'

/** Base URL for `/api/v1` requests (empty host = Vite proxy in dev). */
export const API_BASE_URL = `${API_HOST}${API_PREFIX}`

export const APP_NAME = 'Lotax'
