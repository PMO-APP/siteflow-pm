import { useState } from 'react'
import {
  Check,
  ChevronRight,
  Circle,
  Clock3,
  LockKeyhole,
} from 'lucide-react'
import type {
  DeliveryStage,
  DeliveryTwinResult,
} from '@/core/intelligence/delivery-twin/deliveryTwinTypes'
import {
  SectionHeader,
  StatusPill,
} from '@/components/ui'
import StageInspector from './StageInspector'

function tone(status: DeliveryStage['status']) {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'primary'
  if (status === 'blocked') return 'danger'
  if (status === 'waiting') return 'warning'
  return 'neutral'
}

function StageIcon({
  status,
}: {
  status: DeliveryStage['status']
}) {
  if (status === 'completed') return <Check size={15} />
  if (status === 'blocked') return <LockKeyhole size={15} />
  if (status === 'in_progress') return <Clock3 size={15} />
  return <Circle size={12} />
}

export default function DeliveryTwinPanel({
  twin,
}: {
  twin: DeliveryTwinResult
}) {
  const [selectedStage, setSelectedStage] =
    useState<DeliveryStage | null>(null)

  return (
    <>
      <section className="pmx-section-panel">
        <SectionHeader
          eyebrow="Project Delivery State"
          title="Digital Project Twin"
          description={`Scope template: ${twin.scopeTemplate.replace(/_/g, ' ')}`}
          action={
            <span className="text-xs font-medium text-[var(--pmx-muted)]">
              {twin.completedStages}/{twin.totalApplicableStages} stages complete
            </span>
          }
        />

        <div className="mt-5 grid gap-2">
          {twin.stages.length === 0 ? (
            <div className="pmx-empty-state">
              No schedule phases are available.
            </div>
          ) : (
            twin.stages.map((stage, index) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => setSelectedStage(stage)}
                className="group grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3 text-left transition hover:border-[var(--pmx-border-strong)] hover:bg-[var(--pmx-surface-3)]"
              >
                <div
                  className={
                    stage.status === 'completed'
                      ? 'grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400'
                      : stage.status === 'in_progress'
                      ? 'grid h-8 w-8 place-items-center rounded-lg bg-[var(--pmx-primary-soft)] text-[var(--pmx-primary)]'
                      : stage.status === 'blocked'
                      ? 'grid h-8 w-8 place-items-center rounded-lg bg-red-500/10 text-red-400'
                      : 'grid h-8 w-8 place-items-center rounded-lg bg-[var(--pmx-surface-3)] text-[var(--pmx-faint)]'
                  }
                >
                  <StageIcon status={stage.status} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-[var(--pmx-text)]">
                      {index + 1}. {stage.name}
                    </div>

                    <StatusPill
                      label={stage.status.replace('_', ' ')}
                      tone={tone(stage.status)}
                    />
                  </div>

                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--pmx-surface-3)]">
                    <div
                      className={
                        stage.status === 'completed'
                          ? 'h-full rounded-full bg-emerald-400'
                          : stage.status === 'blocked'
                          ? 'h-full rounded-full bg-red-400'
                          : 'h-full rounded-full bg-[var(--pmx-primary)]'
                      }
                      style={{
                        width: `${Math.max(2, stage.progress)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[var(--pmx-muted)]">
                    <span>{stage.progress}% complete</span>
                    <span>{stage.readinessScore}% ready</span>

                    {stage.ownerLabel ? (
                      <span>Owner: {stage.ownerLabel}</span>
                    ) : null}

                    {stage.blockerCount > 0 ? (
                      <span className="text-red-400">
                        {stage.blockerCount} blocker
                        {stage.blockerCount === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </div>
                </div>

                <ChevronRight
                  size={16}
                  className="text-[var(--pmx-faint)] transition group-hover:translate-x-0.5 group-hover:text-[var(--pmx-primary)]"
                />
              </button>
            ))
          )}
        </div>
      </section>

      <StageInspector
        stage={selectedStage}
        onClose={() => setSelectedStage(null)}
      />
    </>
  )
}
