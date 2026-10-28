import { useState } from 'react'
import { useActiveSubject } from '../../store/AppStore'
import { dueCards } from '../../engine/srs'
import { cn } from '../../lib/utils'
import { Tabs } from '../../components/ui/primitives'
import { SrsPanel } from './SrsPanel'
import { DeckPanel } from './DeckPanel'
import { PromptHub } from './PromptHub'

type RecallTab = 'study' | 'deck' | 'prompts'

export function RecallView() {
  const subject = useActiveSubject()
  const [tab, setTab] = useState<RecallTab>('study')
  const due = dueCards(subject.cards).length
  const fresh = subject.cards.filter((card) => card.dueAt === 0).length
  const lapses = subject.cards.reduce((sum, card) => sum + card.lapses, 0)

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
        <RecallStat label="Due today" value={due} tone={due ? 'accent' : 'neutral'} />
        <RecallStat label="New cards" value={fresh} tone={fresh ? 'info' : 'neutral'} />
        <RecallStat label="Deck size" value={subject.cards.length} />
        <RecallStat label="Total lapses" value={lapses} tone={lapses ? 'bad' : 'neutral'} />
      </section>

      <div className="mt-4">
        {tab === 'study' ? <SrsPanel /> : null}
        {tab === 'deck' ? <DeckPanel /> : null}
        {tab === 'prompts' ? <PromptHub /> : null}
      </div>
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
