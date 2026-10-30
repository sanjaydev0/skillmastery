/**
 * Device-local Velona client. The key lives in localStorage, never in AppData,
 * a backup, a log or the server. The browser sends it to the same-origin
 * /api/chat proxy only when the learner explicitly runs a prompt.
 */

export const AI_MODEL = 'deepseek/deepseek-v4.1-flash-1017'
export const AI_MODEL_LABEL = 'DeepSeek V4.1 Flash'
export const AI_KEY_STORAGE = 'skillmastery:ai-key'
/** The prompt runner's own ceiling. Week generation passes its own limit. */
export const AI_MAX_PROMPT_CHARS = 24_000
export const AI_MAX_OUTPUT_TOKENS = 1_200
/** The proxy's hard ceiling, mirrored so the client never sends a doomed body. */
export const AI_HARD_PROMPT_CHARS = 120_000
export const AI_HARD_OUTPUT_TOKENS = 8_000
export const AI_DEFAULT_OUTPUT_TOKENS = 600

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function getAiKey(): string {
  try {
    return (localStorage.getItem(AI_KEY_STORAGE) ?? '').trim()
  } catch {
    return ''
  }
}

export function setAiKey(value: string): void {
  const key = value.trim()
  if (!key) return
  try {
    localStorage.setItem(AI_KEY_STORAGE, key)
    emit()
  } catch {
    // Private mode can refuse writes; the caller shows a plain error.
  }
}

export function clearAiKey(): void {
  try {
    localStorage.removeItem(AI_KEY_STORAGE)
    emit()
  } catch {
    // Nothing to clear.
  }
}

export function subscribeAiKey(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Rough display estimate only. The proxy enforces characters, not tokens. */
export function promptTokenEstimate(chars: number): number {
  return Math.ceil(chars / 4)
}

export type AiErrorCode =
  | 'missing-key'
  | 'prompt-too-long'
  | 'unauthorized'
  | 'rate-limited'
  | 'upstream'
  | 'bad-response'
  | 'network'
  | 'busy'
  | 'aborted'

export class AiError extends Error {
  code: AiErrorCode
  status?: number

  constructor(code: AiErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'AiError'
    this.code = code
    this.status = status
  }
}

export interface AiUsage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

export interface AiResult {
  content: string
  usage?: AiUsage
}

interface RunAiOptions {
  maxTokens?: number
  signal?: AbortSignal
  /** A caller with a justified larger prompt, such as week generation. */
  maxPromptChars?: number
}

function clampMaxTokens(value: number | undefined): number {
  if (!Number.isFinite(value)) return AI_DEFAULT_OUTPUT_TOKENS
  return Math.max(64, Math.min(AI_HARD_OUTPUT_TOKENS, Math.round(value!)))
}

function promptCeiling(requested: number | undefined): number {
  if (!Number.isFinite(requested)) return AI_MAX_PROMPT_CHARS
  return Math.max(1_000, Math.min(AI_HARD_PROMPT_CHARS, Math.round(requested!)))
}

function errorForStatus(status: number): AiError {
  if (status === 401 || status === 403) {
    return new AiError('unauthorized', 'The Velona key was rejected. Check it in Settings → AI helper.', status)
  }
  if (status === 429) {
    return new AiError('rate-limited', 'Velona is rate limiting requests. Wait a moment, then try once more.', status)
  }
  if (status >= 500) {
    return new AiError('upstream', 'Velona is unavailable right now. Your prompt was not saved.', status)
  }
  return new AiError('bad-response', 'The AI request was rejected. Check the prompt and try again.', status)
}

export async function runAi(prompt: string, options: RunAiOptions = {}): Promise<AiResult> {
  const key = getAiKey()
  if (!key) {
    throw new AiError('missing-key', 'Add a Velona key in Settings → AI helper before running a prompt.')
  }
  const promptLimit = promptCeiling(options.maxPromptChars)
  if (prompt.length > promptLimit) {
    throw new AiError(
      'prompt-too-long',
      `This prompt is ${prompt.length.toLocaleString()} characters. The limit is ${promptLimit.toLocaleString()}.`,
    )
  }

  const maxTokens = clampMaxTokens(options.maxTokens)
  let response: Response
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AiError('aborted', 'Run cancelled.')
    }
    throw new AiError('network', 'Could not reach the AI proxy. Check your connection and try again.')
  }

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) throw errorForStatus(response.status)

  const content =
    payload && typeof payload === 'object' && 'content' in payload
      ? (payload as { content?: unknown }).content
      : undefined
  if (typeof content !== 'string' || !content.trim()) {
    throw new AiError('bad-response', 'Velona returned an empty answer. Try once more with a shorter prompt.')
  }
  const usage =
    payload && typeof payload === 'object' && 'usage' in payload
      ? ((payload as { usage?: AiUsage }).usage ?? undefined)
      : undefined
  return { content, usage }
}
