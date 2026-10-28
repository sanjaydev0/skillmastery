import type { Weekday } from '../../types/schema'
import { DAY_LABELS } from '../../engine/estimates'

/** Monday-first display order. `Weekday` itself keeps Sunday at 0. */
export const MONDAY_FIRST: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

export function dayNumber(day: Weekday): number {
  return ((day + 6) % 7) + 1
}

export function dayName(day: Weekday): string {
  return DAY_LABELS[day]
}

export function shortDayName(day: Weekday): string {
  return DAY_LABELS[day].slice(0, 3)
}

export function modeLabel(mode: 'active' | 'passive'): string {
  return mode === 'active' ? 'Active' : 'Passive'
}
