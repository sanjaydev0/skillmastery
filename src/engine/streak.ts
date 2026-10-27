import type { DayLog } from '../types/schema'
import { addDaysToKey, dateKey, weekdayOf } from '../lib/dates'

export interface StreakSummary {
  current: number
  best: number
  todayDone: boolean
  todayCount: number
}

function coreCount(log: DayLog | undefined, coreIds: string[]): number {
  if (!log) return 0
  return log.items.filter((id) => coreIds.includes(id)).length
}

export function computeStreak(
  log: Record<string, DayLog>,
  coreIds: string[],
  now = new Date(),
): StreakSummary {
  const today = dateKey(now)
  const todayCount = coreCount(log[today], coreIds)

  let cursor = today
  if (coreCount(log[cursor], coreIds) === 0) {
    cursor = addDaysToKey(today, -1)
  }
  let current = 0
  for (let i = 0; i < 3650; i++) {
    if (coreCount(log[cursor], coreIds) > 0) {
      current++
      cursor = addDaysToKey(cursor, -1)
    } else {
      break
    }
  }

  // Best streak scans every recorded day (bounded by the log size).
  let best = 0
  for (const key of Object.keys(log)) {
    if (coreCount(log[key], coreIds) === 0) continue
    const prev = coreCount(log[addDaysToKey(key, -1)], coreIds)
    if (prev > 0) continue
    let run = 0
    let scan = key
    while (coreCount(log[scan], coreIds) > 0) {
      run++
      scan = addDaysToKey(scan, 1)
    }
    best = Math.max(best, run)
  }

  return { current, best: Math.max(best, current), todayDone: todayCount > 0, todayCount }
}

export interface DayDots {
  key: string
  weekday: string
  core: number
  total: number
  isToday: boolean
}

export function recentDays(
  log: Record<string, DayLog>,
  coreIds: string[],
  days = 7,
  now = new Date(),
): DayDots[] {
  const out: DayDots[] = []
  for (let i = days - 1; i >= 0; i--) {
    const key = addDaysToKey(dateKey(now), -i)
    const [y, m, d] = key.split('-').map(Number)
    const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
    const entry = log[key]
    out.push({
      key,
      weekday: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][weekdayOf(date)] ?? '?',
      core: coreCount(entry, coreIds),
      total: entry?.items.length ?? 0,
      isToday: i === 0,
    })
  }
  return out
}
