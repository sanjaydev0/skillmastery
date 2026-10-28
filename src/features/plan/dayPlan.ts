import type { DaySlot, Weekday } from '../../types/schema'
import { DAY_LABELS } from '../../engine/estimates'

/** Course slots, always in order. The course keeps its own seven-day week. */
export const DAY_SLOTS: DaySlot[] = [1, 2, 3, 4, 5, 6, 7]

export function slotLabel(slot: DaySlot): string {
  return `Day ${slot}`
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
