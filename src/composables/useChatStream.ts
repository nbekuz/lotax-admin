import { API_BASE_URL } from '@/config'
import { tokenStorage } from '@/utils/tokenStorage'
import type { ChatStreamEvent } from '@/types/chat'

export type ChatStreamHandler = (event: ChatStreamEvent) => void

function parseSseChunk(buffer: string): {
  events: ChatStreamEvent[]
  rest: string
} {
  const events: ChatStreamEvent[] = []
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''

  for (const part of parts) {
    const dataLine = part
      .split('\n')
      .find((line) => line.startsWith('data:'))
    if (!dataLine) continue

    const raw = dataLine.slice(5).trim()
    if (!raw) continue

    try {
      events.push(JSON.parse(raw) as ChatStreamEvent)
    } catch {
      /* ignore malformed chunks */
    }
  }

  return { events, rest }
}

export function createChatStream(onEvent: ChatStreamHandler) {
  const controller = new AbortController()
  let closed = false

  async function connect() {
    const token = tokenStorage.getAccess()
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (!closed) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parsed = parseSseChunk(buffer)
        buffer = parsed.rest

        for (const event of parsed.events) {
          if (event.event === 'ping') continue
          onEvent(event)
        }
      }
    } catch (error) {
      if (!closed && !(error instanceof DOMException && error.name === 'AbortError')) {
        /* stream will reconnect via store polling fallback */
      }
    }
  }

  void connect()

  return {
    close() {
      closed = true
      controller.abort()
    },
  }
}
