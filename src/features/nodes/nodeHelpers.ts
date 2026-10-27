import type { KnowledgeNode } from '../../types/schema'

export function weaknessCount(node: KnowledgeNode): number {
  return node.knowledgePoints.reduce((sum, point) => sum + point.fails, 0)
}
