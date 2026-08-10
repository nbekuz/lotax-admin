/** Build multipart body; skips null/undefined; File/Blob kept as-is. */
export function toFormData(
  fields: Record<string, string | number | boolean | File | Blob | null | undefined>,
): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue
    if (value instanceof File || value instanceof Blob) {
      fd.append(key, value)
    } else {
      fd.append(key, String(value))
    }
  }
  return fd
}
