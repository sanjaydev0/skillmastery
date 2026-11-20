import { weekOneDayPlans } from '../../dayPlans/week1'
import type { WeekContent } from '../types'

/**
 * Week 1 stays hand-authored where it already lives. This wrapper puts it in
 * the same registry as every later week without moving 211 lines of prose.
 */
const weekOne: WeekContent = {
  weekId: 'fl-w1',
  weekNumber: 1,
  dayPlans: weekOneDayPlans.map((plan) => ({ ...plan, origin: 'authored' as const })),
}

export default weekOne
