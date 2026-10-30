import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
import type { Subject, Week } from '../../types/schema'
import { useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { useAiKey } from '../../hooks/useAiKey'
import { blueprintFor } from '../../data/curriculum/blueprint'
import { buildWeekBrief } from '../../engine/generation'
import { AiError } from '../../services/ai'
import { cancelGeneration, generateWeekFor, type GenerateWeekResult } from '../../services/generateWeek'
import { Alert, Badge, Button, InlineError, Spinner } from '../../components/ui/primitives'

/**
 * The generation surface for one week.
 *
 * The panel never saves on its own. A generated week is a draft: the learner
 * reads it, sees what the checker found, and presses Save. Week 1 is authored,
 * so it says so instead of offering a rewrite.
 */
export function GenerateWeekPanel({
  subject,
  week,
  hasCards,
}: {
  subject: Subject
  week: Week
  hasCards: boolean
}) {
  const journey = useAppStore((state) => state.journey)
  const planner = useAppStore((state) => state.planner)
  const saveDayPlans = useAppStore((state) => state.saveDayPlans)
  const toast = useUiStore((state) => state.toast)
  const openSettings = useUiStore((state) => state.openSettings)
  const aiKey = useAiKey()

  const [phase, setPhase] = useState<'idle' | 'confirm' | 'running' | 'review'>('idle')
  const [result, setResult] = useState<GenerateWeekResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const blueprint = blueprintFor(subject.id, week.weekNumber)
  if (!blueprint) return null

  const blocked = result !== null && result.issues.length > 0

  const run = async () => {
    setError(null)
    setPhase('running')
    try {
      const brief = buildWeekBrief(subject, week, journey, {
        active: planner.weeklyActiveMinutes,
        passive: planner.weeklyPassiveMinutes,
      })
      setResult(await generateWeekFor(brief))
      setPhase('review')
    } catch (caught) {
      if (caught instanceof AiError && caught.code === 'aborted') {
        setPhase('idle')
        return
      }
      setError(caught instanceof Error ? caught.message : 'The week could not be written.')
      setPhase('idle')
    }
  }

  const cancel = () => {
    cancelGeneration()
    setResult(null)
    setPhase('idle')
  }

  const save = () => {
    if (!result || blocked) return
    const outcome = saveDayPlans(week.id, result.plans, 'ai')
    toast(outcome.message, outcome.ok ? 'success' : 'error', 6000)
    if (outcome.ok) {
      setResult(null)
      setPhase('idle')
    }
  }

  return (
    <section className="card mt-2.5 p-3.5" aria-labelledby="write-week-heading">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-1.5">
            <Sparkles size={11} aria-hidden /> Day cards
          </p>
          <h3 id="write-week-heading" className="mt-0.5 text-[13px] font-semibold">
            {week.weekNumber === 1 ? 'Written by hand' : hasCards ? 'Rewrite this week' : 'Write this week'}
          </h3>
        </div>
        <Badge tone={week.weekNumber === 1 ? 'good' : 'neutral'}>
          {week.weekNumber === 1 ? 'Authored' : hasCards ? 'Seven cards saved' : 'No cards yet'}
        </Badge>
      </div>

      {week.weekNumber === 1 ? (
        <p className="muted mt-1.5 text-[12px] leading-relaxed">
          Week 1 is authored, not generated. Seven lessons explain the first Dart program, the money rule and the
          first push. Open a day below to read it.
        </p>
      ) : (
        <>
          <p className="muted mt-1.5 text-[12px] leading-relaxed">
            The writer reads this week's blueprint, your earlier checkpoints and the failure modes you already met. It
            returns seven draft cards. Nothing is saved until you read them and press Save.
          </p>

          {error ? <InlineError>{error}</InlineError> : null}
          {!aiKey && phase !== 'review' ? (
            <p className="faint mt-1.5 text-[11.5px]">
              Add a Velona key in Settings to write a week. The key stays on this device.
            </p>
          ) : null}

          {phase === 'idle' ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {hasCards ? (
                <Button variant="outline" size="sm" icon={<Sparkles size={13} />} onClick={() => setPhase('confirm')}>
                  Replace the seven cards
                </Button>
              ) : (
                <Button
                  variant="soft"
                  size="sm"
                  icon={<Sparkles size={13} />}
                  disabled={!aiKey}
                  onClick={() => void run()}
                >
                  Write the seven cards
                </Button>
              )}
              {!aiKey ? (
                <Button variant="ghost" size="sm" onClick={openSettings}>
                  Open Settings
                </Button>
              ) : null}
            </div>
          ) : null}

          {phase === 'confirm' ? (
            <div className="mt-2 rounded-lg border border-warn/30 bg-warn-soft p-2.5">
              <p className="text-[12px] font-medium">Replace the saved cards with a new draft?</p>
              <p className="faint mt-0.5 text-[11.5px]">
                The checklists and your checked tasks stay. Only the seven day cards change, after you save.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button variant="primary" size="sm" onClick={() => void run()}>
                  Write a new draft
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPhase('idle')}>
                  Keep the current cards
                </Button>
              </div>
            </div>
          ) : null}

          {phase === 'running' ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-s2 px-2.5 py-2">
              <Spinner size={14} />
              <span className="text-[12px]">Writing seven cards. This can take a few minutes.</span>
              <Button variant="ghost" size="sm" onClick={cancel}>
                Cancel
              </Button>
            </div>
          ) : null}

          {phase === 'review' && result ? (
            <div className="mt-2">
              <p className="text-[12px] font-medium">
                Draft ready: {result.plans.length} cards, {result.plans.reduce((total, plan) => total + plan.estMinutes, 0)}{' '}
                minutes planned.
              </p>
              <ul className="mt-1.5 divide-y divide-line rounded-lg border border-line">
                {result.plans.map((plan) => (
                  <li key={plan.day} className="flex items-start justify-between gap-2 px-2.5 py-1.5">
                    <span className="min-w-0 text-[11.5px]">
                      <span className="num text-t3">Day {plan.day}</span> {plan.title}
                    </span>
                    <span className="faint num flex-none text-[11px]">{plan.estMinutes} min</span>
                  </li>
                ))}
              </ul>

              {blocked ? (
                <div className="mt-2">
                  <Alert tone="bad" title="Fix these before saving">
                    <ul className="list-disc space-y-0.5 pl-4 text-[11.5px]">
                      {result.issues.slice(0, 8).map((issue) => (
                        <li key={`${issue.field}-${issue.code}-${issue.message}`}>
                          {issue.field}: {issue.message}
                        </li>
                      ))}
                    </ul>
                  </Alert>
                </div>
              ) : (
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-good">
                  <CheckCircle2 size={13} aria-hidden /> All seven cards meet the prose standard.
                </p>
              )}

              {result.flags.length > 0 || result.gaps.length > 0 ? (
                <div className="mt-2 rounded-lg border border-warn/30 bg-warn-soft p-2.5">
                  <p className="flex items-center gap-1.5 text-[12px] font-medium">
                    <AlertTriangle size={13} aria-hidden /> Check these by eye
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11.5px]">
                    {[...result.flags, ...result.gaps].map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button variant="primary" size="sm" disabled={blocked} onClick={save}>
                  Save the seven cards
                </Button>
                <Button variant="ghost" size="sm" onClick={cancel}>
                  Discard the draft
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
