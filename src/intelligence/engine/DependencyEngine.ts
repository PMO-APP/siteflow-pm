import type { IntelligenceEvent } from '../models/IntelligenceEvent'
import { KnowledgeGraph, type DependencyChain } from '../graph/KnowledgeGraph'

export interface DependencyAnalysis {
  graph: KnowledgeGraph
  chains: DependencyChain[]
  rootCauseEventIds: string[]
  blockingEventIds: string[]
}

export function analyseDependencies(events: IntelligenceEvent[]): DependencyAnalysis {
  const graph = KnowledgeGraph.fromEvents(events)
  const openDelayed = events.filter(
    event => event.status === 'open' && ['high', 'critical'].includes(event.severity)
  )

  const chains = openDelayed
    .map(event => graph.traceUpstream(event.id))
    .filter((chain): chain is DependencyChain => Boolean(chain && chain.nodes.length > 1))

  const referencedTargets = new Set(chains.flatMap(chain => chain.edges.map(edge => edge.to)))
  const referencedSources = new Set(chains.flatMap(chain => chain.edges.map(edge => edge.from)))
  const rootCauseEventIds = [...referencedTargets].filter(id => !referencedSources.has(id))
  const blockingEventIds = events
    .filter(event => event.links?.some(link => link.type === 'blocks'))
    .map(event => event.id)

  return { graph, chains, rootCauseEventIds, blockingEventIds }
}
