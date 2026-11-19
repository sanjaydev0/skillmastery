import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import type { ChecklistItem, DayProof, DaySlot, ProofOutcome, Week } from '../../types/schema'
import { useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { proofLabel } from '../../engine/proofs'
import { cn } from '../../lib/utils'

/**
 * The daily proof. Three honest answers, one optional line, and no score.
 * A cold proof is the only day evidence that counts as proved.
 */
export function DayProofCard({
  week,
  slot,
  items,
  proof,
}: {
  week: Week
  slot: DaySlot
  items: ChecklistItem[]
  proof?: DayProof
}) {
  const saveDayProof = useAppStore((state) => state.saveDayProof)
  const clearDayProof = useAppStore((state) => state.clearDayProof)
  const toast = useUiStore((state) => state.toast)
  const [note, setNote] = useState(proof?.note ?? '')

  const stale =
    proof !== undefined &&
    items.some((item) => item.done && item.doneAt !== undefined && item.doneAt > proof.at)

  const answer = (outcome: ProofOutcome) => {
    const result = saveDayProof(week.id, slot, outcome, note)
    toast(result.message, result.ok ? 'success' : 'error', 3600)
  }

  return (
    <section className="card p-3.5" aria-label="Today's proof">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="eyebrow">Today's proof</p>
          <h2 className="h2 mt-0.5 flex items-center gap-2 text-[15px]">
            <ShieldCheck size={15} className="text-accent" aria-hidden />
            Can you do it without notes?
          </h2>
        </div>
        {proof ? (
          <span className="badge badge-sm flex-none">{proofLabel(proof.outcome)}</span>
        ) : null}
      </div>

      <p className="muted mt-1.5 text-[11.5px] leading-relaxed">
        Close the docs and do one thing from today&apos;s card. Then answer. The answer is the record, not a score.
      </p>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {(['cold', 'warm', 'failed'] as const).map((outcome) => (
          <button
            key={outcome}
            type="button"
            aria-pressed={proof?.outcome === outcome}
            onClick={() => answer(outcome)}
            className={cn(
              'rounded-lg border px-1.5 py-1.5 text-[11.5px] font-medium transition',
              proof?.outcome === outcome
                ? 'border-accent/50 bg-accent-soft text-accent-strong'
                : 'border-line bg-s1 hover:border-line-strong',
            )}
          >
            {proofLabel(outcome)}
          </button>
        ))}
      </div>

      <label className="mt-2 block">
        <span className="faint text-[11px]">One line, optional</span>
        <input
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            if (proof) saveDayProof(week.id, slot, proof.outcome, note)
          }}
          maxLength={200}
          placeholder="What tripped you up?"
          className="mt-1 w-full rounded-lg border border-line bg-s1 px-2.5 py-1.5 text-[12px] outline-none placeholder:text-t3"
        />
      </label>

      {stale ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warn/30 bg-warn-soft px-2.5 py-1.5">
          <p className="text-[11.5px] text-warn">The tasks changed since you proved this.</p>
          <button
            type="button"
            className="link text-[11.5px]"
            onClick={() => {
              clearDayProof(week.id, slot)
              setNote('')
            }}
          >
            Prove it again
          </button>
        </div>
      ) : proof ? (
        <p className="faint mt-2 text-[11px]">
          Saved. Unchecking a task later does not erase this proof; changing the day does.
        </p>
      ) : null}
    </section>
  )
}
