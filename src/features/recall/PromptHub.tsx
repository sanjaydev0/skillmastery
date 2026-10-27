import { useMemo, useState } from 'react'
import { Check, Copy, FileJson, Sparkles } from 'lucide-react'
import { PROMPTS, SKILL_FORMULA } from '../../data/prompts'
import { useActiveSubject, useActiveWeek } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { copyText, cn } from '../../lib/utils'
import { Badge, Button, SectionHead } from '../../components/ui/primitives'

const CATEGORIES = ['all', 'socratic', 'review', 'design', 'wiki', 'meta'] as const

export function PromptHub() {
  const subject = useActiveSubject()
  const activeWeek = useActiveWeek()
  const toast = useUiStore((state) => state.toast)
  const [weekId, setWeekId] = useState(activeWeek?.id ?? subject.weeks[0]?.id ?? '')
  const [promptId, setPromptId] = useState(PROMPTS[0]?.id ?? '')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('all')
  const [copied, setCopied] = useState(false)

  const week = subject.weeks.find((entry) => entry.id === weekId) ?? activeWeek
  const prompts = PROMPTS.filter((prompt) => category === 'all' || prompt.category === category)
  const selected = PROMPTS.find((prompt) => prompt.id === promptId) ?? prompts[0] ?? PROMPTS[0]!

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

  const rendered = useMemo(() => {
    let output = selected.template
    for (const [key, value] of Object.entries(variables)) {
      output = output.replaceAll(`{{${key}}}`, value)
    }
    return output
  }, [selected, variables])

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

  return (
    <div>
      <div className="rounded-xl border border-accent/20 bg-accent-soft px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <Sparkles size={15} className="mt-0.5 flex-none text-accent" aria-hidden />
          <div>
            <p className="text-[12.5px] font-semibold">{SKILL_FORMULA.line1}</p>
            <p className="num muted mt-1 text-[10.5px] leading-relaxed">{SKILL_FORMULA.line2}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div>
          <SectionHead title="Prompt library" eyebrow={`${PROMPTS.length} templates`} />
          <div className="mb-2 flex flex-wrap gap-1">
            {CATEGORIES.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setCategory(entry)}
                aria-pressed={category === entry}
                className={cn(
                  'h-6 rounded-full border px-2 text-[10px] font-medium capitalize transition',
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
                onClick={() => setPromptId(prompt.id)}
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
                  {selected.id === prompt.id ? <Check size={13} className="mt-0.5 flex-none text-accent" aria-hidden /> : null}
                </div>
                <p className="muted mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed">{prompt.description}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {prompt.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="pill !px-1.5 !py-0 !text-[9px]">
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
                {selected.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="pill !py-0 !text-[9.5px]">{tag}</span>
                ))}
              </div>
              <h2 className="h1 mt-1.5 text-[1.15rem]">{selected.title}</h2>
              <p className="muted mt-1 text-[12px]">{selected.description}</p>
            </div>
            <Button variant="primary" size="sm" icon={copied ? <Check size={13} /> : <Copy size={13} />} onClick={copy}>
              {copied ? 'Copied' : 'Copy prompt'}
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-t3">
              <span className="flex-none">Inject week</span>
              <select
                className="select h-11 !py-0 !text-[11.5px] sm:!h-8"
                value={week?.id ?? ''}
                onChange={(event) => setWeekId(event.target.value)}
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
            <span className="faint flex-none text-[10px]">
              {variables.kps.split('\n').length} KP lines · {variables.mistakes.split('\n').length} mistake lines
            </span>
          </div>

          <div className="mt-3 rounded-xl border border-line bg-s2 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="eyebrow">Rendered prompt</p>
              <span className="faint text-[9.5px]">{rendered.length.toLocaleString()} chars · variables injected</span>
            </div>
            <pre className="scroll-thin max-h-[48vh] overflow-y-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-t2">
              {rendered}
            </pre>
          </div>

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
            <p className="faint text-[10.5px]">
              Never paste secrets into a prompt. This app makes no network request.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
