import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Boxes,
  Building2,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  LockKeyhole,
  PackageCheck,
} from 'lucide-react'
import type {
  DeliveryPackagePerformance,
  DeliveryStage,
  DeliveryTwinResult,
} from '@/core/intelligence/delivery-twin/deliveryTwinTypes'
import { StatusPill } from '@/components/ui'
import PackageStatusDrawer from './PackageStatusDrawer'

function stageTone(status: DeliveryStage['status']) {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'primary'
  if (status === 'blocked') return 'danger'
  if (status === 'waiting') return 'warning'
  return 'neutral'
}

function packageTone(label: DeliveryPackagePerformance['healthLabel']) {
  if (label === 'Healthy') return 'success'
  if (label === 'Watch') return 'warning'
  return 'danger'
}

function StageIcon({ status }: { status: DeliveryStage['status'] }) {
  if (status === 'completed') return <Check size={14} />
  if (status === 'blocked') return <LockKeyhole size={14} />
  if (status === 'in_progress') return <Clock3 size={14} />
  return <Circle size={11} />
}

export default function InteractiveProjectTwinMap({
  twin,
  onSelectStage,
}: {
  twin: DeliveryTwinResult
  onSelectStage: (stage: DeliveryStage) => void
}) {
  const [drawerPackageId, setDrawerPackageId] = useState<string | null>(null)
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    twin.packages[0]?.id || null,
  )

  const selectedPackage = useMemo(
    () => twin.packages.find(item => item.id === selectedPackageId) || twin.packages[0] || null,
    [selectedPackageId, twin.packages],
  )

  const drawerPackage = twin.packages.find(item => item.id === drawerPackageId) || null

  return (
    <>
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4">
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="rounded-xl border border-[var(--pmx-border-strong)] bg-[var(--pmx-surface)] p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--pmx-primary-soft)] text-[var(--pmx-primary)]">
                <Building2 size={19} />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--pmx-faint)]">
                  Project twin
                </div>
                <div className="mt-0.5 text-sm font-semibold text-[var(--pmx-text)]">
                  Live delivery position
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--pmx-faint)]">Progress</div>
                <div className="mt-1 text-2xl font-semibold text-[var(--pmx-text)]">{twin.overallProgress}%</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--pmx-faint)]">Packages</div>
                <div className="mt-1 text-2xl font-semibold text-[var(--pmx-text)]">{twin.packages.length}</div>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--pmx-surface-3)]">
              <div className="h-full rounded-full bg-[var(--pmx-primary)]" style={{ width: `${twin.overallProgress}%` }} />
            </div>

            <div className="mt-4 text-xs leading-5 text-[var(--pmx-muted)]">
              {twin.activeStage
                ? `Current stage: ${twin.activeStage.name}`
                : twin.completedStages === twin.totalApplicableStages
                ? 'All applicable stages are complete.'
                : 'No active stage has been detected.'}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--pmx-faint)]">
                <Boxes size={14} /> Delivery packages
              </div>
              <span className="text-[11px] text-[var(--pmx-muted)]">Select a package to inspect</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {twin.packages.map(pkg => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={
                    selectedPackage?.id === pkg.id
                      ? 'rounded-xl border border-[var(--pmx-primary)] bg-[var(--pmx-primary-soft)] p-3 text-left'
                      : 'rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface)] p-3 text-left transition hover:border-[var(--pmx-border-strong)]'
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--pmx-text)]">{pkg.name}</div>
                      <div className="mt-0.5 truncate text-[11px] text-[var(--pmx-muted)]">
                        {pkg.contractorName || pkg.discipline || 'Project delivery package'}
                      </div>
                    </div>
                    <StatusPill label={pkg.healthLabel} tone={packageTone(pkg.healthLabel)} />
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--pmx-muted)]">
                    <span className="truncate">{pkg.currentStageName || 'Stage not detected'}</span>
                    <span>{pkg.daysVariance > 0 ? '+' : ''}{pkg.daysVariance} days</span>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="text-xl font-semibold text-[var(--pmx-text)]">{pkg.progress}%</div>
                    <div className={pkg.variance < 0 ? 'text-xs font-semibold text-red-400' : 'text-xs font-semibold text-emerald-400'}>
                      {pkg.variance > 0 ? '+' : ''}{pkg.variance}% variance
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--pmx-surface-3)]">
                    <div className="h-full rounded-full bg-[var(--pmx-primary)]" style={{ width: `${pkg.progress}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[var(--pmx-muted)]">{Object.values(pkg.issueSummary).reduce((sum, value) => sum + value, 0)} active signals</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={event => { event.stopPropagation(); setDrawerPackageId(pkg.id) }}
                      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); setDrawerPackageId(pkg.id) } }}
                      className="text-[11px] font-semibold text-[var(--pmx-primary)]"
                    >
                      Open status
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedPackage ? (
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--pmx-faint)]">Package health</div>
            <div className="mt-1 text-lg font-semibold text-[var(--pmx-text)]">{selectedPackage.healthScore}%</div>
          </div>
          <div className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--pmx-faint)]">Planned progress</div>
            <div className="mt-1 text-lg font-semibold text-[var(--pmx-text)]">{selectedPackage.plannedProgress}%</div>
          </div>
          <div className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--pmx-faint)]">Overdue activities</div>
            <div className="mt-1 text-lg font-semibold text-[var(--pmx-text)]">{selectedPackage.overdueActivities}</div>
          </div>
          <div className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--pmx-faint)]">Primary constraint</div>
            <div className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--pmx-text)]">
              {selectedPackage.primaryDelayActivity || 'No material delay detected'}
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--pmx-faint)]">
            <PackageCheck size={14} /> Delivery stage path
          </div>
          <span className="text-[11px] text-[var(--pmx-muted)]">Click a stage for blockers and ownership</span>
        </div>

        <div className="overflow-x-auto pb-2 pmx-scrollbar">
          <div className="flex min-w-max items-stretch gap-2">
            {twin.stages.map((stage, index) => (
              <div key={stage.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectStage(stage)}
                  className="group w-44 rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface)] p-3 text-left transition hover:border-[var(--pmx-border-strong)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className={
                      stage.status === 'completed'
                        ? 'grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400'
                        : stage.status === 'blocked'
                        ? 'grid h-7 w-7 place-items-center rounded-lg bg-red-500/10 text-red-400'
                        : stage.status === 'in_progress'
                        ? 'grid h-7 w-7 place-items-center rounded-lg bg-[var(--pmx-primary-soft)] text-[var(--pmx-primary)]'
                        : 'grid h-7 w-7 place-items-center rounded-lg bg-[var(--pmx-surface-3)] text-[var(--pmx-faint)]'
                    }>
                      <StageIcon status={stage.status} />
                    </div>
                    <StatusPill label={stage.status.replace('_', ' ')} tone={stageTone(stage.status)} />
                  </div>

                  <div className="mt-3 truncate text-sm font-semibold text-[var(--pmx-text)]">{index + 1}. {stage.name}</div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--pmx-muted)]">
                    <span>{stage.progress}% complete</span>
                    {stage.blockerCount > 0 ? (
                      <span className="flex items-center gap-1 text-red-400"><AlertTriangle size={11} /> {stage.blockerCount}</span>
                    ) : null}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--pmx-surface-3)]">
                    <div className="h-full rounded-full bg-[var(--pmx-primary)]" style={{ width: `${Math.max(2, stage.progress)}%` }} />
                  </div>
                </button>

                {index < twin.stages.length - 1 ? <ChevronRight size={16} className="shrink-0 text-[var(--pmx-faint)]" /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <PackageStatusDrawer pkg={drawerPackage} onClose={() => setDrawerPackageId(null)} />
    </>
  )
}
