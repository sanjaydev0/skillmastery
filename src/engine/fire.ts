import type { SrsState } from '../types/schema'
import { DAY_MS } from '../lib/dates'

export function emptySrs(): SrsState {
  return { strength: 0, intervalDays: 0, dueAt: 0, implicitReviews: 0 }
}

/** Interval ladder used for explicit node reviews. */
const NODE_INTERVALS = [1, 3, 7, 14, 30, 60, 120]

const FIRE_COOLDOWN_MS = 12 * 60 * 60 * 1000

/**
 * Math Academy's Fractional Implicit Repetition: reviewing an advanced node
 * grants partial spaced-repetition credit to the simpler nodes it encompasses.
 *
 * Rules (deliberate, so mastery cannot be earned by accident):
 *  - +0.5 strength, capped at 5
 *  - interval grows by 1.5x, minimum 1 day, capped at 120 days
 *  - never changes mastery status
 *  - idempotent within a 12h window
 */
export function fireCredit(node: SrsState, at: number): { srs: SrsState; credited: boolean } {
  if (node.lastFireAt && at - node.lastFireAt < FIRE_COOLDOWN_MS) {
    return { srs: node, credited: false }
  }
  const base = Math.max(1, node.intervalDays || 1)
  const intervalDays = Math.min(120, Math.max(1, Math.round(base * 1.5)))
  return {
    credited: true,
    srs: {
      ...node,
      strength: Math.min(5, Math.round((node.strength + 0.5) * 10) / 10),
      intervalDays,
      dueAt: at + intervalDays * DAY_MS,
      lastFireAt: at,
      implicitReviews: node.implicitReviews + 1,
    },
  }
}

export function explicitReview(node: SrsState, at: number): SrsState {
  const strength = Math.min(5, Math.round((node.strength + 1) * 10) / 10)
  // Advance along the full 1/3/7/14/30/60/120-day ladder. Deriving the interval
  // from strength alone made 60 and 120 unreachable once strength capped at 5.
  const nextInterval = NODE_INTERVALS.find((interval) => interval > node.intervalDays)
  const intervalDays = nextInterval ?? NODE_INTERVALS[NODE_INTERVALS.length - 1] ?? 1
  return {
    ...node,
    strength,
    intervalDays,
    dueAt: at + intervalDays * DAY_MS,
    lastReviewedAt: at,
  }
}

export function strengthLabel(strength: number): string {
  if (strength >= 4.5) return 'Mastered'
  if (strength >= 3) return 'Solid'
  if (strength >= 1.5) return 'Developing'
  if (strength > 0) return 'Fragile'
  return 'Untested'
}
