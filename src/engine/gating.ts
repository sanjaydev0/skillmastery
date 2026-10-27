import type { KnowledgeNode, Overrides, Subject, Week, WeekStatus } from '../types/schema'

export function activeChecklistCount(week: Week): number {
  return week.checklist.filter((item) => item.done).length
}

export function weekProgress(week: Week): number {
  if (week.checklist.length === 0) return week.gate.passedAt ? 1 : 0
  return week.checklist.filter((item) => item.done).length / week.checklist.length
}

export function isWeekAvailable(week: Week, weeks: Week[], overrides: Overrides): boolean {
  if (overrides.weeks[week.id]) return true
  if (week.prerequisiteWeekIds.length === 0) return true
  return week.prerequisiteWeekIds.every((id) => {
    const prereq = weeks.find((w) => w.id === id)
    return Boolean(prereq?.gate.passedAt)
  })
}

export function weekStatus(week: Week, weeks: Week[], overrides: Overrides): WeekStatus {
  if (week.gate.passedAt) return 'mastered'
  if (!isWeekAvailable(week, weeks, overrides)) return 'locked'
  const started =
    week.checklist.some((i) => i.done) ||
    Boolean(week.gate.scores) ||
    week.gate.attempts.length > 0
  return started ? 'in-progress' : 'ready'
}

export function missingWeekPrereqs(week: Week, weeks: Week[]): Week[] {
  return week.prerequisiteWeekIds
    .map((id) => weeks.find((w) => w.id === id))
    .filter((w): w is Week => Boolean(w) && !w?.gate.passedAt)
}

export function missingNodePrereqs(node: KnowledgeNode, nodes: KnowledgeNode[]): KnowledgeNode[] {
  return node.prerequisiteIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n): n is KnowledgeNode => Boolean(n) && n?.status !== 'mastered')
}

export function isNodeAvailable(
  node: KnowledgeNode,
  nodes: KnowledgeNode[],
  overrides: Overrides,
): boolean {
  if (overrides.nodes[node.id]) return true
  if (node.prerequisiteIds.length === 0) return true
  return node.prerequisiteIds.every((id) => {
    const prereq = nodes.find((n) => n.id === id)
    return Boolean(prereq?.status === 'mastered')
  })
}

/** A node can only be worked once its week is open AND its prerequisites are proven. */
export function isNodeOpen(node: KnowledgeNode, subject: Subject, overrides: Overrides): boolean {
  const week = subject.weeks.find((entry) => entry.id === node.weekId)
  if (!week) return false
  return isWeekAvailable(week, subject.weeks, overrides) && isNodeAvailable(node, subject.nodes, overrides)
}

export type NodeBadge = 'locked' | 'ready' | 'learning' | 'mastered' | 'needs-repair'

export function nodeBadge(node: KnowledgeNode, subject: Subject, overrides: Overrides): NodeBadge {
  if (node.status === 'mastered') return 'mastered'
  const week = subject.weeks.find((entry) => entry.id === node.weekId)
  if (!week || !isWeekAvailable(week, subject.weeks, overrides) || !isNodeAvailable(node, subject.nodes, overrides)) {
    return 'locked'
  }
  if (node.status === 'needs-repair') return 'needs-repair'
  if (node.status === 'learning') return 'learning'
  return 'ready'
}

export function overallMastery(nodes: KnowledgeNode[]): number {
  if (nodes.length === 0) return 0
  return nodes.filter((n) => n.status === 'mastered').length / nodes.length
}

export function nextWeek(weeks: Week[], overrides: Overrides): Week | undefined {
  const ordered = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber)
  return ordered.find((w) => weekStatus(w, weeks, overrides) !== 'mastered')
}

export function activeWeek(weeks: Week[], overrides: Overrides): Week | undefined {
  const ordered = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber)
  return (
    ordered.find((w) => weekStatus(w, weeks, overrides) === 'in-progress') ??
    ordered.find((w) => weekStatus(w, weeks, overrides) === 'ready') ??
    ordered[ordered.length - 1]
  )
}

export function weekEncompassedNodes(week: Week, nodes: KnowledgeNode[]): KnowledgeNode[] {
  return week.encompassedNodeIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter((n): n is KnowledgeNode => Boolean(n))
}
