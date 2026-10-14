const DEVICE_KEY = 'lotax_admin_device'

export const deviceStorage = {
  get(): string | null {
    return localStorage.getItem(DEVICE_KEY)
  },
  set(token: string) {
    localStorage.setItem(DEVICE_KEY, token)
  },
}
