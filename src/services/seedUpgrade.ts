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
 * New seed resources are additive. A resource the learner already has keeps
 * its status and edited text; a resource they added themselves is untouched.
 * Removed seed resources are never deleted — they may hold reading progress.
 */
function mergeResources(current: Subject['resources'], fresh: Subject['resources']): Subject['resources'] {
  const known = new Set(current.map((resource) => resource.id))
  const additions = fresh.filter((resource) => !known.has(resource.id))
  return additions.length ? [...current, ...additions] : current
}

/**
 * Authored day cards are content, so a seed bump replaces a stale authored card
 * with the corrected one. A learner edit or a generated card is progress-adjacent
 * work and always wins. A week with no cards gains the authored seven.
 */
function mergeDayPlans(
  current: AppData['dayPlans'],
  fresh: AppData['dayPlans'],
): AppData['dayPlans'] {
  const result: AppData['dayPlans'] = { ...current }
  for (const [weekId, plans] of Object.entries(fresh)) {
    const byDay = new Map((result[weekId] ?? []).map((plan) => [plan.day, plan]))
    for (const plan of plans) {
      const found = byDay.get(plan.day)
      if (!found || found.origin === 'authored') byDay.set(plan.day, plan)
    }
    result[weekId] = [...byDay.values()].sort((a, b) => a.day - b.day)
  }
  return result
}

/**
 * Seed content is curriculum, progress is user data. A version bump refreshes
 * authored text and authored day plans while preserving checks, checkpoint
 * history, notes, cards, resources and any week the learner added themselves.
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
      resources: mergeResources(subject.resources, fresh.resources),
    }
  })

  return {
    data: {
      ...data,
      subjects,
      dayPlans: mergeDayPlans(data.dayPlans, seed.dayPlans),
      seedVersion: SEED_VERSION,
      updatedAt: Date.now(),
    },
    changed: true,
  }
}
