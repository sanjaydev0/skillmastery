import type { AppData } from '../types/schema'
import { DEFAULT_JOURNEY, DEFAULT_PLANNER, SCHEMA_VERSION, SEED_VERSION } from '../types/schema'
import { seedBooks } from './books'
import { weekOneDayPlans } from './dayPlans/week1'
import { flutterSubject } from './tracks/flutter'
import { fullstackSubject } from './tracks/fullstack'

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Fresh, fully authored seed. Every track is self-contained; the passive canon
 * is intentionally shared because reading progress belongs to the person, not
 * to a particular technology track.
 */
export function createSeedData(): AppData {
  const now = Date.now()
  return {
    schemaVersion: SCHEMA_VERSION,
    seedVersion: SEED_VERSION,
    createdAt: now,
    updatedAt: now,
    activeSubjectId: flutterSubject.id,
    subjects: clone([flutterSubject, fullstackSubject]),
    books: clone(seedBooks),
    dailyLog: {},
    overrides: { weeks: {}, nodes: {} },
    prefs: {
      theme: 'dark',
      mode: 'active',
      sidebarCollapsed: false,
    },
    planner: { ...DEFAULT_PLANNER, studyDays: [...DEFAULT_PLANNER.studyDays] },
    promptOverrides: {},
    journey: { ...DEFAULT_JOURNEY, pauses: [] },
    dayPlans: { 'fl-w1': clone(weekOneDayPlans) },
    trash: [],
  }
}
