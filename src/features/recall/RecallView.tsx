import { useState } from 'react'
import { BrainCircuit, Clock3, Layers, TrendingDown } from 'lucide-react'
import { useActiveSubject } from '../../store/AppStore'
import { dueCards } from '../../engine/srs'
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
          <p className="eyebrow">Retrieval, not recognition</p>
          <h1 className="h1 mt-1">Recall</h1>
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

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <RecallStat icon={<Clock3 size={14} />} label="Due today" value={due} tone={due ? 'accent' : 'neutral'} />
        <RecallStat icon={<Layers size={14} />} label="New cards" value={fresh} tone={fresh ? 'info' : 'neutral'} />
        <RecallStat icon={<BrainCircuit size={14} />} label="Deck size" value={subject.cards.length} />
        <RecallStat icon={<TrendingDown size={14} />} label="Total lapses" value={lapses} tone={lapses ? 'bad' : 'neutral'} />
      </div>

      <div className="mt-4">
        {tab === 'study' ? <SrsPanel /> : null}
        {tab === 'deck' ? <DeckPanel /> : null}
        {tab === 'prompts' ? <PromptHub /> : null}
      </div>
    </div>
  )
}

function RecallStat({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone?: 'neutral' | 'accent' | 'info' | 'bad'
}) {
  const colour =
    tone === 'accent'
      ? 'bg-accent-soft text-accent'
      : tone === 'info'
        ? 'bg-info-soft text-info'
        : tone === 'bad'
          ? 'bg-bad-soft text-bad'
          : 'bg-s2 text-t2'
  return (
    <div className="card flex items-center gap-2.5 px-3 py-2.5">
      <span className={`grid h-7 w-7 flex-none place-items-center rounded-lg ${colour}`} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="faint truncate text-[10px] tracking-wide uppercase">{label}</p>
        <p className="num text-[15px] font-semibold leading-tight">{value}</p>
      </div>
    </div>
  )
}
