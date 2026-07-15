import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { DeliveryStage } from '@/core/intelligence/delivery-twin/deliveryTwinTypes'
import {
  SectionHeader,
  StatusPill,
} from '@/components/ui'

function tone(status: DeliveryStage['status']) {
  if (status === 'completed') return 'success'
  if (status === 'in_progress') return 'primary'
  if (status === 'blocked') return 'danger'
  if (status === 'waiting') return 'warning'
  return 'neutral'
}

export default function StageInspector({
  stage,
  onClose,
}: {
  stage: DeliveryStage | null
  onClose: () => void
}) {
  const navigate = useNavigate()

  if (!stage) return null

  return (
    <aside className="pmx-stage-inspector">
      <div className="pmx-stage-inspector-header">
        <SectionHeader
          eyebrow="Stage Inspector"
          title={stage.name}
          description={`${stage.progress}% complete · ${stage.readinessScore}% ready`}
          action={
            <button
              type="button"
              className="pmx-btn-ghost pmx-btn-sm"
              onClick={onClose}
            >
              <X size={15} />
            </button>
          }
        />
      </div>

      <div className="pmx-stage-inspector-body pmx-scrollbar">
        <div className="flex items-center justify-between gap-3">
          <StatusPill
            label={stage.status.replace('_', ' ')}
            tone={tone(stage.status)}
            dot
          />

          {stage.ownerLabel ? (
            <span className="text-xs text-[var(--pmx-muted)]">
              Owner: {stage.ownerLabel}
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--pmx-faint)]">
              Progress
            </div>
            <div className="mt-1 text-lg font-semibold text-[var(--pmx-text)]">
              {stage.progress}%
            </div>
          </div>

          <div className="rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--pmx-faint)]">
              Readiness
            </div>
            <div className="mt-1 text-lg font-semibold text-[var(--pmx-text)]">
              {stage.readinessScore}%
            </div>
          </div>

          <div className="rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--pmx-faint)]">
              Blockers
            </div>
            <div className="mt-1 text-lg font-semibold text-[var(--pmx-text)]">
              {stage.blockerCount}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--pmx-faint)]">
            Blockers and actions
          </div>

          <div className="mt-3 space-y-2">
            {stage.blockers.length === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-[var(--pmx-border)] p-4">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 text-emerald-400"
                />
                <div>
                  <div className="text-sm font-semibold text-[var(--pmx-text)]">
                    No blocker detected
                  </div>
                  <div className="mt-1 text-xs text-[var(--pmx-muted)]">
                    This stage has no recorded blocker.
                  </div>
                </div>
              </div>
            ) : (
              stage.blockers.map(blocker => (
                <button
                  key={blocker.id}
                  type="button"
                  onClick={() => navigate(blocker.route)}
                  className="group flex w-full items-start gap-3 rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4 text-left hover:border-[var(--pmx-border-strong)]"
                >
                  <AlertTriangle
                    size={17}
                    className={
                      blocker.severity === 'critical'
                        ? 'mt-0.5 text-red-400'
                        : 'mt-0.5 text-amber-400'
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--pmx-text)]">
                      {blocker.title}
                    </div>

                    <div className="mt-1 text-xs text-[var(--pmx-muted)]">
                      {blocker.ownerName || 'No owner assigned'} · {blocker.source}
                    </div>
                  </div>

                  <ChevronRight
                    size={15}
                    className="mt-0.5 text-[var(--pmx-faint)] group-hover:text-[var(--pmx-primary)]"
                  />
                </button>
              ))
            )}
          </div>
        </div>

        <button
          type="button"
          className="pmx-btn-primary mt-6 w-full"
          onClick={() => navigate(stage.route)}
        >
          Open stage workspace
          <ChevronRight size={15} />
        </button>
      </div>
    </aside>
  )
}
