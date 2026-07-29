import type { IntelligenceEvent, IntelligenceLink } from '../models/IntelligenceEvent'

export interface KnowledgeNode {
  id: string
  type: string
  label: string
  data?: Record<string, unknown>
}

export interface KnowledgeEdge {
  from: string
  to: string
  type: IntelligenceLink['type']
}

export interface DependencyChain {
  root: KnowledgeNode
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}

export class KnowledgeGraph {
  private nodes = new Map<string, KnowledgeNode>()
  private edges: KnowledgeEdge[] = []

  addNode(node: KnowledgeNode) {
    this.nodes.set(node.id, node)
    return this
  }

  addEdge(edge: KnowledgeEdge) {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) return this
    if (!this.edges.some(item => item.from === edge.from && item.to === edge.to && item.type === edge.type)) {
      this.edges.push(edge)
    }
    return this
  }

  getNode(id: string) {
    return this.nodes.get(id)
  }

  getEdges() {
    return [...this.edges]
  }

  traceUpstream(startId: string, maxDepth = 8): DependencyChain | null {
    const root = this.nodes.get(startId)
    if (!root) return null

    const visited = new Set<string>([startId])
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }]
    const nodes: KnowledgeNode[] = [root]
    const edges: KnowledgeEdge[] = []

    while (queue.length) {
      const current = queue.shift()!
      if (current.depth >= maxDepth) continue

      const upstream = this.edges.filter(
        edge => edge.from === current.id && ['depends_on', 'caused_by', 'blocks'].includes(edge.type)
      )

      upstream.forEach(edge => {
        edges.push(edge)
        if (visited.has(edge.to)) return
        const node = this.nodes.get(edge.to)
        if (!node) return
        visited.add(edge.to)
        nodes.push(node)
        queue.push({ id: node.id, depth: current.depth + 1 })
      })
    }

    return { root, nodes, edges }
  }

  static fromEvents(events: IntelligenceEvent[]) {
    const graph = new KnowledgeGraph()

    events.forEach(event => {
      graph.addNode({
        id: event.id,
        type: event.source,
        label: event.title,
        data: { ...event.metadata, severity: event.severity, status: event.status },
      })
    })

    events.forEach(event => {
      event.links?.forEach(link => {
        graph.addEdge({ from: event.id, to: link.targetId, type: link.type })
      })
    })

    return graph
  }
}
