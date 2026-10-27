import { getStoredAppData, useAppStore } from '../store/AppStore'
import { downloadText, fileStamp, slugify, toBackupJson, toObsidianMarkdown } from '../lib/utils'

export function exportBackupJson(): { subjects: number; at: number } {
  const data = getStoredAppData()
  downloadText(`skillmastery-backup-${fileStamp()}.json`, toBackupJson(data), 'application/json')
  useAppStore.getState().markExported()
  return { subjects: data.subjects.length, at: Date.now() }
}

export function exportObsidianMarkdown(): { nodes: number; at: number } {
  const state = useAppStore.getState()
  const subject = state.subjects.find((entry) => entry.id === state.activeSubjectId) ?? state.subjects[0]!
  downloadText(
    `skillmastery-${slugify(subject.shortName) || 'notes'}-${fileStamp()}.md`,
    toObsidianMarkdown(subject, state.books),
    'text/markdown',
  )
  return { nodes: subject.nodes.length, at: Date.now() }
}
