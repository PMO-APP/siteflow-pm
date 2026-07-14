import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTodayFocus } from '@/hooks/useTodayFocus'
import { SectionHeader } from '@/components/ui'

export default function TodaysFocusPanel({
  project,
  maxItems = 6,
}: {
  project?: any
  maxItems?: number
}) {
  const navigate = useNavigate()
  const focus = useTodayFocus({ project })

  return (
    <div className="pmx-card p-5">
      <SectionHeader
        eyebrow="Action Queue"
        title="Today's Focus"
        description="The most important actions requiring attention today."
        action={
          focus.items.length > 0 ? (
            <span className="text-xs font-medium text-[var(--pmx-muted)]">
              {focus.criticalCount} critical
            </span>
          ) : null
        }
      />

      <div className="mt-4 space-y-2">
        {focus.items.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[var(--pmx-border)] bg-[var(--pmx-surface-2)]">
            <div className="text-center">
              <CheckCircle2
                size={22}
                className="mx-auto text-emerald-400"
              />
              <div className="mt-2 text-sm font-semibold text-[var(--pmx-text)]">
                No urgent action detected
              </div>
              <div className="mt-1 text-xs text-[var(--pmx-muted)]">
                PMOCorex has not identified an immediate delivery exception.
              </div>
            </div>
          </div>
        ) : (
          focus.items
            .slice(0, maxItems)
            .map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  if (item.route) {
                    navigate(item.route)
                  }
                }}
                className="group flex w-full items-start gap-3 rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4 text-left transition hover:border-[var(--pmx-border-strong)] hover:bg-[var(--pmx-surface-3)]"
              >
                <div
                  className={
                    item.severity === 'critical'
                      ? 'mt-0.5 rounded-lg bg-red-500/10 p-2 text-red-400'
                      : item.severity === 'warning'
                      ? 'mt-0.5 rounded-lg bg-amber-500/10 p-2 text-amber-400'
                      : 'mt-0.5 rounded-lg bg-blue-500/10 p-2 text-blue-400'
                  }
                >
                  <AlertTriangle size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-[var(--pmx-text)]">
                      {item.title}
                    </div>

                    {item.dueLabel ? (
                      <span className="rounded-full border border-[var(--pmx-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--pmx-muted)]">
                        {item.dueLabel}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1 text-xs leading-5 text-[var(--pmx-muted)]">
                    {item.description}
                  </div>
                </div>

                <ChevronRight
                  size={16}
                  className="mt-1 shrink-0 text-[var(--pmx-faint)] transition group-hover:translate-x-0.5 group-hover:text-[var(--pmx-primary)]"
                />
              </button>
            ))
        )}
      </div>
    </div>
  )
}
