import { useState } from 'react'
import type { PromptTemplate } from '../../types/schema'
import { PROMPT_TEMPLATE_MAX_CHARS } from '../../types/schema'
import { useAppStore } from '../../store/AppStore'
import { useUiStore } from '../../store/uiStore'
import { Sheet } from '../../components/ui/Sheet'
import { Button, InlineError } from '../../components/ui/primitives'

const VARIABLES = ['track', 'week', 'weekNumber', 'anchor', 'kps', 'mistakes']

/**
 * Edits one prompt skill. Overrides live in AppData so they are backed up,
 * exported and undoable — unlike the device-local AI key.
 */
export function PromptEditorSheet({
  prompt,
  onClose,
  onSaved,
}: {
  prompt: PromptTemplate
  onClose: () => void
  onSaved: () => void
}) {
  const stored = useAppStore((state) => state.promptOverrides[prompt.id])
  const savePromptOverride = useAppStore((state) => state.savePromptOverride)
  const resetPromptOverride = useAppStore((state) => state.resetPromptOverride)
  const toast = useUiStore((state) => state.toast)
  const [draft, setDraft] = useState(stored ?? prompt.template)
  const [error, setError] = useState('')

  const trimmed = draft.trim()
  const overLimit = trimmed.length > PROMPT_TEMPLATE_MAX_CHARS

  const save = () => {
    setError('')
    if (!trimmed) {
      setError('A prompt skill cannot be empty. Reset it if you want the original back.')
      return
    }
    if (overLimit) {
      setError(`Shorten the skill to ${PROMPT_TEMPLATE_MAX_CHARS.toLocaleString()} characters or fewer.`)
      return
    }
    if (trimmed === prompt.template.trim()) {
      resetPromptOverride(prompt.id)
      toast('Skill matches the original, so the override was removed.', 'info')
      onSaved()
      return
    }
    savePromptOverride(prompt.id, trimmed)
    toast('Prompt skill saved. It is included in JSON backups.', 'success', 5000)
    onSaved()
  }

  const reset = () => {
    resetPromptOverride(prompt.id)
    toast('Prompt skill reset to the authored template.', 'info')
    onSaved()
  }

  return (
    <Sheet
      title={prompt.title}
      eyebrow="Prompt skill"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {stored ? (
            <Button variant="outline" onClick={reset}>
              Reset to original
            </Button>
          ) : null}
          <Button variant="primary" onClick={save} disabled={overLimit || !trimmed}>
            Save skill
          </Button>
        </>
      }
    >
      <div className="flex h-full flex-col">
        <p className="muted text-[12.5px] leading-relaxed">
          Edit the instructions, not the week context. Variables are replaced when you copy or run the prompt:
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {VARIABLES.map((name) => (
            <code key={name} className="pill !px-1.5 !py-0 font-mono !text-[11px]">
              {`{{${name}}}`}
            </code>
          ))}
        </div>
        <label className="label mt-4" htmlFor="prompt-skill">
          Template
        </label>
        <textarea
          id="prompt-skill"
          className="textarea prompt-editor flex-1 font-mono !text-[11.5px] leading-relaxed"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setError('')
          }}
          spellCheck={false}
          data-autofocus
        />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className={overLimit ? 'text-[11px] text-bad' : 'faint text-[11px]'}>
            {trimmed.length.toLocaleString()} / {PROMPT_TEMPLATE_MAX_CHARS.toLocaleString()} characters
          </p>
          <p className="faint text-[11px]">Saved locally · undoable · included in backups</p>
        </div>
        {error ? <InlineError>{error}</InlineError> : null}
      </div>
    </Sheet>
  )
}
