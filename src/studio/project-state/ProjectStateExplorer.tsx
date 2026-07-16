import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Braces,
  LayoutList,
  RefreshCw,
} from 'lucide-react'
import { useV6ProjectState } from '@/hooks/useV6ProjectState'
import type { ProjectStateSectionId } from './types'
import { buildProjectStateSections } from './projectStateMetrics'
import ExplorerSidebar from './ExplorerSidebar'
import ExplorerContent from './ExplorerContent'

export default function ProjectStateExplorer() {
  const [activeSection, setActiveSection] =
    useState<ProjectStateSectionId>('project')

  const [mode, setMode] =
    useState<'structured' | 'json'>('structured')

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useV6ProjectState()

  const sections = useMemo(
    () =>
      data
        ? buildProjectStateSections(data)
        : [],
    [data]
  )

  const active = useMemo(
    () =>
      sections.find(
        section =>
          section.id === activeSection
      ) || sections[0],
    [sections, activeSection]
  )

  if (isLoading) {
    return (
      <div className="pmx-state-loading">
        <div className="pmx-skeleton h-10 w-44" />
        <div className="pmx-skeleton h-96" />
      </div>
    )
  }

  if (isError || !data || !active) {
    return (
      <div className="pmx-state-error">
        <AlertTriangle size={19} />

        <div>
          <div className="text-sm font-semibold">
            Project State could not be loaded
          </div>

          <div className="mt-1 text-xs">
            {error instanceof Error
              ? error.message
              : 'No ProjectState is available for the selected project.'}
          </div>
        </div>

        <button
          type="button"
          className="pmx-btn-secondary pmx-btn-sm ml-auto"
          onClick={() => refetch()}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    )
  }

  const generatedAt =
    new Date(data.generatedAt)

  const ageSeconds = Math.max(
    0,
    Math.floor(
      (Date.now() -
        generatedAt.getTime()) /
        1000
    )
  )

  return (
    <div>
      <div className="pmx-state-toolbar">
        <div>
          <div className="text-sm font-semibold text-[var(--pmx-text)]">
            {data.project.name}
          </div>

          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--pmx-muted)]">
            <span>
              Generated{' '}
              {generatedAt.toLocaleString('en-GB')}
            </span>

            <span>•</span>

            <span>
              {ageSeconds < 60
                ? `${ageSeconds}s old`
                : `${Math.floor(ageSeconds / 60)}m old`}
            </span>

            <span>•</span>

            <span>Source: Supabase</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="pmx-state-view-toggle">
            <button
              type="button"
              className={
                mode === 'structured'
                  ? 'is-active'
                  : ''
              }
              onClick={() =>
                setMode('structured')
              }
            >
              <LayoutList size={14} />
              Structured
            </button>

            <button
              type="button"
              className={
                mode === 'json'
                  ? 'is-active'
                  : ''
              }
              onClick={() =>
                setMode('json')
              }
            >
              <Braces size={14} />
              JSON
            </button>
          </div>

          <button
            type="button"
            className="pmx-btn-secondary pmx-btn-sm"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw
              size={14}
              className={
                isFetching
                  ? 'animate-spin'
                  : ''
              }
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="pmx-state-explorer">
        <ExplorerSidebar
          sections={sections}
          activeSection={activeSection}
          onSelect={setActiveSection}
        />

        <ExplorerContent
          section={active}
          mode={mode}
        />
      </div>
    </div>
  )
}
