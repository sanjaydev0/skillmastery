import type { AppData } from '../types/schema'
import { DEFAULT_JOURNEY, DEFAULT_PLANNER, SCHEMA_VERSION, SEED_VERSION } from '../types/schema'
import { seedBooks } from './books'
import { authoredDayPlans } from './weeks'
import { flutterSubject } from './tracks/flutter'

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Fresh, fully authored seed. The Flutter track is the one course this app
 * ships; the shared passive canon belongs to the learner, not to a technology.
 */
export function createSeedData(): AppData {
  const now = Date.now()
  return {
    schemaVersion: SCHEMA_VERSION,
    seedVersion: SEED_VERSION,
    createdAt: now,
    updatedAt: now,
    activeSubjectId: flutterSubject.id,
    subjects: clone([flutterSubject]),
    books: clone(seedBooks),
    dailyLog: {},
    bugLog: {},
    overrides: { weeks: {} },
    prefs: {
      theme: 'dark',
      mode: 'active',
      sidebarCollapsed: false,
      localStorageThresholdMB: 4,
    },
    planner: { ...DEFAULT_PLANNER, studyDays: [...DEFAULT_PLANNER.studyDays] },
    promptOverrides: {},
    journey: { ...DEFAULT_JOURNEY, pauses: [] },
    dayPlans: clone(authoredDayPlans()),
    trash: [],
  }
}
