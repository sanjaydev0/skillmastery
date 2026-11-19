import { useState } from 'react'
import { NotebookPen } from 'lucide-react'
import type { Week } from '../../types/schema'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { conceptsForWeek } from '../../engine/concepts'
import { Button, SectionHead } from '../../components/ui/primitives'

/**
 * The weekly review. It restates the record in two honest lists, then asks for
 * one sentence for next week. Nothing is scored, and nothing is required: an
 * empty note is a valid answer.
 */
export function WeekReviewCard({ week }: { week: Week }) {
  const subject = useActiveSubject()
  const saveWeekReview = useAppStore((state) => state.saveWeekReview)
  const toast = useUiStore((state) => state.toast)
  const [note, setNote] = useState(week.review?.note ?? '')

  const daysProved = subject.dayProofs.filter(
    (proof) => proof.weekId === week.id && proof.outcome === 'cold',
  ).length
  const concepts = conceptsForWeek(subject.concepts, week.weekNumber)
  const conceptsProved = concepts.filter(
    (concept) => concept.checks.length > 0 && concept.checks.some((check) => check.outcome === 'cold'),
  ).length
  const tasksDone = week.checklist.filter((item) => item.done).length
  const tasksLeft = week.checklist.length - tasksDone
  const conceptsLeft = concepts.length - conceptsProved

  const save = () => {
    const result = saveWeekReview(week.id, note)
    toast(result.message, result.ok ? 'success' : 'error', 3200)
  }

  return (
    <section className="card mt-4 p-3.5" aria-label={`Week ${week.weekNumber} review`}>
      <SectionHead
        title="The weekly review"
        eyebrow={`Week ${week.weekNumber}`}
        action={
          <span className="flex items-center gap-1.5">
            <NotebookPen size={13} className="text-accent" aria-hidden />
            <span className="faint text-[11px]">One minute</span>
          </span>
        }
      />

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-s1 p-2.5">
          <p className="eyebrow">What I proved</p>
          <ul className="mt-1 space-y-1 text-[12px] leading-snug">
            <li>
              {daysProved} of 7 days without notes
            </li>
            <li>
              {conceptsProved} of {concepts.length} concepts recalled cold
            </li>
            <li>{week.gate.passedAt ? 'Checkpoint cleared' : 'Checkpoint not cleared yet'}</li>
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-s1 p-2.5">
          <p className="eyebrow">What is still due</p>
          <ul className="mt-1 space-y-1 text-[12px] leading-snug">
            <li>{tasksLeft === 0 ? 'No tasks left' : `${tasksLeft} task${tasksLeft === 1 ? '' : 's'} left`}</li>
            <li>
              {conceptsLeft === 0
                ? 'Every concept has a proof'
                : `${conceptsLeft} concept${conceptsLeft === 1 ? '' : 's'} without a proof`}
            </li>
            <li>{week.gate.passedAt ? 'Nothing waiting at the checkpoint' : 'Four checkpoint questions to answer'}</li>
          </ul>
        </div>
      </div>

      <label className="mt-2.5 block">
        <span className="faint text-[11px]">One sentence for next week</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={240}
          placeholder="What was hard, and what will you do about it?"
          className="mt-1 w-full rounded-lg border border-line bg-s1 px-2.5 py-2 text-[12px] outline-none placeholder:text-t3"
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="faint text-[11px]">
          {week.review ? 'Saved. Editing it replaces the sentence, not the proof.' : 'Optional. A blank note is an answer too.'}
        </p>
        <Button variant="soft" size="sm" onClick={save}>
          {week.review ? 'Update the note' : 'Save the note'}
        </Button>
      </div>
    </section>
  )
}
