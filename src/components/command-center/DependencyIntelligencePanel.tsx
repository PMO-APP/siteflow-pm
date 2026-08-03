import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, GitBranch, Network, ShieldAlert, Workflow } from 'lucide-react'
import type { DeliveryDependencyIntelligence, DependencyHealth } from '@/core/intelligence/delivery-twin/deliveryTwinTypes'
import { StatusPill } from '@/components/ui'

function tone(health: DependencyHealth) {
  if (health === 'healthy') return 'success'
  if (health === 'at_risk') return 'warning'
  return 'danger'
}

export default function DependencyIntelligencePanel({ intelligence }: { intelligence: DeliveryDependencyIntelligence }) {
  const [selectedId, setSelectedId] = useState(intelligence.bottlenecks[0]?.activityId || intelligence.nodes[0]?.id || null)
  const selected = intelligence.nodes.find(node => node.id === selectedId) || null
  const related = useMemo(() => {
    if (!selected) return []
    const ids = new Set([...selected.predecessorIds, ...selected.successorIds])
    return intelligence.nodes.filter(node => ids.has(node.id))
  }, [intelligence.nodes, selected])

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--pmx-faint)]"><Network size={14} /> Dependency intelligence</div>
          <div className="mt-1 text-sm text-[var(--pmx-muted)]">Trace critical-path exposure, blocked hand-offs and cross-package links.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill label={`${intelligence.blockedLinks} blocked`} tone={intelligence.blockedLinks ? 'danger' : 'success'} />
          <StatusPill label={`${intelligence.atRiskLinks} at risk`} tone={intelligence.atRiskLinks ? 'warning' : 'neutral'} />
          <StatusPill label={`${intelligence.crossPackageLinks} cross-package`} tone="primary" />
        </div>
      </div>

      {intelligence.nodes.length === 0 ? <div className="pmx-empty-state">No dependency data is available. Add predecessor relationships to the schedule to activate this view.</div> : (
        <div className="grid min-w-0 gap-4">
          <div className="min-w-0 rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface)] p-4">
            <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {intelligence.nodes.slice(0, 12).map((node, index) => (
                <div key={node.id} className="min-w-0">
                  <button type="button" onClick={() => setSelectedId(node.id)} className={selectedId === node.id ? 'h-full w-full min-w-0 rounded-xl border border-[var(--pmx-primary)] bg-[var(--pmx-primary-soft)] p-3 text-left' : 'h-full w-full min-w-0 rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3 text-left hover:border-[var(--pmx-border-strong)]'}>
                    <div className="flex items-start justify-between gap-2"><Workflow size={15} className={node.isCritical ? 'text-red-400' : 'text-[var(--pmx-primary)]'} /><StatusPill label={node.health.replace('_', ' ')} tone={tone(node.health)} /></div>
                    <div className="mt-3 line-clamp-2 text-sm font-semibold text-[var(--pmx-text)]">{node.name}</div>
                    <div className="mt-2 text-[11px] text-[var(--pmx-muted)]">{node.packageName || 'Overall project'} · {node.progress}%</div>
                    {node.isCritical ? <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-red-400"><ShieldAlert size={11} /> Critical path</div> : null}
                  </button>
                  
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface)] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--pmx-faint)]"><GitBranch size={14} /> Selected activity</div>
            {selected ? <>
              <div className="mt-3 text-base font-semibold text-[var(--pmx-text)]">{selected.name}</div>
              <div className="mt-1 text-xs text-[var(--pmx-muted)]">{selected.packageName || 'Overall project'} · {selected.progress}% complete</div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-lg bg-[var(--pmx-surface-2)] p-2"><div className="text-lg font-semibold text-[var(--pmx-text)]">{selected.predecessorIds.length}</div><div className="text-[10px] uppercase text-[var(--pmx-faint)]">Predecessors</div></div><div className="rounded-lg bg-[var(--pmx-surface-2)] p-2"><div className="text-lg font-semibold text-[var(--pmx-text)]">{selected.successorIds.length}</div><div className="text-[10px] uppercase text-[var(--pmx-faint)]">Successors</div></div></div>
              <div className="mt-4 space-y-2">{related.slice(0, 5).map(node => <button key={node.id} type="button" onClick={() => setSelectedId(node.id)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--pmx-border)] p-2 text-left"><span className="truncate text-xs font-medium text-[var(--pmx-text)]">{node.name}</span><StatusPill label={node.health.replace('_', ' ')} tone={tone(node.health)} /></button>)}</div>
            </> : null}
          </div>
        </div>
      )}

      {intelligence.bottlenecks.length > 0 ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{intelligence.bottlenecks.slice(0, 3).map(item => <button key={item.activityId} type="button" onClick={() => setSelectedId(item.activityId)} className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface)] p-3 text-left"><div className="flex items-center gap-2 text-xs font-semibold text-[var(--pmx-text)]"><AlertTriangle size={14} className={item.health === 'blocked' ? 'text-red-400' : 'text-amber-400'} /><span className="truncate">{item.activityName}</span></div><div className="mt-2 text-[11px] text-[var(--pmx-muted)]">Affects {item.downstreamCount} downstream activities across {Math.max(1, item.packageCount)} package(s).</div></button>)}</div> : null}
    </div>
  )
}
