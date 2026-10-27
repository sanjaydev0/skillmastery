import { useState } from 'react'
import type { FormEvent } from 'react'
import type { CardSource, Flashcard } from '../../types/schema'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { sanitiseTags } from '../../lib/utils'
import { Sheet } from '../../components/ui/Sheet'
import { Button, Field, InlineError } from '../../components/ui/primitives'

export function CardFormSheet({ card, onClose }: { card?: Flashcard; onClose: () => void }) {
  const subject = useActiveSubject()
  const addCard = useAppStore((state) => state.addCard)
  const updateCard = useAppStore((state) => state.updateCard)
  const toast = useUiStore((state) => state.toast)

  const [front, setFront] = useState(card?.front ?? '')
  const [back, setBack] = useState(card?.back ?? '')
  const [tags, setTags] = useState(card?.tags.join(', ') ?? '')
  const [source, setSource] = useState<CardSource>(card?.source ?? 'core')
  const [weekId, setWeekId] = useState(card?.weekId ?? '')
  const [nodeId, setNodeId] = useState(card?.nodeId ?? '')
  const [error, setError] = useState('')

  const weekNodes = subject.nodes.filter((node) => !weekId || node.weekId === weekId)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!front.trim() || !back.trim()) {
      setError('Front and back are both required.')
      return
    }
    if (card) {
      updateCard(card.id, {
        front: front.trim(),
        back: back.trim(),
        tags: sanitiseTags(tags),
        source,
        weekId: weekId || undefined,
        nodeId: nodeId || undefined,
      })
      toast('Card updated.', 'success')
      onClose()
      return
    }
    const result = addCard({
      front,
      back,
      tags,
      source,
      weekId: weekId || undefined,
      nodeId: nodeId || undefined,
    })
    if (!result.ok) {
      setError(result.message)
      return
    }
    toast(result.message, 'success')
    onClose()
  }

  return (
    <Sheet
      title={card ? 'Edit flashcard' : 'New flashcard'}
      eyebrow="One atomic fact per card"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="card-form">
            {card ? 'Save card' : 'Add card'}
          </Button>
        </>
      }
    >
      <form id="card-form" onSubmit={submit} className="space-y-4">
        <Field label="Front" hint="A question, a “why”, or “what happens if…”">
          <textarea
            className="textarea min-h-[82px]"
            value={front}
            onChange={(event) => setFront(event.target.value)}
            placeholder="Why does an IndexedDB transaction auto-commit?"
            data-autofocus
            required
          />
        </Field>
        <Field label="Back" hint="The shortest correct answer. No essay.">
          <textarea
            className="textarea min-h-[102px]"
            value={back}
            onChange={(event) => setBack(event.target.value)}
            placeholder="When control returns to the event loop without a pending request, the transaction commits automatically."
            required
          />
        </Field>
        <Field label="Tags" hint="Comma or space separated. Become Anki tags.">
          <input
            className="input"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="indexeddb, transactions, async"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Source">
            <select className="select" value={source} onChange={(event) => setSource(event.target.value as CardSource)}>
              <option value="core">Core concept</option>
              <option value="mistake">Mistake log</option>
            </select>
          </Field>
          <Field label="Week (optional)">
            <select
              className="select"
              value={weekId}
              onChange={(event) => {
                setWeekId(event.target.value)
                setNodeId('')
              }}
            >
              <option value="">No week</option>
              {[...subject.weeks]
                .sort((a, b) => a.weekNumber - b.weekNumber)
                .map((week) => (
                  <option key={week.id} value={week.id}>
                    Week {week.weekNumber} · {week.title}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <Field label="Knowledge node (optional)" hint="Links the card to a node for context in Anki exports.">
          <select className="select" value={nodeId} onChange={(event) => setNodeId(event.target.value)}>
            <option value="">No node</option>
            {weekNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>
        </Field>
        {error ? <InlineError>{error}</InlineError> : null}
      </form>
    </Sheet>
  )
}
