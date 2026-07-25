import V6IntelligenceComparison from '@/components/dev/V6IntelligenceComparison'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'

import { useMembershipStore } from '@/store/membership'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import { useProjectIntelligence } from '@/hooks/useProjectIntelligence'

import RoleAwareCommandSections from './RoleAwareCommandSections'
import ReadinessPanel from './ReadinessPanel'
import ProductionPanel from './ProductionPanel'
import RootCausePanel from './RootCausePanel'
import RecommendationsPanel from './RecommendationsPanel'
import HealthTrend from './HealthTrend'
import DeliveryTwinPanel from './DeliveryTwinPanel'

import {
  ActivityFeed,
  MetricCard,
  SectionHeader,
  StatusPill,
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
  if (Number.isNaN(date.getTime())) return ''
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1440)}d`
}

function healthTone(score: number) {
  if (score >= 85) return 'success'
  if (score >= 70) return 'primary'
  if (score >= 50) return 'warning'
  return 'danger'
}

function metricTone(score: number) {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

export default function RoleBasedCommandCenter({ project }: { project?: any }) {
  const navigate = useNavigate()
  const role = useMembershipStore(state => state.role)
  const intelligence = useProjectIntelligence({ project })
  const { data: activity = [], isLoading: activityLoading } = useActivityFeed(10)

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

  const isExecutive = ['workspace_admin', 'admin', 'pmo', 'portfolio_manager'].includes(role || '')
  const forecast = intelligence.forecastV2
  const recommendations = intelligence.recommendations.items.slice(0, 3)

  const deliveryPulseSegments = [
    { id: 'schedule', label: 'Schedule', value: intelligence.health.breakdown.schedule, tone: metricTone(intelligence.health.breakdown.schedule) },
    { id: 'commercial', label: 'Commercial', value: intelligence.health.breakdown.commercial, tone: metricTone(intelligence.health.breakdown.commercial) },
    { id: 'quality', label: 'Quality', value: intelligence.health.breakdown.quality, tone: metricTone(intelligence.health.breakdown.quality) },
    { id: 'risk', label: 'Risk', value: intelligence.health.breakdown.risk, tone: metricTone(intelligence.health.breakdown.risk) },
    { id: 'governance', label: 'Governance', value: intelligence.health.breakdown.governance, tone: metricTone(intelligence.health.breakdown.governance) },
  ]

  return (
    <div className="pmx-command-v2">
      <section className="pmx-executive-brief">
        <div className="pmx-executive-brief-copy">
          <div className="pmx-eyebrow">Project command center</div>
          <div className="pmx-executive-heading-row">
            <div>
              <h1 className="pmx-executive-title">
                {project?.project_name || project?.name || 'Selected Project'}
              </h1>
              <p className="pmx-executive-subtitle">
                {isExecutive ? 'Executive delivery briefing' : 'Project delivery workspace'}
              </p>
            </div>
            <StatusPill label={intelligence.health.label} tone={healthTone(intelligence.health.score)} dot />
          </div>

          <div className="pmx-briefing-copy">
            <span className="pmx-briefing-lead">Current outlook.</span>{' '}
            {intelligence.narrative.summary}
          </div>

          <div className="pmx-briefing-actions">
            <button type="button" className="pmx-btn-primary" onClick={() => navigate('/app/recovery')}>
              Open recovery plan <ArrowRight size={15} />
            </button>
            <button type="button" className="pmx-btn-secondary" onClick={() => navigate('/app/schedule')}>
              Review programme
            </button>
          </div>
        </div>

        <div className="pmx-health-score-card">
          <div className="pmx-health-score-topline">
            <span>Project health</span>
            <Target size={17} />
          </div>
          <div className="pmx-health-score-value">{intelligence.health.score}</div>
          <div className="pmx-health-score-scale">out of 100</div>
          <div className="pmx-health-score-track">
            <div style={{ width: `${Math.max(0, Math.min(100, intelligence.health.score))}%` }} />
          </div>
          <div className="pmx-health-score-footer">
            <span>{intelligence.health.label}</span>
            <span>{forecast.recoveryConfidence}% recovery confidence</span>
          </div>
        </div>
      </section>

      <section className="pmx-command-strip" aria-label="Executive metrics">
        <div><span>Forecast completion</span><strong>{formatDate(forecast.forecastDate)}</strong><small>Target {formatDate(forecast.targetDate)}</small></div>
        <div><span>Progress</span><strong>{intelligence.metrics.scheduleProgress}%</strong><small>Planned {intelligence.metrics.plannedProgress}%</small></div>
        <div><span>Delay</span><strong>{forecast.delayDays}</strong><small>days behind</small></div>
        <div><span>Open risks</span><strong>{intelligence.metrics.openRisks}</strong><small>{intelligence.metrics.highRisks} high</small></div>
        <div><span>Approvals</span><strong>{intelligence.metrics.pendingApprovals}</strong><small>{intelligence.metrics.overdueApprovals} overdue</small></div>
        <div><span>Snags</span><strong>{intelligence.metrics.openSnags}</strong><small>{intelligence.metrics.criticalSnags} critical</small></div>
      </section>

      <div className="pmx-command-primary-grid">
        <section className="pmx-section-panel pmx-priority-panel">
          <SectionHeader
            eyebrow="Today"
            title="Executive priorities"
            description="The highest-impact actions from the current project position."
            action={<span className="pmx-priority-count">{recommendations.length} priorities</span>}
          />
          <div className="pmx-priority-list">
            {recommendations.length === 0 ? (
              <div className="pmx-empty-state">
                <CheckCircle2 size={22} className="text-emerald-500" />
                <div><div className="pmx-empty-title">No urgent intervention</div><div className="pmx-empty-copy">The current delivery position does not require an immediate management action.</div></div>
              </div>
            ) : recommendations.map((item: any, index: number) => (
              <button key={item.id} type="button" className="pmx-priority-item" onClick={() => item.route && navigate(item.route)}>
                <div className={`pmx-priority-index is-${item.priority || 'medium'}`}>{String(index + 1).padStart(2, '0')}</div>
                <div className="pmx-priority-body">
                  <div className="pmx-priority-meta"><span>{item.priority || 'priority'}</span>{item.expectedImpact ? <span>{item.expectedImpact}</span> : null}</div>
                  <div className="pmx-priority-title">{item.title}</div>
                  <div className="pmx-priority-copy">{item.description}</div>
                </div>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </section>

        <section className="pmx-intelligence-panel">
          <div className="pmx-intelligence-icon"><Sparkles size={18} /></div>
          <div className="pmx-eyebrow">Executive intelligence</div>
          <h2>{intelligence.narrative.headline}</h2>
          <p>{intelligence.narrative.outlook}</p>
          {intelligence.narrative.keyMessages.length > 0 ? (
            <div className="pmx-intelligence-points">
              {intelligence.narrative.keyMessages.slice(0, 3).map((message: string) => <div key={message}>{message}</div>)}
            </div>
          ) : null}
          <button type="button" onClick={() => navigate('/app/recovery')}>View intelligence detail <ArrowRight size={14} /></button>
        </section>
      </div>

      <DeliveryTwinPanel twin={intelligence.deliveryTwin} />
      {import.meta.env.DEV ? <V6IntelligenceComparison project={project} /> : null}

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <RoleAwareCommandSections project={project} />
        <section className="pmx-section-panel">
          <SectionHeader eyebrow="Delivery position" title="Planned vs actual" description="Current workfront compared with the scheduled position for today." />
          <div className="mt-5 space-y-4">
            <div className="pmx-position-row"><div><div className="pmx-position-label">Should be today</div><div className="pmx-position-value">{forecast.plannedPosition?.name || 'No planned position found'}</div></div><CalendarDays size={18} className="text-[var(--pmx-muted)]" /></div>
            <div className="pmx-position-row"><div><div className="pmx-position-label">Actual site position</div><div className="pmx-position-value">{forecast.actualPosition?.name || 'No active site position found'}</div></div><Clock3 size={18} className="text-[var(--pmx-muted)]" /></div>
            <div className="pmx-position-gap"><div><div className="pmx-position-label">Activity gap</div><div className="pmx-position-gap-value">{forecast.activityGap}</div></div><div className="pmx-position-gap-copy">activity step{forecast.activityGap === 1 ? '' : 's'} behind</div></div>
          </div>
        </section>
      </div>

      <section className="pmx-section-panel">
        <SectionHeader eyebrow="Delivery controls" title="Project pulse" description="Current performance across the main delivery dimensions." />
        <div className="mt-5 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <TimelineBar showLegend={false} segments={deliveryPulseSegments as any} onSegmentClick={segment => {
            if (segment.id === 'schedule') navigate('/app/schedule')
            if (segment.id === 'commercial') navigate('/app/costing')
            if (segment.id === 'quality') navigate('/app/quality')
            if (segment.id === 'risk') navigate('/app/risk')
          }} />
          <HealthTrend days={30} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2"><ReadinessPanel readiness={intelligence.readiness} /><ProductionPanel forecast={forecast} /></div>
      <div className="grid gap-4 xl:grid-cols-2"><RootCausePanel rootCause={intelligence.rootCause} /><RecommendationsPanel recommendations={intelligence.recommendations} /></div>

      <section className="pmx-section-panel">
        <SectionHeader eyebrow="Operational metrics" title="Key controls" description="Supporting project indicators requiring regular monitoring." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Schedule Progress" value={`${intelligence.metrics.scheduleProgress}%`} helper={`Planned ${intelligence.metrics.plannedProgress}%`} icon={TrendingUp} tone={intelligence.metrics.scheduleProgress >= intelligence.metrics.plannedProgress ? 'success' : 'warning'} compact />
          <MetricCard label="Overdue Tasks" value={intelligence.metrics.overdueTasks} helper="Beyond planned finish" icon={AlertTriangle} tone={intelligence.metrics.overdueTasks > 0 ? 'danger' : 'success'} compact />
          <MetricCard label="Pending Approvals" value={intelligence.metrics.pendingApprovals} helper={`${intelligence.metrics.overdueApprovals} overdue`} icon={FileCheck} tone={intelligence.metrics.overdueApprovals > 0 ? 'danger' : intelligence.metrics.pendingApprovals > 0 ? 'warning' : 'success'} compact />
          <MetricCard label="Governance" value={`${intelligence.governance.score}%`} helper={intelligence.governance.complianceLabel} icon={Shield} tone={healthTone(intelligence.governance.score)} compact />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="pmx-section-panel">
          <SectionHeader eyebrow="System activity" title="Live activity" description="Recent changes across PMOCorex modules." />
          <div className="mt-3">{activityLoading ? <div className="space-y-3">{[1,2,3].map(item => <div key={item} className="h-16 animate-pulse rounded-lg bg-[var(--pmx-surface-2)]" />)}</div> : <ActivityFeed items={activityItems as any} emptyText="No recent activity has been recorded." maxItems={8} onItemClick={item => { const source = (activity as any[]).find(row => String(row.id) === String(item.id)); if (source?.route) navigate(source.route) }} />}</div>
        </section>
        <section className="pmx-section-panel">
          <SectionHeader eyebrow="Governance" title="Exceptions" description="Management, reporting and compliance gaps requiring attention." action={intelligence.governance.exceptions.length > 0 ? <span className="text-xs font-medium text-[var(--pmx-muted)]">{intelligence.governance.exceptions.length} open</span> : null} />
          <div className="mt-4">{intelligence.governance.exceptions.length === 0 ? <div className="pmx-empty-state"><CheckCircle2 size={22} className="text-emerald-500" /><div><div className="pmx-empty-title">No governance exception</div><div className="pmx-empty-copy">The monitored governance requirements are currently being met.</div></div></div> : <div className="divide-y divide-[var(--pmx-border)]">{intelligence.governance.exceptions.slice(0,8).map((item:any) => <button type="button" key={item.id} onClick={() => item.route && navigate(item.route)} className="pmx-exception-row"><span className={item.severity === 'critical' ? 'pmx-exception-dot is-critical' : item.severity === 'warning' ? 'pmx-exception-dot is-warning' : 'pmx-exception-dot is-info'} /><div className="min-w-0 flex-1"><div className="pmx-exception-title">{item.title}</div><div className="pmx-exception-copy">{item.description}</div></div><ArrowRight size={15} className="text-[var(--pmx-faint)]" /></button>)}</div>}</div>
        </section>
      </div>
    </div>
  )
}
