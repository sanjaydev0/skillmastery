import type { DayLog } from '../types/schema'
import { addDaysToKey, dateKey, weekdayOf } from '../lib/dates'

function coreCount(log: DayLog | undefined, coreIds: string[]): number {
  if (!log) return 0
  return log.items.filter((id) => coreIds.includes(id)).length
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
