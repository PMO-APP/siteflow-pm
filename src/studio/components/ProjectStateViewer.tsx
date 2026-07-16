import {
  AlertTriangle,
  Braces,
  RefreshCw,
} from 'lucide-react'

import { useV6ProjectState } from '@/hooks/useV6ProjectState'

export default function ProjectStateViewer() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useV6ProjectState()

  if (isLoading) {
    return (
      <section className="pmx-section-panel p-5">
        <div className="pmx-skeleton h-72" />
      </section>
    )
  }

  if (isError) {
    return (
      <section className="pmx-section-panel p-5">
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-red-400">
          <AlertTriangle size={18} />

          <div>
            <div className="text-sm font-semibold">
              Project State could not be loaded
            </div>

            <div className="mt-1 text-xs">
              {error instanceof Error
                ? error.message
                : 'An unknown error occurred.'}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="pmx-section-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="pmx-eyebrow">
            V6 Project State
          </div>

          <h2 className="mt-2 text-lg font-semibold text-[var(--pmx-text)]">
            Project State Explorer
          </h2>

          <p className="mt-1 text-sm text-[var(--pmx-muted)]">
            Inspect the normalized state used by the V6 intelligence pipeline.
          </p>
        </div>

        <button
          type="button"
          className="pmx-btn-secondary pmx-btn-sm"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          <RefreshCw
            size={14}
            className={isFetching ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {data ? (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[var(--pmx-muted)]">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Loaded
            </span>

            <span>
              Project: {data.project.name}
            </span>

            <span>
              Schedule activities: {data.schedule.length}
            </span>
          </div>

          <div className="pmx-dev-code pmx-scrollbar mt-4">
            <div className="mb-3 flex items-center gap-2 text-[var(--pmx-faint)]">
              <Braces size={15} />
              Normalized ProjectState JSON
            </div>

            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--pmx-border)] p-8 text-center text-sm text-[var(--pmx-muted)]">
          No Project State is available for the selected project.
        </div>
      )}
    </section>
  )
}
