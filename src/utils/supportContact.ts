import type { SupportContactType } from '@/api/supportContacts'

export type ContactEntryMode = 'username' | 'phone' | 'text'

const USERNAME_OR_PHONE = new Set<SupportContactType>(['telegram', 'max'])
const PHONE_ONLY = new Set<SupportContactType>(['whatsapp', 'viber', 'phone'])
const USERNAME_ONLY = new Set<SupportContactType>(['facebook', 'instagram', 'vk'])

export function defaultEntryMode(type: SupportContactType): ContactEntryMode {
  if (PHONE_ONLY.has(type)) return 'phone'
  if (USERNAME_OR_PHONE.has(type) || USERNAME_ONLY.has(type)) return 'username'
  return 'text'
}

export function allowsUsernameOrPhone(type: SupportContactType): boolean {
  return USERNAME_OR_PHONE.has(type)
}

/** National 10 digits. Drops a leading 7/8 only when a full country number was pasted. */
export function takeRuNationalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if ((digits.startsWith('7') || digits.startsWith('8')) && digits.length > 10) {
    digits = digits.slice(1)
  }
  return digits.slice(0, 10)
}

/** `(900) 123-45-67` while the director types. */
export function formatRuNational(digits: string): string {
  const d = digits.slice(0, 10)
  const area = d.slice(0, 3)
  const mid = d.slice(3, 6)
  const tail = d.slice(6, 8)
  const end = d.slice(8, 10)
  let out = ''
  if (area) out += `(${area}`
  if (area.length === 3) out += ')'
  if (mid) out += ` ${mid}`
  if (tail) out += `-${tail}`
  if (end) out += `-${end}`
  return out.trim()
}

export function e164FromNational(digits: string): string | null {
  if (digits.length !== 10) return null
  return `+7${digits}`
}

function stripHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').replace(/\s+/g, '')
}

function hostAndPath(raw: string): { host: string; path: string } | null {
  const trimmed = raw.trim()
  if (!/^https?:\/\//i.test(trimmed)) return null
  try {
    const url = new URL(trimmed)
    return {
      host: url.hostname.replace(/^www\./, '').toLowerCase(),
      path: url.pathname.replace(/^\/+|\/+$/g, ''),
    }
  } catch {
    return null
  }
}

/** Profile handle from `@name` or a known profile URL. Invite/deep links stay empty. */
export function extractProfileHandle(type: SupportContactType, raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const parsed = hostAndPath(trimmed)
  if (!parsed) return stripHandle(trimmed).replace(/[/?#].*$/, '')

  const { host, path } = parsed
  const first = path.split('/')[0] ?? ''
  if (!first || first.startsWith('+') || first === 'joinchat') return ''

  const hosts: Record<string, string[]> = {
    telegram: ['t.me', 'telegram.me'],
    max: ['max.ru'],
    facebook: ['facebook.com', 'fb.com', 'm.me'],
    instagram: ['instagram.com'],
    vk: ['vk.com', 'vk.ru'],
  }
  const allowed = hosts[type]
  if (allowed && !allowed.includes(host)) return ''
  return first
}

export function contactOpenUrl(
  type: SupportContactType,
  input: { mode: ContactEntryMode; phoneDigits: string; username: string; text: string },
): string | null {
  const text = input.text.trim()
  if (/^https?:\/\//i.test(text)) return text

  if (input.mode === 'phone' || PHONE_ONLY.has(type)) {
    const phone = e164FromNational(input.phoneDigits)
    if (!phone) return null
    const digits = phone.slice(1)
    switch (type) {
      case 'telegram':
        return `https://t.me/${phone}`
      case 'max':
        return `https://max.ru/${phone}`
      case 'whatsapp':
        return `https://wa.me/${digits}`
      case 'viber':
        return `viber://chat?number=${encodeURIComponent(phone)}`
      case 'phone':
        return `tel:${phone}`
      default:
        return `tel:${phone}`
    }
  }

  if (type === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return null
    return `mailto:${text}`
  }

  if (type === 'website') {
    if (!text) return null
    if (/^https?:\/\//i.test(text)) return text
    if (!text.includes('.')) return null
    return `https://${text}`
  }

  const handle = stripHandle(input.username)
  if (!handle || /[/?#\s]/.test(handle)) return null

  switch (type) {
    case 'telegram':
      return `https://t.me/${handle}`
    case 'max':
      return `https://max.ru/${handle}`
    case 'facebook':
      return `https://facebook.com/${handle}`
    case 'instagram':
      return `https://instagram.com/${handle}`
    case 'vk':
      return `https://vk.com/${handle}`
    default:
      return null
  }
}

export function contactStoredValue(
  type: SupportContactType,
  input: { mode: ContactEntryMode; phoneDigits: string; username: string; text: string },
): { value: string; error: string | null } {
  const text = input.text.trim()
  if (/^https?:\/\//i.test(text)) {
    return { value: text, error: null }
  }

  if (input.mode === 'phone' || PHONE_ONLY.has(type)) {
    const phone = e164FromNational(input.phoneDigits)
    if (!phone) {
      return { value: '', error: 'Введите номер в формате +7 (900) 000-00-00' }
    }
    return { value: phone, error: null }
  }

  if (type === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
      return { value: '', error: 'Введите email, например help@park.ru' }
    }
    return { value: text, error: null }
  }

  if (type === 'website') {
    const url = contactOpenUrl(type, input)
    if (!url) return { value: '', error: 'Введите адрес сайта' }
    return { value: url, error: null }
  }

  const handle = stripHandle(input.username)
  if (!handle) {
    return { value: '', error: 'Введите username' }
  }
  return { value: `@${handle}`, error: null }
}

export function parseStoredContact(type: SupportContactType, raw: string): {
  mode: ContactEntryMode
  phoneDigits: string
  username: string
  text: string
} {
  const value = raw.trim()
  const empty = {
    mode: defaultEntryMode(type),
    phoneDigits: '',
    username: '',
    text: '',
  }
  if (!value) return empty

  if (type === 'email' || type === 'website') {
    return { ...empty, mode: 'text', text: value }
  }

  if (/^https?:\/\//i.test(value)) {
    const handle = extractProfileHandle(type, value)
    if (handle && !PHONE_ONLY.has(type)) {
      return { ...empty, mode: 'username', username: handle }
    }
    return { ...empty, mode: defaultEntryMode(type), text: value }
  }

  const digits = value.replace(/\D/g, '')
  const looksLikePhone =
    value.startsWith('+') ||
    (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) ||
    PHONE_ONLY.has(type)

  if (looksLikePhone) {
    return {
      mode: 'phone',
      phoneDigits: takeRuNationalDigits(value),
      username: '',
      text: '',
    }
  }

  return {
    mode: 'username',
    phoneDigits: '',
    username: stripHandle(value),
    text: '',
  }
}
