import { useState } from 'react'
import type { FormEvent } from 'react'
import { ClipboardPaste, FileJson } from 'lucide-react'
import type { CardSource } from '../../types/schema'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { Sheet } from '../../components/ui/Sheet'
import { Button, Field, InlineError } from '../../components/ui/primitives'

interface IncomingCard {
  front?: unknown
  back?: unknown
  tags?: unknown
  source?: unknown
  weekId?: unknown
  nodeId?: unknown
}

export function ImportCardsSheet({ onClose }: { onClose: () => void }) {
  const subject = useActiveSubject()
  const addCard = useAppStore((state) => state.addCard)
  const toast = useUiStore((state) => state.toast)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    let parsed: unknown
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/, '')
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      setError('That is not valid JSON. Remove commentary and fences, then try again.')
      return
    }
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { cards?: unknown }).cards)
        ? (parsed as { cards: unknown[] }).cards
        : null
    if (!list) {
      setError('Expected a JSON array, or an object with a “cards” array.')
      return
    }
    let imported = 0
    let skipped = 0
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') {
        skipped++
        continue
      }
      const card = raw as IncomingCard
      if (typeof card.front !== 'string' || typeof card.back !== 'string') {
        skipped++
        continue
      }
      const tags = Array.isArray(card.tags)
        ? card.tags.filter((tag): tag is string => typeof tag === 'string').join(', ')
        : typeof card.tags === 'string'
          ? card.tags
          : ''
      const source: CardSource = card.source === 'mistake' ? 'mistake' : 'core'
      const weekId =
        typeof card.weekId === 'string' && subject.weeks.some((week) => week.id === card.weekId)
          ? card.weekId
          : undefined
      const nodeId =
        typeof card.nodeId === 'string' && subject.nodes.some((node) => node.id === card.nodeId)
          ? card.nodeId
          : undefined
      const result = addCard({ front: card.front, back: card.back, tags, source, weekId, nodeId })
      if (result.ok) imported++
      else skipped++
    }
    if (imported === 0) {
      setError('No cards were imported. Each card needs a non-empty front and back.')
      return
    }
    toast(
      `Imported ${imported} card${imported === 1 ? '' : 's'}${skipped ? ` · skipped ${skipped}` : ''}.`,
      'success',
      5200,
    )
    onClose()
  }

  return (
    <Sheet
      title="Import AI-generated cards"
      eyebrow="Paste JSON · validated locally before import"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="import-cards-form" icon={<FileJson size={14} />}>
            Import cards
          </Button>
        </>
      }
    >
      <form id="import-cards-form" onSubmit={submit} className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl border border-accent/25 bg-accent-soft p-3">
          <ClipboardPaste size={15} className="mt-0.5 flex-none text-accent" aria-hidden />
          <p className="text-[12px] leading-relaxed text-t2">
            No network call is made. The prompt hub’s “Anki card generator” returns this exact shape. Cards go
            into <span className="font-medium text-t1">{subject.shortName}</span> and are due immediately.
          </p>
        </div>
        <Field label="JSON payload" hint="Arrays or { cards: [...] } are accepted. Invalid cards are skipped.">
          <textarea
            className="textarea min-h-[220px] font-mono !text-[11.5px]"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={`{
  "cards": [
    {
      "front": "Why does a cursor page not drift?",
      "back": "It keys off a stable ordering position, so inserts and deletes do not shift the window.",
      "tags": ["api", "pagination"],
      "source": "core"
    }
  ]
}`}
            data-autofocus
            spellCheck={false}
          />
        </Field>
        {error ? <InlineError>{error}</InlineError> : null}
        <div className="rounded-xl border border-line bg-s2 p-3">
          <p className="eyebrow mb-1.5">Contract</p>
          <pre className="overflow-x-auto font-mono text-[10.5px] leading-relaxed text-t2">{`{
  "cards": [{
    "front": "question",         // required
    "back": "answer",            // required
    "tags": ["tag"],             // optional
    "source": "core" | "mistake",
    "weekId": "fl-w3",           // optional, must exist
    "nodeId": "fl-w3-n1"         // optional, must exist
  }]
}`}</pre>
        </div>
      </form>
    </Sheet>
  )
}
