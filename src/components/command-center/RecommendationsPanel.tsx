import {
  ChevronRight,
  Lightbulb,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { RecommendationResult } from '@/core/intelligence/recommendation/recommendationTypes'
import { SectionHeader } from '@/components/ui'

export default function RecommendationsPanel({
  recommendations,
  maxItems = 6,
}: {
  recommendations: RecommendationResult
  maxItems?: number
}) {
  const navigate = useNavigate()

  return (
    <div className="pmx-card p-5">
      <SectionHeader
        eyebrow="Action Guidance"
        title="Recommended Actions"
        description="Rules-based recommendations derived from the current delivery position."
        action={
          recommendations.items.length > 0 ? (
            <span className="text-xs font-medium text-[var(--pmx-muted)]">
              {recommendations.criticalCount} critical
            </span>
          ) : null
        }
      />

      <div className="mt-4 space-y-2">
        {recommendations.items.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[var(--pmx-border)] text-sm text-[var(--pmx-faint)]">
            No recommendation is currently required.
          </div>
        ) : (
          recommendations.items
            .slice(0, maxItems)
            .map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.route) {
                    navigate(item.route)
                  }
                }}
                className="group flex w-full items-start gap-3 rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4 text-left hover:border-[var(--pmx-border-strong)]"
              >
                <div
                  className={
                    item.priority === 'critical'
                      ? 'rounded-lg bg-red-500/10 p-2 text-red-400'
                      : item.priority === 'high'
                      ? 'rounded-lg bg-amber-500/10 p-2 text-amber-400'
                      : 'rounded-lg bg-blue-500/10 p-2 text-blue-400'
                  }
                >
                  <Lightbulb size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--pmx-text)]">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-[var(--pmx-muted)]">
                    {item.description}
                  </div>

                  {item.expectedImpact ? (
                    <div className="mt-2 text-xs font-medium text-[var(--pmx-primary)]">
                      {item.expectedImpact}
                    </div>
                  ) : null}
                </div>

                <ChevronRight
                  size={16}
                  className="mt-1 shrink-0 text-[var(--pmx-faint)] group-hover:text-[var(--pmx-primary)]"
                />
              </button>
            ))
        )}
      </div>
    </div>
  )
}
