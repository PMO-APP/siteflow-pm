import {
  CalendarClock,
  ChevronRight,
  CircleCheck,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  useDecisionQueue,
  useUpdateDecisionStatus,
} from '@/hooks/useDecisionQueue'
import { SectionHeader } from '@/components/ui'

function formatDate(value?: string | null) {
  if (!value) return 'No due date'
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'No due date'
  }

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
}

export default function DecisionPanel({
  maxItems = 5,
}: {
  maxItems?: number
}) {
  const navigate = useNavigate()
  const { data = [], isLoading } =
    useDecisionQueue()

  const updateStatus =
    useUpdateDecisionStatus()

  const items = data as any[]

  return (
    <div className="pmx-card p-5">
      <SectionHeader
        eyebrow="Management"
        title="Decisions Required"
        description="Items waiting for management review or approval."
        action={
          items.length > 0 ? (
            <span className="text-xs font-medium text-[var(--pmx-muted)]">
              {items.length} open
            </span>
          ) : null
        }
      />

      <div className="mt-4 space-y-2">
        {isLoading ? (
          [1, 2, 3].map(item => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-xl bg-[var(--pmx-surface-2)]"
            />
          ))
        ) : items.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[var(--pmx-border)] bg-[var(--pmx-surface-2)]">
            <div className="text-center">
              <CircleCheck
                size={22}
                className="mx-auto text-emerald-400"
              />
              <div className="mt-2 text-sm font-semibold text-[var(--pmx-text)]">
                No management decision is pending
              </div>
              <div className="mt-1 text-xs text-[var(--pmx-muted)]">
                All escalated decisions are currently resolved.
              </div>
            </div>
          </div>
        ) : (
          items
            .slice(0, maxItems)
            .map(item => (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-[var(--pmx-primary-soft)] p-2 text-[var(--pmx-primary)]">
                    <CalendarClock size={16} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--pmx-text)]">
                      {item.title}
                    </div>

                    {item.description ? (
                      <div className="mt-1 text-xs leading-5 text-[var(--pmx-muted)]">
                        {item.description}
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--pmx-faint)]">
                      <span>{item.module}</span>
                      <span>•</span>
                      <span>{formatDate(item.due_date)}</span>
                      {item.owner_name ? (
                        <>
                          <span>•</span>
                          <span>{item.owner_name}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="pmx-btn-ghost pmx-btn-sm"
                    onClick={() => {
                      if (item.route) {
                        navigate(item.route)
                      } else {
                        updateStatus.mutate({
                          id: item.id,
                          status: 'in_review',
                        })
                      }
                    }}
                  >
                    Review
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
