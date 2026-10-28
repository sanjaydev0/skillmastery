import type { AppData, ChecklistItem, Subject, Week } from '../types/schema'
import { SEED_VERSION } from '../types/schema'
import { createSeedData } from '../data/seedData'

export interface SeedRefreshResult {
  data: AppData
  changed: boolean
}

/**
 * Carry a completion flag to the closest task in the new authored plan:
 * same schema weekday, same active/passive mode, first unused slot.
 *
 * Authored weeks can gain or lose tasks between seed versions. Matching by
 * day and mode is deliberately conservative: it never invents a completion
 * and it keeps the one-check-per-day habit intact.
 */
function carryProgress(oldItems: ChecklistItem[], newItems: ChecklistItem[]): ChecklistItem[] {
  const used = new Set<string>()
  const done = new Set<string>()
  for (const old of oldItems) {
    if (!old.done) continue
    const match = newItems.find(
      (item) => !used.has(item.id) && item.day === old.day && item.context === old.context,
    )
    if (!match) continue
    used.add(match.id)
    done.add(match.id)
  }
  return newItems.map((item) => (done.has(item.id) ? { ...item, done: true } : item))
}

function refreshWeek(week: Week, template: Week): Week {
  const templateIds = new Set(template.checklist.map((item) => item.id))
  // Old seed tasks used `<week>-c1…c7`. They are replaced by the new day plan,
  // so they must not survive as duplicates. Anything else is a task the
  // learner added (or imported) and is kept.
  const legacySeedId = new RegExp(`^${week.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-c\\d+$`)
  const extras = week.checklist.filter(
    (item) => !templateIds.has(item.id) && !legacySeedId.test(item.id),
  )
  return {
    ...template,
    // The checkpoint text is editable in the workshop, so an upgrade must not
    // overwrite it. Attempts and scores are progress and always survive.
    gate: week.gate,
    checklist: [...carryProgress(week.checklist, template.checklist), ...extras],
  }
}

/**
 * Seed content is curriculum, progress is user data. A version bump refreshes
 * authored text and day plans while preserving checks, checkpoint history,
 * notes, cards and any week the learner added themselves.
 */
export function refreshSeedContent(data: AppData): SeedRefreshResult {
  if (data.seedVersion >= SEED_VERSION) return { data, changed: false }

  const seed = createSeedData()
  const subjects: Subject[] = data.subjects.map((subject) => {
    const fresh = seed.subjects.find((entry) => entry.id === subject.id)
    if (!fresh) return subject
    return {
      ...subject,
      weeks: subject.weeks.map((week) => {
        const template = fresh.weeks.find((entry) => entry.id === week.id)
        return template ? refreshWeek(week, template) : week
      }),
    }
  })

  return {
    data: { ...data, subjects, seedVersion: SEED_VERSION, updatedAt: Date.now() },
    changed: true,
  }
}
