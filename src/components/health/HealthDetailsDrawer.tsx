import { Drawer } from '@/components/ui/Drawer'
import type { ProjectHealthResult } from '@/core/engine/types'
import { HealthContributors } from './HealthContributors'
import { HealthBreakdownChart } from './HealthBreakdownChart'
import { HealthStatusBadge } from './HealthStatusBadge'
import { HealthHistoryChart } from './HealthHistoryChart'

export function HealthDetailsDrawer({ open, health, onClose, projectId }: { open: boolean; health: ProjectHealthResult | null; onClose: () => void; projectId?: string | number | null }) {
  if (!health) return null
  return (
    <Drawer open={open} onClose={onClose} title="Project health breakdown" eyebrow="Unified Health Engine" description={`Calculated ${new Date(health.calculatedAt).toLocaleString('en-GB')}`} width="xl">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><div className="text-sm text-slate-500">Overall score</div><div className="mt-1 text-4xl font-semibold text-slate-950">{health.score}%</div></div>
            <HealthStatusBadge tone={health.tone} label={health.label} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{health.summary}</p>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-slate-950">Weighted contribution</h3>
          <p className="mt-1 text-sm text-slate-500">Only assessed modules contribute to the normalized health score.</p>
          <div className="mt-4"><HealthBreakdownChart contributors={health.contributors} /></div>
        </section>

        <HealthHistoryChart projectId={projectId} />

        <section>
          <h3 className="text-lg font-semibold text-slate-950">Contributor explanations</h3>
          <div className="mt-3"><HealthContributors contributors={health.contributors} /></div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="font-semibold text-blue-950">Management recommendations</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-blue-900">
            {(health.recommendations.length ? health.recommendations : ['Maintain current controls and continue monitoring.']).map(item => <li key={item}>• {item}</li>)}
          </ul>
        </section>
      </div>
    </Drawer>
  )
}
