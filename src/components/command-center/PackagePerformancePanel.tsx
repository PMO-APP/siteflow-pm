import { AlertTriangle, Building2, CheckCircle2 } from 'lucide-react'
import type { DeliveryPackagePerformance } from '@/core/intelligence/delivery-twin/deliveryTwinTypes'
import { SectionHeader, StatusPill } from '@/components/ui'

function tone(label: DeliveryPackagePerformance['healthLabel']) {
  if (label === 'Healthy') return 'success'
  if (label === 'Watch') return 'warning'
  if (label === 'At Risk') return 'warning'
  return 'danger'
}

export default function PackagePerformancePanel({ packages }: { packages: DeliveryPackagePerformance[] }) {
  if (packages.length <= 1) return null

  const sorted = [...packages].sort((a, b) => a.healthScore - b.healthScore)
  const critical = sorted[0]

  return (
    <section className="pmx-section-panel">
      <SectionHeader
        eyebrow="Consolidated delivery"
        title="Block and package performance"
        description="Combined project position with each block, infrastructure and external MEP package shown separately."
        action={
          critical ? (
            <div className="flex items-center gap-2 text-xs text-[var(--pmx-muted)]">
              <AlertTriangle size={15} className="text-[var(--pmx-coral)]" />
              Main pressure: {critical.name}
            </div>
          ) : null
        }
      />

      <div className="mt-5 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {packages.map(pkg => (
          <article key={pkg.id} className="rounded-2xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--pmx-primary-soft)] text-[var(--pmx-primary)]">
                  <Building2 size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-[var(--pmx-text)]">{pkg.name}</h3>
                  <p className="mt-1 truncate text-xs text-[var(--pmx-muted)]">
                    {pkg.contractorName || pkg.discipline || 'Delivery package'}
                  </p>
                </div>
              </div>
              <StatusPill label={`${pkg.healthScore}% · ${pkg.healthLabel}`} tone={tone(pkg.healthLabel)} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--pmx-border)] pt-4">
              <div><div className="text-lg font-semibold text-[var(--pmx-text)]">{pkg.progress}%</div><div className="text-[11px] text-[var(--pmx-muted)]">Actual</div></div>
              <div><div className="text-lg font-semibold text-[var(--pmx-text)]">{pkg.plannedProgress}%</div><div className="text-[11px] text-[var(--pmx-muted)]">Planned</div></div>
              <div><div className={pkg.variance < 0 ? 'text-lg font-semibold text-red-500' : 'text-lg font-semibold text-emerald-500'}>{pkg.variance > 0 ? '+' : ''}{pkg.variance}%</div><div className="text-[11px] text-[var(--pmx-muted)]">Variance</div></div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--pmx-surface-3)]">
              <div className="h-full rounded-full bg-[var(--pmx-primary)]" style={{ width: `${Math.max(0, Math.min(100, pkg.progress))}%` }} />
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs text-[var(--pmx-muted)]">
              {pkg.overdueActivities > 0 ? <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--pmx-coral)]" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />}
              <span>
                {pkg.overdueActivities > 0
                  ? `${pkg.overdueActivities} overdue activit${pkg.overdueActivities === 1 ? 'y' : 'ies'}${pkg.primaryDelayActivity ? ` · Main delay: ${pkg.primaryDelayActivity}` : ''}`
                  : 'No overdue activities in this package.'}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
