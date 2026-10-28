import { useState } from 'react'
import type { FormEvent } from 'react'
import { Sparkles } from 'lucide-react'
import type { SubjectAccent } from '../../types/schema'
import { useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { Sheet } from '../ui/Sheet'
import { Button, Field, InlineError } from '../ui/primitives'
import { cn } from '../../lib/utils'
import { navigate } from '../../lib/router'

const ACCENTS: { id: SubjectAccent; label: string; colour: string }[] = [
  { id: 'sky', label: 'Sky', colour: '#38bdf8' },
  { id: 'emerald', label: 'Emerald', colour: '#34d399' },
  { id: 'violet', label: 'Violet', colour: '#a78bfa' },
  { id: 'amber', label: 'Amber', colour: '#fbbf24' },
]

const PHASES = [
  ['Phase 1', 'Foundations', 'Core primitives and vocabulary'],
  ['Phase 2', 'Application', 'A real, constrained build'],
  ['Phase 3', 'Systems', 'Integrate, harden and connect'],
  ['Phase 4', 'Mastery', 'Ship, defend and teach'],
]

export function SubjectCreateSheet({ onClose }: { onClose: () => void }) {
  const addSubject = useAppStore((state) => state.addSubject)
  const toast = useUiStore((state) => state.toast)
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [tagline, setTagline] = useState('')
  const [accent, setAccent] = useState<SubjectAccent>('violet')
  const [error, setError] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const result = addSubject({ name, shortName, tagline, accent })
    if (!result.ok) {
      setError(result.message)
      return
    }
    toast(result.message, 'success')
    onClose()
    navigate('#/plan')
  }

  return (
    <Sheet
      title="Create a subject track"
      eyebrow="One click, four phases, a starter week"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="subject-form" icon={<Sparkles size={14} />}>
            Create track
          </Button>
        </>
      }
    >
      <form id="subject-form" onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-accent/25 bg-accent-soft p-3.5">
          <p className="text-[12.5px] leading-relaxed text-t2">
            A new track gets the same mastery operating system: 4 phases, a Week 1 orientation week with
            passive/active checks, an empty knowledge graph, and its own Recall deck. You can add weeks,
            nodes, cards and resources immediately.
          </p>
        </div>

        <Field label="Track name">
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Rust, Systems & Low-Level Craft"
            data-autofocus
            maxLength={80}
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Short name" hint="Shown in the track switcher.">
            <input
              className="input"
              value={shortName}
              onChange={(event) => setShortName(event.target.value)}
              placeholder="Rust systems"
              maxLength={24}
            />
          </Field>
          <Field label="Accent colour" hint="Applies across this track.">
            <div className="flex h-11 items-center gap-1.5 sm:h-[38px]" role="group" aria-label="Accent colour">
              {ACCENTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={accent === option.id}
                  title={option.label}
                  onClick={() => setAccent(option.id)}
                  className={cn(
                    'grid h-11 w-11 place-items-center rounded-full border-2 transition sm:h-8 sm:w-8',
                    accent === option.id ? 'border-t1 scale-105' : 'border-transparent hover:scale-105',
                  )}
                >
                  <span className="h-5 w-5 rounded-full" style={{ background: option.colour }} aria-hidden />
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label="Tagline" hint="One sentence on what mastery means here.">
          <textarea
            className="textarea min-h-[72px]"
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            placeholder="Own the machine: memory, concurrency, and the tools that make systems legible."
            maxLength={220}
          />
        </Field>

        <div>
          <p className="label">Generated structure</p>
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {PHASES.map(([phase, label, detail], index) => (
              <li
                key={phase}
                className="flex items-start gap-2.5 rounded-lg border border-line bg-s1 px-2.5 py-2"
              >
                <span className="kp-index mt-0.5">{index + 1}</span>
                <div>
                  <p className="text-[11.5px] font-semibold">
                    {phase} · {label}
                  </p>
                  <p className="faint text-[11.5px]">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-line bg-s2 p-3">
          <p className="eyebrow mb-1.5">Preview</p>
          <div className="flex items-center gap-2.5">
            <span
              className="grid h-8 w-8 flex-none place-items-center rounded-lg text-[11px] font-bold text-white"
              style={{ background: ACCENTS.find((option) => option.id === accent)?.colour }}
              aria-hidden
            >
              {(shortName || name || 'New').slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold">{name || 'Untitled mastery track'}</p>
              <p className="faint truncate text-[11px]">
                {shortName || 'New track'} · starter week · offline
              </p>
            </div>
          </div>
        </div>

        {error ? <InlineError>{error}</InlineError> : null}
      </form>
    </Sheet>
  )
}
