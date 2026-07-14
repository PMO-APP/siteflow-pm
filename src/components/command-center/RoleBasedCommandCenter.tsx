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
  const minutes = Math.floor(
    (Date.now() - new Date(value).getTime()) / 60000
  )
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1440)}d`
}

export default function RoleBasedCommandCenter({
  project,
}: {
  project?: any
}) {
  const navigate = useNavigate()
  const role = useMembershipStore(state => state.role)
  const intelligence = useProjectIntelligence({ project })
  const { data: activity = [] } = useActivityFeed(12)

  const activityItems = useMemo(
    () =>
      (activity as any[]).map(item => ({
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
      })),
    [activity]
  )

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

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Project Command Center"
        title={isExecutive ? 'Executive delivery view' : 'Your project workspace'}
        description="Live intelligence from schedule, commercial, quality, risk, procurement, approvals and governance."
      />

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <CommandCard
          title="Forecast Completion"
          value={formatDate(intelligence.forecast.forecastDate)}
          description={`Target: ${formatDate(intelligence.forecast.targetDate)}`}
          icon={CalendarDays}
          tone={
            intelligence.forecast.status === 'on_track'
              ? 'success'
              : intelligence.forecast.status === 'watch'
              ? 'primary'
              : intelligence.forecast.status === 'recovery_required'
              ? 'warning'
              : 'danger'
          }
          status={
            intelligence.forecast.daysBehind === 0
              ? 'On target'
              : `+${intelligence.forecast.daysBehind} days`
          }
          statusTone={
            intelligence.forecast.daysBehind === 0
              ? 'success'
              : intelligence.forecast.daysBehind <= 7
              ? 'primary'
              : intelligence.forecast.daysBehind <= 30
              ? 'warning'
              : 'danger'
          }
          footer="Delay is calculated from today’s planned schedule position against actual site position."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <HealthGauge
              value={intelligence.health.score}
              label="Project Health"
              helper={intelligence.health.label}
              size="md"
            />

            <div className="space-y-4">
              <div>
                <div className="text-xs text-[var(--pmx-faint)]">Should be today</div>
                <div className="mt-1 text-sm font-semibold text-[var(--pmx-text)]">
                  {intelligence.forecast.plannedPosition?.name || '—'}
                </div>
              </div>

              <div>
                <div className="text-xs text-[var(--pmx-faint)]">Actual site position</div>
                <div className="mt-1 text-sm font-semibold text-[var(--pmx-text)]">
                  {intelligence.forecast.actualPosition?.name || '—'}
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
              .map(item => item.title),
          ].slice(0, 5)}
          badge="Live"
          tone={intelligence.health.score >= 70 ? 'primary' : 'warning'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Schedule Progress"
          value={`${intelligence.metrics.scheduleProgress}%`}
          helper={`Planned: ${intelligence.metrics.plannedProgress}%`}
          icon={TrendingUp}
          tone={
            intelligence.metrics.scheduleProgress >=
            intelligence.metrics.plannedProgress
              ? 'success'
              : 'warning'
          }
        />

        <MetricCard
          label="Overdue Tasks"
          value={intelligence.metrics.overdueTasks}
          helper="Past planned finish"
          icon={AlertTriangle}
          tone={
            intelligence.metrics.overdueTasks > 0
              ? 'danger'
              : 'success'
          }
          action={
            <button
              className="pmx-btn-ghost pmx-btn-sm"
              onClick={() => navigate('/app/schedule')}
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
        />

        <MetricCard
          label="Governance"
          value={`${intelligence.governance.score}%`}
          helper={intelligence.governance.complianceLabel}
          icon={Shield}
          tone={
            intelligence.governance.score >= 85
              ? 'success'
              : intelligence.governance.score >= 70
              ? 'primary'
              : intelligence.governance.score >= 50
              ? 'warning'
              : 'danger'
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="pmx-card p-5">
          <SectionHeader
            title="Delivery Pulse"
            description="Health across the main project controls."
          />
          <div className="mt-5">
            <TimelineBar
              showLegend={false}
              segments={[
                { id: 'schedule', label: 'Schedule', value: intelligence.health.breakdown.schedule, tone: intelligence.health.breakdown.schedule >= 80 ? 'success' : intelligence.health.breakdown.schedule >= 60 ? 'warning' : 'danger' },
                { id: 'commercial', label: 'Commercial', value: intelligence.health.breakdown.commercial, tone: intelligence.health.breakdown.commercial >= 80 ? 'success' : intelligence.health.breakdown.commercial >= 60 ? 'warning' : 'danger' },
                { id: 'quality', label: 'Quality', value: intelligence.health.breakdown.quality, tone: intelligence.health.breakdown.quality >= 80 ? 'success' : intelligence.health.breakdown.quality >= 60 ? 'warning' : 'danger' },
                { id: 'risk', label: 'Risk', value: intelligence.health.breakdown.risk, tone: intelligence.health.breakdown.risk >= 80 ? 'success' : intelligence.health.breakdown.risk >= 60 ? 'warning' : 'danger' },
                { id: 'governance', label: 'Governance', value: intelligence.health.breakdown.governance, tone: intelligence.health.breakdown.governance >= 80 ? 'success' : intelligence.health.breakdown.governance >= 60 ? 'warning' : 'danger' },
              ]}
            />
          </div>
        </div>

        <div className="pmx-card p-5">
          <SectionHeader
            title="Live Activity"
            description="Recent events across PMOCorex modules."
          />
          <div className="mt-3">
            <ActivityFeed items={activityItems as any} />
          </div>
        </div>
      </div>

      <div className="pmx-card p-5">
        <SectionHeader
          title="Governance Exceptions"
          description="Automatically detected management and compliance gaps."
        />

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {intelligence.governance.exceptions.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 size={16} />
              No governance exception detected.
            </div>
          ) : (
            intelligence.governance.exceptions.slice(0, 8).map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => item.route && navigate(item.route)}
                className="rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3 text-left hover:border-[var(--pmx-border-strong)]"
              >
                <div className="text-sm font-semibold text-[var(--pmx-text)]">
                  {item.title}
                </div>
                <div className="mt-1 text-xs text-[var(--pmx-muted)]">
                  {item.description}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
