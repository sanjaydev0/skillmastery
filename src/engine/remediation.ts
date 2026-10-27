import type { KnowledgeNode, KnowledgePoint, RepairFlag } from '../types/schema'

export const REPAIR_THRESHOLD = 2

export function activeFlags(node: KnowledgeNode): RepairFlag[] {
  return node.repairFlags.filter((flag) => !flag.clearedAt)
}

export function recordKpFailure(node: KnowledgeNode, kpId: string, at: number): KnowledgeNode {
  const knowledgePoints = node.knowledgePoints.map((kp) =>
    kp.id === kpId ? { ...kp, fails: kp.fails + 1, lastFailedAt: at } : kp,
  )
  return { ...node, knowledgePoints, status: 'needs-repair', updatedAt: at }
}

export function repairLockedPoint(node: KnowledgeNode): KnowledgePoint | undefined {
  return node.knowledgePoints.find((kp) => kp.fails >= REPAIR_THRESHOLD)
}

export function shouldFlagPrereqs(node: KnowledgeNode): KnowledgePoint | undefined {
  return repairLockedPoint(node)
}

export function addRepairFlag(
  prereq: KnowledgeNode,
  fromNodeId: string,
  kpId: string,
  at: number,
): KnowledgeNode {
  const exists = prereq.repairFlags.some(
    (flag) => flag.fromNodeId === fromNodeId && flag.kpId === kpId && !flag.clearedAt,
  )
  if (exists) return prereq
  return {
    ...prereq,
    repairFlags: [
      ...prereq.repairFlags,
      { id: `repair-${fromNodeId}-${kpId}-${at}`, fromNodeId, kpId, at },
    ],
    updatedAt: at,
  }
}

export function clearRepairFlag(node: KnowledgeNode, flagId: string, at: number): KnowledgeNode {
  return {
    ...node,
    repairFlags: node.repairFlags.map((flag) =>
      flag.id === flagId ? { ...flag, clearedAt: at } : flag,
    ),
    updatedAt: at,
  }
}

export function clearFlagsFrom(node: KnowledgeNode, fromNodeId: string, at: number): KnowledgeNode {
  let changed = false
  const repairFlags = node.repairFlags.map((flag) => {
    if (flag.fromNodeId === fromNodeId && !flag.clearedAt) {
      changed = true
      return { ...flag, clearedAt: at }
    }
    return flag
  })
  return changed ? { ...node, repairFlags, updatedAt: at } : node
}

/** Clears epistemic debt on a node that has just been proven again. */
export function resetNodeFailures(node: KnowledgeNode): KnowledgeNode {
  return {
    ...node,
    knowledgePoints: node.knowledgePoints.map((kp) => ({ ...kp, fails: 0 })),
    updatedAt: Date.now(),
  }
}
