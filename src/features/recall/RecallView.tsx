import { useState } from 'react'
import { ArrowRight, CalendarCheck2 } from 'lucide-react'
import { useActiveSubject } from '../../store/AppStore'
import { dueCards } from '../../engine/srs'
import { dueConcepts } from '../../engine/concepts'
import { cn } from '../../lib/utils'
import { Button, Tabs } from '../../components/ui/primitives'
import { SrsPanel } from './SrsPanel'
import { DeckPanel } from './DeckPanel'
import { PromptHub } from './PromptHub'
import { ConceptSheet } from '../concepts/ConceptSheet'

type RecallTab = 'study' | 'deck' | 'prompts'

export function RecallView() {
  const subject = useActiveSubject()
  const [tab, setTab] = useState<RecallTab>('study')
  const [openConcept, setOpenConcept] = useState<string | null>(null)
  const due = dueCards(subject.cards).length
  const dueList = dueConcepts(subject.concepts)
  const fresh = subject.cards.filter((card) => card.dueAt === 0).length
  const lapses = subject.cards.reduce((sum, card) => sum + card.lapses, 0)
  const dueCardList = dueCards(subject.cards)

  return (
    <div>
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Recall, not recognition</p>
          <h1 className="h1 mt-1">Practice</h1>
          <p className="muted mt-1 max-w-2xl text-[13px]">
            The SRS queue, the Anki-compatible deck, and the prompt hub. Everything runs against local state.
          </p>
        </div>
        <Tabs
          items={[
            { id: 'study', label: 'Study', count: due },
            { id: 'deck', label: 'Deck', count: subject.cards.length },
            { id: 'prompts', label: 'Prompts' },
          ]}
          value={tab}
          onChange={(value) => setTab(value as RecallTab)}
        />
      </header>

      <section className="ledger mt-4" aria-label="Practice totals">
        <RecallStat label="Due today" value={due + dueList.length} tone={due + dueList.length ? 'accent' : 'neutral'} />
        <RecallStat label="New cards" value={fresh} tone={fresh ? 'info' : 'neutral'} />
        <RecallStat label="Deck size" value={subject.cards.length} />
        <RecallStat label="Total lapses" value={lapses} tone={lapses ? 'bad' : 'neutral'} />
      </section>

      {dueList.length > 0 || dueCardList.length > 0 ? (
        <section className="card mt-4 p-3.5" aria-labelledby="due-today-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="due-today-heading" className="h2 flex items-center gap-2 text-[15px]">
              <CalendarCheck2 size={15} className="text-accent" aria-hidden />
              Due today
            </h2>
            <span className="faint text-[11.5px]">
              {dueList.length} concept{dueList.length === 1 ? '' : 's'}, {dueCardList.length} card
              {dueCardList.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="muted mt-1 text-[11.5px]">
            These came back on the schedule your own answers set. Answer honestly; the next date follows.
          </p>

          {dueList.length > 0 ? (
            <div className="mt-2.5 space-y-1.5">
              {dueList.slice(0, 8).map((concept) => (
                <div
                  key={concept.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line bg-s1 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium">{concept.term}</p>
                    <p className="faint text-[11px]">Week {concept.weekNumber} concept</p>
                  </div>
                  <Button size="sm" variant="soft" onClick={() => setOpenConcept(concept.id)}>
                    Review
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {dueCardList.length > 0 && dueList.length > 0 ? (
            <div className="mt-3 border-t border-line pt-2">
              <p className="eyebrow">Cards</p>
            </div>
          ) : null}

          {dueCardList.length > 0 ? (
            <div className="mt-1.5 space-y-1">
              {dueCardList.slice(0, 5).map((card) => (
                <p key={card.id} className="truncate text-[11.5px] text-t2">
                  {card.front}
                </p>
              ))}
              <button type="button" className="link text-[11.5px]" onClick={() => setTab('study')}>
                Open the card queue <ArrowRight size={11} className="inline" aria-hidden />
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="mt-4">
        {tab === 'study' ? <SrsPanel /> : null}
        {tab === 'deck' ? <DeckPanel /> : null}
        {tab === 'prompts' ? <PromptHub /> : null}
      </div>

      {openConcept ? (
        <ConceptSheet conceptId={openConcept} onClose={() => setOpenConcept(null)} />
      ) : null}
    </div>
  )
}

function RecallStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'accent' | 'info' | 'bad'
}) {
  const colour =
    tone === 'accent' ? 'text-accent' : tone === 'info' ? 'text-info' : tone === 'bad' ? 'text-bad' : 'text-t1'
  return (
    <div>
      <p className="eyebrow truncate">{label}</p>
      <p className={cn('num mt-1 text-[19px] leading-none font-semibold', colour)}>{value}</p>
    </div>
  )
}
