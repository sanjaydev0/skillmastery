/**
 * Stateless Velona proxy.
 *
 * The browser sends its device-local key in the Authorization header. This
 * function forwards it to Velona for one request and never stores, logs or
 * echoes it. The upstream URL and model are fixed here, not chosen by the
 * browser, so a crafted request cannot redirect the key or change the spend
 * ceiling.
 */

export const maxDuration = 300

const UPSTREAM = 'https://velona.in/v1/chat/completions'
const MODEL = 'deepseek/deepseek-v4.1-flash-1017'
const MAX_PROMPT_CHARS = 120_000
const MAX_OUTPUT_TOKENS = 8_000
const REQUEST_TIMEOUT_MS = 280_000

type Role = 'system' | 'user' | 'assistant'

interface Message {
  role: Role
  content: string
}

interface ApiRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}

interface ApiResponse {
  status: (code: number) => ApiResponse
  setHeader: (name: string, value: string) => void
  json: (body: unknown) => void
}

function header(request: ApiRequest, name: string): string {
  const value = request.headers[name.toLowerCase()] ?? request.headers[name]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

function send(response: ApiResponse, status: number, body: unknown): void {
  response.status(status)
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.json(body)
}

function fail(response: ApiResponse, status: number, code: string, message: string): void {
  send(response, status, { error: { code, message } })
}

function parseBody(body: unknown): Record<string, unknown> | null {
  if (typeof body === 'string') {
    try {
      const parsed: unknown = JSON.parse(body)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
}

function parseMessages(value: unknown): Message[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) return null
  const messages: Message[] = []
  let chars = 0
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null
    const role = (entry as { role?: unknown }).role
    const content = (entry as { content?: unknown }).content
    if (role !== 'system' && role !== 'user' && role !== 'assistant') return null
    if (typeof content !== 'string' || !content.trim()) return null
    chars += content.length
    if (chars > MAX_PROMPT_CHARS) return null
    messages.push({ role, content })
  }
  return messages
}

function numberInRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  integer = true,
): number | null {
  if (value === undefined) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const next = integer ? Math.round(value) : value
  return next >= min && next <= max ? next : null
}

function upstreamStatus(status: number): number {
  if (status === 401 || status === 403) return 401
  if (status === 429) return 429
  if (status >= 500) return 502
  return 400
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    fail(response, 405, 'method-not-allowed', 'Use POST.')
    return
  }

  const authorization = header(request, 'authorization')
  if (!authorization.startsWith('Bearer ')) {
    fail(response, 401, 'missing-key', 'Add your Velona key in Settings → AI helper.')
    return
  }
  const key = authorization.slice(7).trim()
  if (!key || key.length > 240) {
    fail(response, 401, 'missing-key', 'Add your Velona key in Settings → AI helper.')
    return
  }

  const body = parseBody(request.body)
  if (!body) {
    fail(response, 400, 'bad-request', 'Expected a JSON request body.')
    return
  }

  const messages = parseMessages(body.messages)
  if (!messages) {
    fail(response, 400, 'bad-messages', 'Send 1–20 non-empty messages under 120,000 characters total.')
    return
  }

  const maxTokens = numberInRange(body.max_tokens, 600, 1, MAX_OUTPUT_TOKENS)
  if (maxTokens === null) {
    fail(response, 400, 'bad-max-tokens', `max_tokens must be between 1 and ${MAX_OUTPUT_TOKENS}.`)
    return
  }
  const temperature = numberInRange(body.temperature, 0.4, 0, 1, false)
  if (temperature === null) {
    fail(response, 400, 'bad-temperature', 'temperature must be between 0 and 1.')
    return
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
      signal: controller.signal,
    })

    const text = await upstream.text()
    let payload: unknown = null
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }

    if (!upstream.ok) {
      const status = upstreamStatus(upstream.status)
      const message =
        status === 401
          ? 'The Velona key was rejected. Check it in Settings → AI helper.'
          : status === 429
            ? 'Velona is rate limiting requests. Wait a moment, then try once more.'
            : status === 502
              ? 'Velona is unavailable right now. Your prompt was not saved.'
              : 'The AI request was rejected. Check the prompt and try again.'
      fail(response, status, status === 401 ? 'unauthorized' : status === 429 ? 'rate-limited' : 'upstream', message)
      return
    }

    const content =
      payload && typeof payload === 'object' && 'choices' in payload
        ? (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content
        : undefined
    if (typeof content !== 'string' || !content.trim()) {
      fail(response, 502, 'empty-response', 'Velona returned an empty answer. Try once more with a shorter prompt.')
      return
    }

    const usage =
      payload && typeof payload === 'object' && 'usage' in payload
        ? (payload as { usage?: unknown }).usage
        : undefined
    send(response, 200, { content, ...(usage ? { usage } : {}), model: MODEL })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      fail(response, 504, 'timeout', 'The AI request took too long. Try a shorter prompt.')
      return
    }
    fail(response, 502, 'upstream', 'Could not reach Velona. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
  }
}
