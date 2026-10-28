import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Copy,
  FileJson,
  Pencil,
  Play,
  Settings2,
  Sparkles,
  Square,
} from 'lucide-react'
import { PROMPTS, SKILL_FORMULA } from '../../data/prompts'
import { useActiveSubject, useActiveWeek, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import {
  AI_DEFAULT_OUTPUT_TOKENS,
  AI_MAX_PROMPT_CHARS,
  AI_MODEL_LABEL,
  AiError,
  runAi,
} from '../../services/ai'
import { useAiKey } from '../../hooks/useAiKey'
import { copyText, cn } from '../../lib/utils'
import { Alert, Badge, Button, InlineError, SectionHead, Spinner } from '../../components/ui/primitives'
import { PromptEditorSheet } from './PromptEditorSheet'

const CATEGORIES = ['all', 'socratic', 'review', 'design', 'wiki', 'meta'] as const

const ANSWER_SIZES = [
  { value: 400, label: 'Short · 400 tokens' },
  { value: AI_DEFAULT_OUTPUT_TOKENS, label: 'Standard · 600 tokens' },
  { value: 900, label: 'Long · 900 tokens' },
]

interface Answer {
  content: string
  tokens?: number
  promptChars: number
}

export function PromptHub() {
  const subject = useActiveSubject()
  const activeWeek = useActiveWeek()
  const toast = useUiStore((state) => state.toast)
  const openSettings = useUiStore((state) => state.openSettings)
  const promptOverrides = useAppStore((state) => state.promptOverrides)
  const aiKey = useAiKey()

  const [weekId, setWeekId] = useState(activeWeek?.id ?? subject.weeks[0]?.id ?? '')
  const [promptId, setPromptId] = useState(PROMPTS[0]?.id ?? '')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('all')
  const [copied, setCopied] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [maxTokens, setMaxTokens] = useState(AI_DEFAULT_OUTPUT_TOKENS)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [answerCopied, setAnswerCopied] = useState(false)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const week = subject.weeks.find((entry) => entry.id === weekId) ?? activeWeek
  const prompts = PROMPTS.filter((prompt) => category === 'all' || prompt.category === category)
  const selected = PROMPTS.find((prompt) => prompt.id === promptId) ?? prompts[0] ?? PROMPTS[0]!
  const template = promptOverrides[selected.id] ?? selected.template
  const edited = Boolean(promptOverrides[selected.id])

  const variables = useMemo(() => {
    const nodes = week
      ? subject.nodes.filter((node) => node.weekId === week.id)
      : subject.nodes
    const kps = nodes.length
      ? nodes
          .map(
            (node) =>
              `• ${node.title}: ${node.knowledgePoints
                .map((kp) => `[P] ${kp.primitive} | [C] ${kp.concept} | [F] ${kp.failureMode}`)
                .join(' · ')}`,
          )
          .join('\n')
      : 'No knowledge nodes created for this week yet.'
    const failedNodes = nodes.filter((node) => node.knowledgePoints.some((kp) => kp.fails > 0))
    const mistakeCards = subject.cards.filter(
      (card) => card.source === 'mistake' && (!week || card.weekId === week.id),
    )
    const mistakeLines = [
      ...failedNodes.map(
        (node) =>
          `• ${node.title}: ${node.knowledgePoints
            .filter((kp) => kp.fails > 0)
            .map((kp) => `${kp.concept || kp.primitive} (${kp.fails} failures)`)
            .join(', ')}`,
      ),
      ...mistakeCards.slice(0, 5).map((card) => `• Card: ${card.front} → ${card.back}`),
    ]
    return {
      track: subject.name,
      week: week ? `Week ${week.weekNumber} · ${week.title}` : 'No week selected',
      weekNumber: week ? String(week.weekNumber) : '—',
      anchor: week?.anchor ?? '',
      kps,
      mistakes: mistakeLines.length
        ? mistakeLines.join('\n')
        : 'No recorded mistakes for this week yet. Use the honest failures from the gate or build block.',
    }
  }, [subject, week])

  let rendered = template
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value)
  }
  const tooLong = rendered.length > AI_MAX_PROMPT_CHARS

  // Switching skill or week makes an old answer stale. Buying a new answer is
  // always an explicit Run.
  const resetRun = () => {
    const controller = abortRef.current
    abortRef.current = null
    controller?.abort()
    setAnswer(null)
    setAnswerCopied(false)
    setRunError('')
  }

  useEffect(() => () => abortRef.current?.abort(), [])

  const copy = async () => {
    const ok = await copyText(rendered)
    if (ok) {
      setCopied(true)
      toast('Prompt copied with this week’s context injected.', 'success')
      window.setTimeout(() => setCopied(false), 1800)
    } else {
      toast('Clipboard permission was denied. Select the prompt text manually.', 'error')
    }
  }

  const run = async () => {
    if (running || tooLong) return
    setRunError('')
    setAnswer(null)
    setAnswerCopied(false)
    const controller = new AbortController()
    abortRef.current = controller
    setRunning(true)
    try {
      const result = await runAi(rendered, { maxTokens, signal: controller.signal })
      setAnswer({ content: result.content, tokens: result.usage?.total_tokens, promptChars: rendered.length })
    } catch (error) {
      if (error instanceof AiError && error.code === 'aborted') {
        if (abortRef.current === controller) setRunError('Run cancelled. Nothing was stored.')
      } else {
        setRunError(error instanceof Error ? error.message : 'The run failed. Try again once.')
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setRunning(false)
    }
  }

  const copyAnswer = async () => {
    if (!answer) return
    const ok = await copyText(answer.content)
    if (ok) {
      setAnswerCopied(true)
      toast('AI answer copied. It is not saved anywhere else.', 'success')
      window.setTimeout(() => setAnswerCopied(false), 1800)
    } else {
      toast('Clipboard permission was denied. Select the answer text manually.', 'error')
    }
  }

  const chooseCategory = (entry: (typeof CATEGORIES)[number]) => {
    setCategory(entry)
    const list = PROMPTS.filter((prompt) => entry === 'all' || prompt.category === entry)
    if (!list.some((prompt) => prompt.id === promptId)) {
      setPromptId(list[0]?.id ?? '')
      resetRun()
    }
  }

  return (
    <div>
      <div className="rounded-xl border border-accent/20 bg-accent-soft px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <Sparkles size={15} className="mt-0.5 flex-none text-accent" aria-hidden />
          <div>
            <p className="text-[12.5px] font-semibold">{SKILL_FORMULA.line1}</p>
            <p className="num muted mt-1 text-[11.5px] leading-relaxed">{SKILL_FORMULA.line2}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div>
          <SectionHead title="Prompt library" eyebrow={`${PROMPTS.length} skills`} />
          <div className="mb-2 flex flex-wrap gap-1">
            {CATEGORIES.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => chooseCategory(entry)}
                aria-pressed={category === entry}
                className={cn(
                  'h-6 rounded-full border px-2 text-[11px] font-medium capitalize transition',
                  category === entry
                    ? 'border-accent/30 bg-accent-soft text-accent-strong'
                    : 'border-line bg-s1 text-t3 hover:border-line-strong hover:text-t2',
                )}
              >
                {entry}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                onClick={() => {
                  setPromptId(prompt.id)
                  resetRun()
                }}
                className={cn(
                  'w-full rounded-xl border px-3 py-2.5 text-left transition',
                  selected.id === prompt.id
                    ? 'border-accent/40 bg-accent-soft'
                    : 'border-line bg-s1 hover:border-line-strong hover:bg-s2',
                )}
                aria-pressed={selected.id === prompt.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] leading-snug font-semibold">{prompt.title}</p>
                  {selected.id === prompt.id ? (
                    <Check size={13} className="mt-0.5 flex-none text-accent" aria-hidden />
                  ) : promptOverrides[prompt.id] ? (
                    <Pencil
                      size={11}
                      className="mt-0.5 flex-none text-t3"
                      aria-label="Edited skill"
                    />
                  ) : null}
                </div>
                <p className="muted mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed">{prompt.description}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {prompt.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="pill !px-1.5 !py-0 !text-[11px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        <section className="card self-start p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="info">{selected.category}</Badge>
                {edited ? <Badge tone="neutral">Edited skill</Badge> : null}
                {selected.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="pill !py-0 !text-[11px]">
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="h1 mt-1.5 text-[1.15rem]">{selected.title}</h2>
              <p className="muted mt-1 text-[12px]">{selected.description}</p>
            </div>
            <div className="flex flex-none items-center gap-1.5">
              <Button size="sm" variant="outline" icon={<Pencil size={13} />} onClick={() => setEditorOpen(true)}>
                Edit skill
              </Button>
              <Button
                variant={aiKey ? 'outline' : 'primary'}
                size="sm"
                icon={copied ? <Check size={13} /> : <Copy size={13} />}
                onClick={copy}
              >
                {copied ? 'Copied' : 'Copy prompt'}
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-t3">
              <span className="flex-none">Inject week</span>
              <select
                className="select h-11 !py-0 !text-[11.5px] sm:!h-8"
                value={week?.id ?? ''}
                onChange={(event) => {
                  setWeekId(event.target.value)
                  resetRun()
                }}
                aria-label="Week context for this prompt"
              >
                {[...subject.weeks]
                  .sort((a, b) => a.weekNumber - b.weekNumber)
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      Week {entry.weekNumber} · {entry.title}
                    </option>
                  ))}
              </select>
            </label>
            <span className="faint flex-none text-[11px]">
              {variables.kps.split('\n').length} KP lines · {variables.mistakes.split('\n').length} mistake lines
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-line bg-s2 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="eyebrow">Rendered prompt</p>
              <span className={cn('text-[11px]', tooLong ? 'text-bad' : 'faint')}>
                {rendered.length.toLocaleString()} / {AI_MAX_PROMPT_CHARS.toLocaleString()} chars
              </span>
            </div>
            <pre className="scroll-thin max-h-[48vh] overflow-y-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-t2">
              {rendered}
            </pre>
          </div>

          <div className="mt-3">
            {!aiKey ? (
              <Alert
                tone="info"
                icon={<Sparkles size={15} />}
                title="Run it without copy-paste"
                action={
                  <Button size="sm" variant="outline" icon={<Settings2 size={13} />} onClick={openSettings}>
                    Add key
                  </Button>
                }
              >
                <p>
                  Optional. Add a Velona key in Settings → AI helper to run this prompt against {AI_MODEL_LABEL}.
                  Copying always works without a key.
                </p>
              </Alert>
            ) : (
              <div className="rounded-xl border border-line bg-s1 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="grid h-7 w-7 place-items-center rounded-lg border border-accent/25 bg-accent-soft text-accent">
                      <Sparkles size={14} aria-hidden />
                    </span>
                    <p className="text-[12px] font-semibold">Run with {AI_MODEL_LABEL}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      className="select h-11 !w-auto !py-0 !text-[11.5px] sm:!h-8"
                      value={maxTokens}
                      onChange={(event) => setMaxTokens(Number(event.target.value))}
                      aria-label="Answer length"
                      disabled={running}
                    >
                      {ANSWER_SIZES.map((size) => (
                        <option key={size.value} value={size.value}>
                          {size.label}
                        </option>
                      ))}
                    </select>
                    {running ? (
                      <Button size="sm" variant="outline" icon={<Square size={12} />} onClick={() => abortRef.current?.abort()}>
                        Cancel
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<Play size={13} />}
                        onClick={run}
                        disabled={tooLong}
                      >
                        Run prompt
                      </Button>
                    )}
                  </div>
                </div>
                <p className="faint mt-1.5 text-[11px] leading-relaxed">
                  Sends this rendered prompt to Velona through <code className="font-mono">/api/chat</code>. The key
                  is stored in this browser and sent to Velona only when you run. One request at a time, no automatic
                  retries.
                </p>
                {tooLong ? (
                  <InlineError>
                    This prompt is over the {AI_MAX_PROMPT_CHARS.toLocaleString()}-character cap. Shorten the week
                    context or edit the skill.
                  </InlineError>
                ) : null}
              </div>
            )}
          </div>

          {running ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-s2 px-3 py-2.5" role="status">
              <Spinner size={14} />
              <p className="muted text-[11.5px]">Waiting for Velona. You can cancel; nothing is stored.</p>
            </div>
          ) : null}

          {runError ? (
            <div className="mt-3">
              <Alert tone="bad" title="Run stopped">
                <p>{runError}</p>
              </Alert>
            </div>
          ) : null}

          {answer ? (
            <div className="mt-3 rounded-xl border border-line bg-s1 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <p className="eyebrow">AI answer</p>
                  <Badge tone="neutral">Not saved</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="faint text-[11px]">
                    {answer.tokens ? `${answer.tokens.toLocaleString()} tokens · ` : ''}
                    {answer.promptChars.toLocaleString()} char prompt
                  </span>
                  <Button
                    size="sm"
                    variant="soft"
                    icon={answerCopied ? <Check size={13} /> : <Copy size={13} />}
                    onClick={copyAnswer}
                  >
                    {answerCopied ? 'Copied' : 'Copy answer'}
                  </Button>
                </div>
              </div>
              <pre className="scroll-thin mt-2 max-h-[48vh] overflow-y-auto text-[12px] leading-relaxed whitespace-pre-wrap text-t2">
                {answer.content}
              </pre>
              <p className="faint mt-2 text-[11px] leading-relaxed">
                Check claims against the docs before you trust them. Copy what matters into notes or cards.
              </p>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="soft"
              icon={<FileJson size={13} />}
              onClick={() => {
                void copy()
                toast('Now open Deck → Import JSON to paste the generated cards.', 'info', 5000)
              }}
            >
              Copy for card generation
            </Button>
            <p className="faint text-[11.5px] leading-relaxed">
              Copying stays on this device. Running sends only the rendered prompt above.
            </p>
          </div>
        </section>
      </div>

      {editorOpen ? (
        <PromptEditorSheet
          prompt={selected}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false)
            resetRun()
          }}
        />
      ) : null}
    </div>
  )
}
