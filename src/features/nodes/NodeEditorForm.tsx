import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Search, X } from 'lucide-react'
import type { KnowledgeNode, KnowledgePoint, Subject } from '../../types/schema'
import { useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { cn, sanitiseTags, uniqueId } from '../../lib/utils'
import { Button, Field, InlineError } from '../../components/ui/primitives'

export function NodeEditorForm({
  subject,
  weekId,
  node,
  onDone,
  onCancel,
  compact = false,
}: {
  subject: Subject
  weekId?: string
  node?: KnowledgeNode
  onDone: () => void
  onCancel?: () => void
  compact?: boolean
}) {
  const addNode = useAppStore((state) => state.addNode)
  const updateNode = useAppStore((state) => state.updateNode)
  const toast = useUiStore((state) => state.toast)

  const [targetWeek, setTargetWeek] = useState(node?.weekId ?? weekId ?? subject.weeks[0]?.id ?? '')
  const [title, setTitle] = useState(node?.title ?? '')
  const [tags, setTags] = useState(node?.tags.join(', ') ?? '')
  const [points, setPoints] = useState<KnowledgePoint[]>(
    node?.knowledgePoints.length
      ? node.knowledgePoints.map((point) => ({ ...point }))
      : [
          {
            id: uniqueId('kp'),
            primitive: '',
            concept: '',
            failureMode: '',
            fails: 0,
          },
        ],
  )
  const [prereqIds, setPrereqIds] = useState<string[]>(node?.prerequisiteIds ?? [])
  const [encompassedIds, setEncompassedIds] = useState<string[]>(node?.encompassedNodeIds ?? [])
  const [notes, setNotes] = useState(node?.notes ?? '')
  const [error, setError] = useState('')
  const isEdit = Boolean(node)

  const updatePoint = (index: number, patch: Partial<KnowledgePoint>) => {
    setPoints((current) => current.map((point, i) => (i === index ? { ...point, ...patch } : point)))
  }

  const addPoint = () => {
    if (isEdit) {
      setPoints((current) => [
        ...current,
        { id: uniqueId('kp'), primitive: '', concept: '', failureMode: '', fails: 0 },
      ])
    }
  }

  const removePoint = (index: number) => {
    setPoints((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Give the node a title.')
      return
    }
    const validPoints = points.filter(
      (point) => point.primitive.trim() || point.concept.trim() || point.failureMode.trim(),
    )
    if (validPoints.length === 0) {
      setError('Write at least one primitive → concept → failure mode.')
      return
    }
    if (!targetWeek) {
      setError('Choose a week for this node.')
      return
    }

    if (node) {
      updateNode(node.id, {
        weekId: targetWeek,
        title: title.trim(),
        slug: title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        tags: sanitiseTags(tags),
        prerequisiteIds: prereqIds,
        encompassedNodeIds: encompassedIds,
        knowledgePoints: validPoints.map((point) => ({
          ...point,
          primitive: point.primitive.trim(),
          concept: point.concept.trim(),
          failureMode: point.failureMode.trim(),
        })),
        notes: notes.trim() || undefined,
      })
      toast('Node updated.', 'success')
      onDone()
      return
    }

    const first = validPoints[0]!
    const result = addNode({
      weekId: targetWeek,
      title,
      tags,
      primitive: first.primitive,
      concept: first.concept,
      failureMode: first.failureMode,
      prerequisiteIds: prereqIds,
      encompassedNodeIds: encompassedIds,
      notes,
    })
    if (!result.ok) {
      setError(result.message)
      return
    }
    toast(result.message, 'success')
    onDone()
  }

  const weekNumber = useMemo(
    () => new Map(subject.weeks.map((week) => [week.id, week.weekNumber])),
    [subject.weeks],
  )

  return (
    <form onSubmit={submit} className={cn('space-y-4', compact ? '' : 'pb-2')}>
      <div className={cn('grid gap-3', compact ? 'sm:grid-cols-2' : '')}>
        <Field label="Title">
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Constraints flow down, sizes flow up"
            data-autofocus
            required
          />
        </Field>
        <Field label="Week">
          <select className="select" value={targetWeek} onChange={(event) => setTargetWeek(event.target.value)}>
            {subject.weeks
              .slice()
              .sort((a, b) => a.weekNumber - b.weekNumber)
              .map((week) => (
                <option key={week.id} value={week.id}>
                  Week {week.weekNumber} · {week.title}
                </option>
              ))}
          </select>
        </Field>
      </div>

      <Field label="Tags" hint="Comma or space separated. Used for search and Anki tags.">
        <input
          className="input"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="layout, constraints, render"
        />
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="label !mb-0">Knowledge points</p>
          {isEdit ? (
            <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={addPoint}>
              Add point
            </Button>
          ) : null}
        </div>
        <div className="space-y-2.5">
          {points.map((point, index) => (
            <div key={point.id} className="rounded-xl border border-line bg-s2 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="pill !py-0.5 !text-[10px]">Primitive · Concept · Failure mode</span>
                {points.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removePoint(index)}
                    className="text-t3 hover:text-bad"
                    aria-label={`Remove knowledge point ${index + 1}`}
                  >
                    <X size={13} />
                  </button>
                ) : null}
              </div>
              <div className="space-y-2">
                <input
                  className="input !bg-s1"
                  value={point.primitive}
                  onChange={(event) => updatePoint(index, { primitive: event.target.value })}
                  placeholder="Primitive — the smallest named mechanism"
                  aria-label={`Knowledge point ${index + 1} primitive`}
                />
                <input
                  className="input !bg-s1"
                  value={point.concept}
                  onChange={(event) => updatePoint(index, { concept: event.target.value })}
                  placeholder="Concept — how it composes / the mental model"
                  aria-label={`Knowledge point ${index + 1} concept`}
                />
                <input
                  className="input !bg-s1"
                  value={point.failureMode}
                  onChange={(event) => updatePoint(index, { failureMode: event.target.value })}
                  placeholder="Failure mode — what breaks when the model is wrong"
                  aria-label={`Knowledge point ${index + 1} failure mode`}
                />
              </div>
            </div>
          ))}
        </div>
        {!isEdit ? (
          <p className="faint mt-1.5 text-[11px]">
            Add more knowledge points after creating the node, once the first primitive is proven.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <NodePicker
          label="Prerequisites"
          hint="Must be mastered before this node opens."
          nodes={subject.nodes}
          weekNumbers={weekNumber}
          excludeId={node?.id}
          selected={prereqIds}
          onChange={setPrereqIds}
        />
        <NodePicker
          label="Encompassed nodes (FIRe)"
          hint="Reviewing this node implicitly exercises these older nodes."
          nodes={subject.nodes}
          weekNumbers={weekNumber}
          excludeId={node?.id}
          selected={encompassedIds}
          onChange={setEncompassedIds}
        />
      </div>

      <Field label="Notes" hint="Mental model corrections, gotchas, links to your wiki.">
        <textarea
          className="textarea min-h-[72px]"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="What did you get wrong the first time?"
        />
      </Field>

      {error ? <InlineError>{error}</InlineError> : null}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button variant="primary" type="submit" icon={isEdit ? undefined : <Plus size={14} />}>
          {isEdit ? 'Save node' : 'Create node'}
        </Button>
      </div>
    </form>
  )
}

function NodePicker({
  label,
  hint,
  nodes,
  weekNumbers,
  excludeId,
  selected,
  onChange,
}: {
  label: string
  hint: string
  nodes: KnowledgeNode[]
  weekNumbers: Map<string, number>
  excludeId?: string
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const sorted = [...nodes]
    .filter((entry) => entry.id !== excludeId)
    .sort(
      (a, b) =>
        (weekNumbers.get(a.weekId) ?? 0) - (weekNumbers.get(b.weekId) ?? 0) ||
        a.title.localeCompare(b.title),
    )
  const filtered = sorted.filter((entry) => {
    if (!query.trim()) return true
    const hay = `${entry.title} ${entry.tags.join(' ')} week ${weekNumbers.get(entry.weekId) ?? ''}`.toLowerCase()
    return hay.includes(query.toLowerCase())
  })
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((entry) => entry !== id) : [...selected, id])
  }

  return (
    <div className="rounded-xl border border-line bg-s1">
      <div className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-2">
        <div>
          <p className="text-[11.5px] font-semibold">{label}</p>
          <p className="faint text-[10px]">{hint}</p>
        </div>
        <span className="badge badge-neutral num">{selected.length}</span>
      </div>
      <label className="relative m-2 block">
        <Search size={12} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-t3" />
        <input
          className="input h-11 !py-1 !pl-7 !text-[11.5px] sm:!h-8"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter nodes…"
          aria-label={`Filter ${label}`}
        />
      </label>
      <div className="scroll-thin max-h-[154px] overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <p className="faint px-1 py-3 text-center text-[11px]">No matching nodes.</p>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((entry) => {
              const checked = selected.includes(entry.id)
              return (
                <label
                  key={entry.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-[11px] transition hover:bg-s2',
                    checked && 'bg-accent-soft',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(entry.id)}
                    className="mt-0.5 h-3.5 w-3.5 flex-none"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{entry.title}</span>
                    <span className="faint text-[9.5px]">
                      W{weekNumbers.get(entry.weekId) ?? '?'} · {entry.status}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
