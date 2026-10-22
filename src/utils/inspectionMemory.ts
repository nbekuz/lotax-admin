/** In-memory only. The support token is never written to localStorage or the URL. */

let token: string | null = null

export function setInspectionToken(value: string | null) {
  token = value
}

export function getInspectionToken() {
  return token
}
