import type { MasteryCategory, MasteryScores, Weekday } from '../types/schema'

export const DAY_MS = 86_400_000

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Mon',
  1: 'Tue',
  2: 'Wed',
  3: 'Thu',
  4: 'Fri',
  5: 'Sat',
  6: 'Sun',
}

export const WEEKDAY_LONG: Record<Weekday, string> = {
  0: 'Monday',
  1: 'Tuesday',
  2: 'Wednesday',
  3: 'Thursday',
  4: 'Friday',
  5: 'Saturday',
  6: 'Sunday',
}

export const WEEKDAY_FOCUS: Record<Weekday, string> = {
  0: 'Understand',
  1: 'Build slice',
  2: 'Edge cases',
  3: 'Integrate',
  4: 'Harden',
  5: 'Blind challenge',
  6: 'Feynman + review',
}

export const MASTERY_CATEGORIES: { key: MasteryCategory; label: string; hint: string }[] = [
  { key: 'concept', label: 'Concept', hint: 'Can you explain the mental model without notes?' },
  { key: 'implementation', label: 'Implementation', hint: 'Did it compile and run with no crutches?' },
  { key: 'craft', label: 'UI/UX Craft', hint: 'Hierarchy, spacing, states, accessibility.' },
  { key: 'debugging', label: 'Debugging', hint: 'Did you isolate edge cases without panic?' },
]

/** Local-time date key, e.g. 2026-10-26. Never use toISOString() for this. */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfLocalDay(d: Date = new Date()): number {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy.getTime()
}

export function endOfLocalDay(d: Date = new Date()): number {
  return startOfLocalDay(d) + DAY_MS - 1
}

export function addDays(ts: number, days: number): number {
  return ts + days * DAY_MS
}

export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

/**
 * Monday-first index for display strips. 0 = Monday ... 6 = Sunday.
 * Planning data uses the schema's Sunday-first order instead; use
 * `schemaWeekday` when reading or writing `ChecklistItem.day`.
 */
export function weekdayOf(date: Date = new Date()): Weekday {
  return ((date.getDay() + 6) % 7) as Weekday
}

/** Schema weekday for plans: 0 = Sunday, matching JavaScript's getDay(). */
export function schemaWeekday(date: Date = new Date()): Weekday {
  return date.getDay() as Weekday
}

export function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function relativeDays(ts: number, now = Date.now()): string {
  if (!ts) return 'never'
  const diff = startOfLocalDay(new Date(ts)) - startOfLocalDay(new Date(now))
  const days = Math.round(diff / DAY_MS)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days < 7) return `in ${days}d`
  return formatShortDate(ts)
}

export function isDue(ts: number, now = Date.now()): boolean {
  return ts > 0 && ts <= endOfLocalDay(new Date(now))
}

export function averageScores(scores: MasteryScores): number {
  const values = MASTERY_CATEGORIES.map((c) => scores[c.key])
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function isGatePass(scores: MasteryScores): boolean {
  return averageScores(scores) >= 4 && Math.min(...MASTERY_CATEGORIES.map((c) => scores[c.key])) >= 3
}

export function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function formatMinutes(total: number): string {
  if (!total) return '0m'
  return minutesLabel(total)
}
