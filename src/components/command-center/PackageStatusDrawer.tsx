import { X, AlertTriangle, CalendarDays, Activity, ArrowUpRight, ShieldAlert } from 'lucide-react'
import type { DeliveryPackagePerformance } from '@/core/intelligence/delivery-twin/deliveryTwinTypes'
import { StatusPill } from '@/components/ui'

function tone(label: DeliveryPackagePerformance['healthLabel']) {
  if (label === 'Healthy') return 'success'
  if (label === 'Watch') return 'warning'
  return 'danger'
}

function formatDate(value: string | null) {
  if (!value) return 'No date'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'No date' : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PackageStatusDrawer({
  pkg,
  onClose,
}: {
  pkg: DeliveryPackagePerformance | null
  onClose: () => void
}) {
  if (!pkg) return null

  const issueRows = [
    ['Delayed activities', pkg.issueSummary.delayedActivities],
    ['Approval items', pkg.issueSummary.openApprovals],
    ['Procurement blockers', pkg.issueSummary.procurementBlockers],
    ['Open risks', pkg.issueSummary.openRisks],
    ['Open snags', pkg.issueSummary.openSnags],
    ['Quality failures', pkg.issueSummary.qualityFailures],
    ['HSE incidents', pkg.issueSummary.hseIncidents],
  ] as const

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/45 backdrop-blur-[2px]" onMouseDown={onClose}>
      <aside
        className="h-full w-full max-w-xl overflow-y-auto border-l border-[var(--pmx-border)] bg-[var(--pmx-surface)] shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-[var(--pmx-border)] bg-[var(--pmx-surface)]/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--pmx-faint)]">Package live status</div>
              <h3 className="mt-1 text-xl font-semibold text-[var(--pmx-text)]">{pkg.name}</h3>
              <p className="mt-1 text-sm text-[var(--pmx-muted)]">{pkg.contractorName || pkg.discipline || 'Project delivery package'}</p>
            </div>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--pmx-border)] text-[var(--pmx-muted)] hover:bg-[var(--pmx-surface-2)]">
              <X size={17} />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusPill label={pkg.healthLabel} tone={tone(pkg.healthLabel)} />
            <span className="rounded-full bg-[var(--pmx-surface-2)] px-3 py-1 text-xs font-medium text-[var(--pmx-muted)]">{pkg.currentStageName || 'Stage not detected'}</span>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Actual', `${pkg.progress}%`],
              ['Planned', `${pkg.plannedProgress}%`],
              ['Variance', `${pkg.variance > 0 ? '+' : ''}${pkg.variance}%`],
              ['Days', `${pkg.daysVariance > 0 ? '+' : ''}${pkg.daysVariance}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3">
                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--pmx-faint)]">{label}</div>
                <div className="mt-1 text-lg font-semibold text-[var(--pmx-text)]">{value}</div>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pmx-text)]"><ShieldAlert size={16} /> Active issues</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {issueRows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface)] px-3 py-2">
                  <span className="text-xs text-[var(--pmx-muted)]">{label}</span>
                  <span className={value > 0 ? 'text-sm font-semibold text-amber-500' : 'text-sm font-semibold text-[var(--pmx-text)]'}>{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pmx-text)]"><AlertTriangle size={16} /> Primary constraint</div>
            <p className="mt-3 text-sm leading-6 text-[var(--pmx-muted)]">{pkg.primaryDelayActivity || 'No material delay has been detected for this package.'}</p>
          </section>

          <section className="rounded-2xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pmx-text)]"><CalendarDays size={16} /> Upcoming activities</div>
            <div className="mt-3 space-y-2">
              {pkg.upcomingMilestones.length ? pkg.upcomingMilestones.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface)] px-3 py-2">
                  <span className="min-w-0 truncate text-sm text-[var(--pmx-text)]">{item.name}</span>
                  <span className="shrink-0 text-xs text-[var(--pmx-muted)]">{formatDate(item.plannedFinish)}</span>
                </div>
              )) : <div className="text-sm text-[var(--pmx-muted)]">No upcoming dated activities.</div>}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--pmx-text)]"><Activity size={16} /> Recent activity</div>
            <div className="mt-3 space-y-2">
              {pkg.recentActivityNames.length ? pkg.recentActivityNames.map(name => (
                <div key={name} className="flex items-center gap-2 rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface)] px-3 py-2 text-sm text-[var(--pmx-muted)]">
                  <ArrowUpRight size={13} className="shrink-0" /> {name}
                </div>
              )) : <div className="text-sm text-[var(--pmx-muted)]">No recently updated activities.</div>}
            </div>
          </section>
        </div>
      </aside>
    </div>
  )
}
