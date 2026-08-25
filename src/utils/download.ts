import { extractErrorMessage } from '@/utils/labels'

export function filenameFromContentDisposition(
  header: string | undefined,
  fallback: string,
): string {
  if (!header) return fallback
  const utf = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header)
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1].replace(/['"]/g, '').trim())
    } catch {
      return utf[1].replace(/['"]/g, '').trim()
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header)
  if (quoted?.[1]) return quoted[1]
  const plain = /filename=([^;]+)/i.exec(header)
  if (plain?.[1]) return plain[1].trim().replace(/['"]/g, '')
  return fallback
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function messageFromBlobError(
  error: unknown,
  fallback = 'Ошибка запроса',
): Promise<string> {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (data instanceof Blob) {
    try {
      const text = await data.text()
      const json = JSON.parse(text) as { detail?: unknown; message?: string }
      const wrapped = { response: { data: json } }
      return extractErrorMessage(wrapped, fallback)
    } catch {
      return fallback
    }
  }
  return extractErrorMessage(error, fallback)
}
