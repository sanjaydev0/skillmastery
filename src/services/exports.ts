import { getStoredAppData, useAppStore } from '../store/AppStore'
import { downloadText, fileStamp, slugify, toBackupJson, toObsidianMarkdown } from '../lib/utils'
import { recordToMarkdown } from './recordExport'

export function exportBackupJson(): { subjects: number; at: number } {
  const data = getStoredAppData()
  downloadText(`skillmastery-backup-${fileStamp()}.json`, toBackupJson(data), 'application/json')
  useAppStore.getState().markExported()
  return { subjects: data.subjects.length, at: Date.now() }
}

export function exportObsidianMarkdown(): { concepts: number; at: number } {
  const state = useAppStore.getState()
  const subject = state.subjects.find((entry) => entry.id === state.activeSubjectId) ?? state.subjects[0]!
  downloadText(
    `skillmastery-${slugify(subject.shortName) || 'notes'}-${fileStamp()}.md`,
    toObsidianMarkdown(subject, state.books),
    'text/markdown',
  )
  return { concepts: subject.concepts.length, at: Date.now() }
}

/** The readable record: proof of work, not a backup. Nothing here is importable. */
export function exportRecordMarkdown(): { at: number } {
  const state = useAppStore.getState()
  const subject = state.subjects.find((entry) => entry.id === state.activeSubjectId) ?? state.subjects[0]!
  downloadText('skillmastery-record.md', recordToMarkdown(subject), 'text/markdown')
  return { at: Date.now() }
}
