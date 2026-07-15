import {
  ArrowDown,
  CircleAlert,
} from 'lucide-react'
import type { RootCauseResult } from '@/core/intelligence/root-cause/rootCauseTypes'
import {
  SectionHeader,
  StatusPill,
} from '@/components/ui'

export default function RootCausePanel({
  rootCause,
}: {
  rootCause: RootCauseResult
}) {
  return (
    <div className="pmx-card p-5">
      <SectionHeader
        eyebrow="Dependency Analysis"
        title="Root Cause"
        description={rootCause.explanation}
        action={
          <StatusPill
            label={`${rootCause.confidence}% confidence`}
            tone={
              rootCause.confidence >= 80
                ? 'success'
                : rootCause.confidence >= 60
                ? 'warning'
                : 'neutral'
            }
          />
        }
      />

      <div className="mt-5">
        {rootCause.dependencyChain.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[var(--pmx-border)] text-sm text-[var(--pmx-faint)]">
            No dependency chain is available.
          </div>
        ) : (
          <div className="space-y-2">
            {rootCause.dependencyChain.map(
              (item, index) => (
                <div key={item.id}>
                  <div
                    className={
                      index === 0
                        ? 'flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4'
                        : 'flex items-center gap-3 rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4'
                    }
                  >
                    <CircleAlert
                      size={17}
                      className={
                        index === 0
                          ? 'text-red-400'
                          : 'text-[var(--pmx-muted)]'
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[var(--pmx-text)]">
                        {item.name}
                      </div>
                      <div className="mt-1 text-xs text-[var(--pmx-muted)]">
                        {item.progress}% complete
                        {item.isCritical
                          ? ' · Critical path'
                          : ''}
                        {item.isBlocked
                          ? ' · Blocked'
                          : ''}
                      </div>
                    </div>
                  </div>

                  {index <
                  rootCause.dependencyChain.length -
                    1 ? (
                    <ArrowDown
                      size={16}
                      className="mx-auto my-1 text-[var(--pmx-faint)]"
                    />
                  ) : null}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
