import {
  CheckCircle2,
  HelpCircle,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { MilestoneReadinessResult } from '@/core/intelligence/readiness/readinessTypes'
import {
  ProgressRing,
  SectionHeader,
  StatusPill,
} from '@/components/ui'

function statusTone(
  status: MilestoneReadinessResult['status']
) {
  if (status === 'ready') return 'success'
  if (status === 'nearly_ready') return 'warning'
  if (status === 'not_ready') return 'danger'
  return 'neutral'
}

export default function ReadinessPanel({
  readiness,
}: {
  readiness: MilestoneReadinessResult
}) {
  const navigate = useNavigate()

  return (
    <div className="pmx-card p-5">
      <SectionHeader
        eyebrow="Next Milestone"
        title={readiness.milestoneName}
        description="Readiness is calculated from dependencies, approvals, procurement, quality and HSE."
        action={
          <StatusPill
            label={readiness.status.replace('_', ' ')}
            tone={statusTone(readiness.status)}
          />
        }
      />

      <div className="mt-5 grid gap-5 lg:grid-cols-[170px_1fr]">
        <ProgressRing
          value={readiness.score}
          size={118}
          label="Readiness Score"
          helper={`${readiness.blockers.length} blocker${readiness.blockers.length === 1 ? '' : 's'}`}
          tone={
            readiness.score >= 85
              ? 'success'
              : readiness.score >= 65
              ? 'warning'
              : 'danger'
          }
        />

        <div className="space-y-2">
          {readiness.requirements.map(requirement => {
            const Icon =
              requirement.status === 'ready'
                ? CheckCircle2
                : requirement.status === 'not_ready'
                ? XCircle
                : HelpCircle

            return (
              <button
                key={requirement.id}
                type="button"
                onClick={() => {
                  if (requirement.route) {
                    navigate(requirement.route)
                  }
                }}
                className="flex w-full items-start gap-3 rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3 text-left hover:border-[var(--pmx-border-strong)]"
              >
                <Icon
                  size={17}
                  className={
                    requirement.status === 'ready'
                      ? 'mt-0.5 text-emerald-400'
                      : requirement.status === 'not_ready'
                      ? 'mt-0.5 text-red-400'
                      : 'mt-0.5 text-amber-400'
                  }
                />

                <div>
                  <div className="text-sm font-medium text-[var(--pmx-text)]">
                    {requirement.label}
                  </div>

                  {requirement.reason ? (
                    <div className="mt-1 text-xs text-[var(--pmx-muted)]">
                      {requirement.reason}
                    </div>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
