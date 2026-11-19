import { useState } from 'react'
import { ArrowRight, BookMarked } from 'lucide-react'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { conceptBadge } from '../../engine/concepts'
import { PROOF_INTERVALS, proofLabel } from '../../engine/proofs'
import { navigate } from '../../lib/router'
import { formatShortDate, relativeDays } from '../../lib/dates'
import { Sheet } from '../../components/ui/Sheet'
import { Button, ConceptBadgePill, SectionHead } from '../../components/ui/primitives'

/**
 * One concept: the definition the route teaches, the mistake it prevents, the
 * proof history, and the three answers that schedule the next review.
 */
export function ConceptSheet({ conceptId, onClose }: { conceptId: string; onClose: () => void }) {
  const subject = useActiveSubject()
  const checkConcept = useAppStore((state) => state.checkConcept)
  const toast = useUiStore((state) => state.toast)

  const concept = subject.concepts.find((entry) => entry.id === conceptId)

  if (!concept) {
    return (
      <Sheet title="Concept" eyebrow="Not found" onClose={onClose}>
        <p className="muted text-[12.5px]">
          That concept is not in the active track. It may have been deleted, or it belongs to another track.
        </p>
      </Sheet>
    )
  }

  const week = subject.weeks.find((entry) => entry.id === concept.weekId)
  const badge = conceptBadge(concept)
  const scheduled = concept.dueAt > 0

  const answer = (outcome: 'cold' | 'warm' | 'failed') => {
    const result = checkConcept(concept.id, outcome)
    toast(result.message, result.ok ? 'success' : 'error', 3800)
  }

  return (
    <Sheet
      title={concept.term}
      eyebrow={week ? `Week ${week.weekNumber} · ${subject.shortName}` : subject.shortName}
      onClose={onClose}
      headerExtra={<ConceptBadgePill status={badge} />}
      footer={
        <Button variant="soft" onClick={onClose}>
          Close
        </Button>
      }
    >
      {concept.definition ? (
        <section>
          <SectionHead title="What it means" eyebrow="From the route" />
          <p className="text-[12.5px] leading-relaxed text-t2">{concept.definition}</p>
        </section>
      ) : null}

      {concept.failureMode ? (
        <section className="mt-4">
          <SectionHead title="The mistake it prevents" eyebrow="Why this concept exists" />
          <p className="text-[12.5px] leading-relaxed text-t2">{concept.failureMode}</p>
        </section>
      ) : null}

      <section className="mt-4">
        <SectionHead
          title="Review it now"
          eyebrow={concept.dueAt > 0 ? `due ${relativeDays(concept.dueAt)}` : 'not scheduled yet'}
        />
        <p className="muted mb-2 text-[11.5px]">
          Answer honestly. The schedule follows your answer, nothing else.
        </p>
        <div className="grid gap-1.5 sm:grid-cols-3">
          <Button variant="primary" onClick={() => answer('cold')}>
            Recalled
          </Button>
          <Button variant="outline" onClick={() => answer('warm')}>
            Shaky
          </Button>
          <Button variant="outline" onClick={() => answer('failed')}>
            No idea
          </Button>
        </div>
        <p className="faint mt-2 text-[11px]">
          {badge === 'new'
            ? 'A first honest recall schedules tomorrow’s review.'
            : scheduled
              ? `Next review in ${PROOF_INTERVALS[Math.min(concept.step, PROOF_INTERVALS.length - 1)]} days.`
              : 'Review tomorrow.'}
        </p>
      </section>

      <section className="mt-4">
        <SectionHead title="Proof history" eyebrow={`${concept.checks.length} recorded`} />
        {concept.checks.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-line bg-s1 px-2.5 py-2">
            <BookMarked size={13} className="flex-none text-t3" aria-hidden />
            <p className="faint text-[11.5px]">Not proved yet. The first review starts the record.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {[...concept.checks].reverse().map((check, index) => (
              <div
                key={`${check.at}-${index}`}
                className="flex items-start justify-between gap-2 rounded-lg border border-line bg-s1 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[11.5px] font-medium">{proofLabel(check.outcome)}</p>
                  <p className="faint num mt-0.5 text-[11px]">{formatShortDate(check.at)}</p>
                  {check.note ? <p className="muted mt-1 text-[11.5px]">{check.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {week ? (
        <section className="mt-4">
          <SectionHead title="Where it lives" eyebrow="The route" />
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate(`#/plan/${week.id}`)
            }}
            className="flex w-full items-center gap-2 rounded-lg border border-line bg-s1 px-2.5 py-2 text-left transition hover:border-line-strong"
          >
            <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium">
              Week {week.weekNumber} · {week.title}
            </span>
            <ArrowRight size={12} className="flex-none text-t3" aria-hidden />
          </button>
        </section>
      ) : null}

      <NoteEditor key={concept.id} conceptId={concept.id} term={concept.term} initial={concept.notes ?? ''} />
    </Sheet>
  )
}

/** The optional note. Keyed by concept, so a new record starts blank instead of
 * carrying the last note across. */
function NoteEditor({
  conceptId,
  term,
  initial,
}: {
  conceptId: string
  term: string
  initial: string
}) {
  const setConceptNote = useAppStore((state) => state.setConceptNote)
  const [note, setNote] = useState(initial)

  return (
    <section className="mt-4">
      <SectionHead title="Your note" eyebrow="Optional" />
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onBlur={() => setConceptNote(conceptId, note)}
        rows={3}
        aria-label={`Note about ${term}`}
        placeholder="One line for future you"
        className="w-full rounded-xl border border-line bg-s1 px-3 py-2 text-[12.5px] outline-none placeholder:text-t3"
      />
    </section>
  )
}
