import { describe, expect, it } from 'vitest'
import { createSeedData } from '../data/seedData'
import {
  REPAIR_THRESHOLD,
  activeFlags,
  addRepairFlag,
  clearFlagsFrom,
  clearRepairFlag,
  recordKpFailure,
  repairLockedPoint,
  resetNodeFailures,
} from './remediation'

const seed = createSeedData()
const subject = seed.subjects[0]!
const node = subject.nodes[0]!
const prereq = subject.nodes[1]!
const kpId = node.knowledgePoints[0]!.id
const AT = 1_700_000_000_000

describe('two-failure remediation', () => {
  it('records failures and marks the node as needing repair', () => {
    const once = recordKpFailure(node, kpId, AT)
    expect(once.knowledgePoints[0]!.fails).toBe(1)
    expect(once.status).toBe('needs-repair')

    const twice = recordKpFailure(once, kpId, AT + 1000)
    expect(twice.knowledgePoints[0]!.fails).toBe(2)
    expect(twice.knowledgePoints[0]!.lastFailedAt).toBe(AT + 1000)
    expect(repairLockedPoint(twice)?.id).toBe(kpId)
    expect(REPAIR_THRESHOLD).toBe(2)
  })

  it('flags a direct prerequisite only once for the same failure', () => {
    const flagged = addRepairFlag(prereq, node.id, kpId, AT)
    expect(activeFlags(flagged)).toHaveLength(1)
    expect(flagged.repairFlags[0]?.fromNodeId).toBe(node.id)

    const duplicate = addRepairFlag(flagged, node.id, kpId, AT + 10)
    expect(duplicate).toBe(flagged)
  })

  it('clears a flag and can clear every flag from one node', () => {
    const flagged = addRepairFlag(prereq, node.id, kpId, AT)
    const flagId = flagged.repairFlags[0]!.id
    const cleared = clearRepairFlag(flagged, flagId, AT + 100)
    expect(activeFlags(cleared)).toHaveLength(0)
    expect(cleared.repairFlags[0]?.clearedAt).toBe(AT + 100)

    const secondFlag = addRepairFlag(cleared, node.id, 'another-kp', AT + 200)
    const clearedAll = clearFlagsFrom(secondFlag, node.id, AT + 300)
    expect(activeFlags(clearedAll)).toHaveLength(0)
  })

  it('resets failure counters after a proven recovery', () => {
    const failed = recordKpFailure(recordKpFailure(node, kpId, AT), kpId, AT + 1)
    const reset = resetNodeFailures(failed)
    expect(reset.knowledgePoints.every((kp) => kp.fails === 0)).toBe(true)
  })
})
