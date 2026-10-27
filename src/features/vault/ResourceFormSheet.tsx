import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Resource, ResourceKind, ResourceStatus } from '../../types/schema'
import { useActiveSubject, useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { Sheet } from '../../components/ui/Sheet'
import { Button, Field, InlineError } from '../../components/ui/primitives'

const KIND_LABELS: Record<ResourceKind, string> = {
  docs: 'Official docs',
  curriculum: 'Community curriculum',
  article: 'Article / reference',
}

export function ResourceFormSheet({
  resource,
  onClose,
}: {
  resource?: Resource
  onClose: () => void
}) {
  const subject = useActiveSubject()
  const addResource = useAppStore((state) => state.addResource)
  const updateResource = useAppStore((state) => state.updateResource)
  const deleteResource = useAppStore((state) => state.deleteResource)
  const toast = useUiStore((state) => state.toast)

  const [title, setTitle] = useState(resource?.title ?? '')
  const [url, setUrl] = useState(resource?.url ?? '')
  const [kind, setKind] = useState<ResourceKind>(resource?.kind ?? 'docs')
  const [description, setDescription] = useState(resource?.description ?? '')
  const [tags, setTags] = useState(resource?.tags.join(', ') ?? '')
  const [weekId, setWeekId] = useState(resource?.weekId ?? '')
  const [status, setStatus] = useState<ResourceStatus>(resource?.status ?? 'toRead')
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!resource) {
      const result = addResource({ title, url, kind, description, tags, weekId: weekId || undefined })
      if (!result.ok) {
        setError(result.message)
        return
      }
      toast(result.message, 'success')
      onClose()
      return
    }
    updateResource(resource.id, {
      title: title.trim() || url,
      url: url.trim(),
      kind,
      description: description.trim() || undefined,
      tags: tags
        .split(/[,\s]+/)
        .map((tag) => tag.trim().replace(/^#/, ''))
        .filter(Boolean)
        .slice(0, 12),
      weekId: weekId || undefined,
      status,
    })
    toast('Resource updated.', 'success')
    onClose()
  }

  return (
    <Sheet
      title={resource ? 'Edit resource' : 'Add a resource'}
      eyebrow="Docs, curricula and references"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="resource-form">
            {resource ? 'Save resource' : 'Add resource'}
          </Button>
        </>
      }
    >
      <form id="resource-form" onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. MDN IndexedDB API"
            data-autofocus
          />
        </Field>
        <Field label="URL" hint="Must be a full https:// address.">
          <input
            className="input font-mono !text-[12px]"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://developer.mozilla.org/…"
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kind">
            <select className="select" value={kind} onChange={(event) => setKind(event.target.value as ResourceKind)}>
              {(Object.keys(KIND_LABELS) as ResourceKind[]).map((key) => (
                <option key={key} value={key}>
                  {KIND_LABELS[key]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Week (optional)">
            <select className="select" value={weekId} onChange={(event) => setWeekId(event.target.value)}>
              <option value="">Cross-track / general</option>
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
        {resource ? (
          <Field label="Reading status">
            <select className="select" value={status} onChange={(event) => setStatus(event.target.value as ResourceStatus)}>
              <option value="toRead">To read</option>
              <option value="reading">Reading</option>
              <option value="done">Done</option>
            </select>
          </Field>
        ) : null}
        <Field label="Description" hint="Why this resource earns a slot.">
          <textarea
            className="textarea min-h-[72px]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Canonical spec for object stores, indexes and transaction lifecycle."
          />
        </Field>
        <Field label="Tags">
          <input
            className="input"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="indexeddb, storage, offline"
          />
        </Field>
        {error ? <InlineError>{error}</InlineError> : null}
        {resource ? (
          <div className="mt-2 rounded-xl border border-bad/25 bg-bad-soft p-3">
            <p className="text-[11.5px] font-semibold text-bad">Remove from this track</p>
            <Button
              variant="danger"
              size="sm"
              className="mt-2"
              onClick={() => {
                if (window.confirm(`Remove “${resource.title}” from the vault?`)) {
                  deleteResource(resource.id)
                  toast('Resource removed.', 'info')
                  onClose()
                }
              }}
            >
              Delete resource
            </Button>
          </div>
        ) : null}
      </form>
    </Sheet>
  )
}
