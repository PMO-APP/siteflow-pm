import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileCheck,
  Shield,
  TrendingUp,
} from 'lucide-react'

import { useMembershipStore } from '@/store/membership'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import { useProjectIntelligence } from '@/hooks/useProjectIntelligence'
import RoleAwareCommandSections from './RoleAwareCommandSections'

import HealthTrend from './HealthTrend'

import {
  ActivityFeed,
  CommandCard,
  HealthGauge,
  InsightPanel,
  MetricCard,
  SectionHeader,
  TimelineBar,
} from '@/components/ui'

function formatDate(value?: Date | null) {
  if (!value) return '—'

  return value.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function relativeTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const minutes = Math.floor(
    (Date.now() - date.getTime()) / 60000
  )

  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`

  return `${Math.floor(minutes / 1440)}d`
}

function getHealthTone(score: number) {
  if (score >= 85) return 'success'
  if (score >= 70) return 'primary'
  if (score >= 50) return 'warning'

  return 'danger'
}

function getMetricTone(score: number) {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'

  return 'danger'
}
<RoleAwareCommandSections project={project} />
export default function RoleBasedCommandCenter({
  project,
}: {
  project?: any
}) {
  const navigate = useNavigate()

  const role = useMembershipStore(state => state.role)

  const intelligence = useProjectIntelligence({
    project,
  })

  const {
    data: activity = [],
    isLoading: activityLoading,
  } = useActivityFeed(12)

  const activityItems = useMemo(() => {
    return (activity as any[]).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      timestamp: relativeTime(item.created_at),
      actor: item.actor_name || item.module,
      icon: Activity,
      tone:
        item.severity === 'critical'
          ? 'danger'
          : item.severity === 'warning'
            ? 'warning'
            : item.severity === 'success'
              ? 'success'
              : 'primary',
    }))
  }, [activity])

  const isExecutive = [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
  ].includes(role || '')

  const headline =
    intelligence.health.score >= 85
      ? 'Project delivery is healthy.'
      : intelligence.health.score >= 70
        ? 'Project remains recoverable.'
        : intelligence.health.score >= 50
          ? 'Project requires management attention.'
          : 'Project is in a critical delivery position.'

  const forecastTone =
    intelligence.forecast.status === 'on_track'
      ? 'success'
      : intelligence.forecast.status === 'watch'
        ? 'primary'
        : intelligence.forecast.status ===
            'recovery_required'
          ? 'warning'
          : 'danger'

  const delayTone =
    intelligence.forecast.daysBehind === 0
      ? 'success'
      : intelligence.forecast.daysBehind <= 7
        ? 'primary'
        : intelligence.forecast.daysBehind <= 30
          ? 'warning'
          : 'danger'

  const deliveryPulseSegments = [
    {
      id: 'schedule',
      label: 'Schedule',
      value: intelligence.health.breakdown.schedule,
      tone: getMetricTone(
        intelligence.health.breakdown.schedule
      ),
    },
    {
      id: 'commercial',
      label: 'Commercial',
      value: intelligence.health.breakdown.commercial,
      tone: getMetricTone(
        intelligence.health.breakdown.commercial
      ),
    },
    {
      id: 'quality',
      label: 'Quality',
      value: intelligence.health.breakdown.quality,
      tone: getMetricTone(
        intelligence.health.breakdown.quality
      ),
    },
    {
      id: 'risk',
      label: 'Risk',
      value: intelligence.health.breakdown.risk,
      tone: getMetricTone(
        intelligence.health.breakdown.risk
      ),
    },
    {
      id: 'governance',
      label: 'Governance',
      value: intelligence.health.breakdown.governance,
      tone: getMetricTone(
        intelligence.health.breakdown.governance
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Project Command Center"
        title={
          isExecutive
            ? 'Executive delivery view'
            : 'Your project workspace'
        }
        description="Live intelligence from schedule, commercial, quality, risk, procurement, approvals and governance."
      />

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <CommandCard
          title="Forecast Completion"
          value={formatDate(
            intelligence.forecast.forecastDate
          )}
          description={`Target: ${formatDate(
            intelligence.forecast.targetDate
          )}`}
          icon={CalendarDays}
          tone={forecastTone}
          status={
            intelligence.forecast.daysBehind === 0
              ? 'On target'
              : `+${intelligence.forecast.daysBehind} days`
          }
          statusTone={delayTone}
          footer="Delay is calculated by comparing today’s planned schedule position with the actual site position."
        >
          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <HealthGauge
              value={intelligence.health.score}
              label="Project Health"
              helper={intelligence.health.label}
              size="md"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--pmx-faint)]">
                  Should be today
                </div>

                <div className="mt-2 text-base font-semibold text-[var(--pmx-text)]">
                  {intelligence.forecast.plannedPosition
                    ?.name || 'No planned position found'}
                </div>

                <div className="mt-2 text-xs text-[var(--pmx-muted)]">
                  Planned schedule position as at today
                </div>
              </div>

              <div className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--pmx-faint)]">
                  Actual site position
                </div>

                <div className="mt-2 text-base font-semibold text-[var(--pmx-text)]">
                  {intelligence.forecast.actualPosition
                    ?.name || 'No active site position found'}
                </div>

                <div className="mt-2 text-xs text-[var(--pmx-muted)]">
                  Current progress position from the programme
                </div>
              </div>

              <div className="rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--pmx-faint)]">
                      Schedule position gap
                    </div>

                    <div className="mt-1 text-2xl font-semibold text-[var(--pmx-text)]">
                      {intelligence.forecast.activityGap}{' '}
                      activity step
                      {intelligence.forecast.activityGap === 1
                        ? ''
                        : 's'}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="pmx-btn-secondary"
                    onClick={() =>
                      navigate('/app/recovery')
                    }
                  >
                    Open recovery view
                  </button>
                </div>
              </div>
            </div>
          </div>
        </CommandCard>

        <InsightPanel
          title="Today's Intelligence"
          summary={headline}
          points={[
            ...intelligence.health.drivers,
            ...intelligence.governance.exceptions
              .slice(0, 3)
              .map((item: any) => item.title),
          ].slice(0, 5)}
          badge="Live"
          tone={
            intelligence.health.score >= 70
              ? 'primary'
              : 'warning'
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Schedule Progress"
          value={`${intelligence.metrics.scheduleProgress}%`}
          helper={`Planned position: ${intelligence.metrics.plannedProgress}%`}
          icon={TrendingUp}
          tone={
            intelligence.metrics.scheduleProgress >=
            intelligence.metrics.plannedProgress
              ? 'success'
              : 'warning'
          }
          action={
            <button
              type="button"
              className="pmx-btn-ghost pmx-btn-sm"
              onClick={() =>
                navigate('/app/schedule')
              }
            >
              View
            </button>
          }
        />

        <MetricCard
          label="Overdue Tasks"
          value={intelligence.metrics.overdueTasks}
          helper="Activities beyond planned finish"
          icon={AlertTriangle}
          tone={
            intelligence.metrics.overdueTasks > 0
              ? 'danger'
              : 'success'
          }
          action={
            <button
              type="button"
              className="pmx-btn-ghost pmx-btn-sm"
              onClick={() =>
                navigate('/app/schedule')
              }
            >
              View
            </button>
          }
        />

        <MetricCard
          label="Pending Approvals"
          value={intelligence.metrics.pendingApprovals}
          helper={`${intelligence.metrics.overdueApprovals} overdue`}
          icon={FileCheck}
          tone={
            intelligence.metrics.overdueApprovals > 0
              ? 'danger'
              : intelligence.metrics.pendingApprovals > 0
                ? 'warning'
                : 'success'
          }
          action={
            <button
              type="button"
              className="pmx-btn-ghost pmx-btn-sm"
              onClick={() =>
                navigate('/app/approvals')
              }
            >
              View
            </button>
          }
        />

        <MetricCard
          label="Governance"
          value={`${intelligence.governance.score}%`}
          helper={
            intelligence.governance.complianceLabel
          }
          icon={Shield}
          tone={getHealthTone(
            intelligence.governance.score
          )}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="pmx-card p-5">
          <SectionHeader
            title="Delivery Pulse"
            description="Current health across the main project controls."
          />

          <div className="mt-5">
            <TimelineBar
              showLegend={false}
              segments={deliveryPulseSegments as any}
              onSegmentClick={segment => {
                if (segment.id === 'schedule') {
                  navigate('/app/schedule')
                }

                if (segment.id === 'commercial') {
                  navigate('/app/costing')
                }

                if (segment.id === 'quality') {
                  navigate('/app/quality')
                }

                if (segment.id === 'risk') {
                  navigate('/app/risk')
                }
              }}
            />
          </div>
        </div>

        <div className="pmx-card p-5">
          <SectionHeader
            title="Health Trend"
            description="Movement in project health over the last 30 days."
          />

          <div className="mt-5">
            <HealthTrend days={30} />
          </div>
        </div>

        <div className="pmx-card p-5">
          <SectionHeader
            title="Live Activity"
            description="Recent actions across PMOCorex modules."
          />

          <div className="mt-3">
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(item => (
                  <div
                    key={item}
                    className="h-16 animate-pulse rounded-lg bg-[var(--pmx-surface-2)]"
                  />
                ))}
              </div>
            ) : (
              <ActivityFeed
                items={activityItems as any}
                emptyText="No recent activity has been recorded."
                maxItems={6}
                onItemClick={item => {
                  const activityItem = (
                    activity as any[]
                  ).find(
                    row =>
                      String(row.id) ===
                      String(item.id)
                  )

                  if (activityItem?.route) {
                    navigate(activityItem.route)
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="pmx-card p-5">
        <SectionHeader
          title="Governance Exceptions"
          description="Management, reporting and compliance gaps automatically detected by PMOCorex."
          action={
            intelligence.governance.exceptions.length >
            0 ? (
              <span className="text-xs font-medium text-[var(--pmx-muted)]">
                {
                  intelligence.governance.exceptions
                    .length
                }{' '}
                exception
                {intelligence.governance.exceptions
                  .length === 1
                  ? ''
                  : 's'}
              </span>
            ) : null
          }
        />

        <div className="mt-4">
          {intelligence.governance.exceptions.length ===
          0 ? (
            <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[var(--pmx-border)] bg-[var(--pmx-surface-2)]">
              <div className="text-center">
                <CheckCircle2
                  size={22}
                  className="mx-auto text-emerald-400"
                />

                <div className="mt-2 text-sm font-semibold text-[var(--pmx-text)]">
                  No governance exception detected
                </div>

                <div className="mt-1 text-xs text-[var(--pmx-muted)]">
                  The project is currently meeting the
                  monitored governance requirements.
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {intelligence.governance.exceptions
                .slice(0, 9)
                .map(item => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      if (item.route) {
                        navigate(item.route)
                      }
                    }}
                    className="group rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-4 text-left transition hover:border-[var(--pmx-border-strong)] hover:bg-[var(--pmx-surface-3)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-[var(--pmx-text)]">
                        {item.title}
                      </div>

                      <span
                        className={
                          item.severity === 'critical'
                            ? 'h-2 w-2 flex-shrink-0 rounded-full bg-red-400'
                            : item.severity ===
                                'warning'
                              ? 'h-2 w-2 flex-shrink-0 rounded-full bg-amber-400'
                              : 'h-2 w-2 flex-shrink-0 rounded-full bg-blue-400'
                        }
                      />
                    </div>

                    <div className="mt-2 text-xs leading-5 text-[var(--pmx-muted)]">
                      {item.description}
                    </div>

                    <div className="mt-3 text-xs font-medium text-[var(--pmx-primary)] opacity-0 transition group-hover:opacity-100">
                      Open module →
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
