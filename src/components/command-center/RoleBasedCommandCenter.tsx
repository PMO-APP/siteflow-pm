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
import PackagePerformancePanel from './PackagePerformancePanel'
import ExecutiveFinancialSnapshot from './ExecutiveFinancialSnapshot'

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

  const isParkVillas = /park villa/i.test(String(project?.project_name || project?.name || ''))
  const progress = intelligence.metrics.scheduleProgress
  const planned = intelligence.metrics.plannedProgress
  const gap = progress - planned
  const packages = forecast.packagePositions || []
  // A package is assigned to a recovery group by its own name, never by a
  // neighbouring block's activity. Do not average unweighted package progress.
  const groupFor = (name: string): 'october' | 'december' | 'b13' | null => {
    const tokens = (name.toUpperCase().match(/\b(?:A|B)\s*\d{1,2}\b/g) || []).map(token => token.replace(/\s+/g, ''))
    if (tokens.includes('B13')) return 'b13'
    if (!tokens.length) return null
    const group = tokens.map(token => {
      const block = token[0]
      const number = Number(token.slice(1))
      if (block === 'A' && number >= 1 && number <= 14) return 'october'
      if (block === 'B' && number >= 1 && number <= 6) return 'october'
      if (block === 'B' && ((number >= 9 && number <= 12) || number === 14)) return 'december'
      return null
    })
    return group.every(value => value === group[0]) ? group[0] : null
  }
  const recoveryGroups = {
    october: packages.filter(item => groupFor(item.packageName) === 'october'),
    december: packages.filter(item => groupFor(item.packageName) === 'december'),
    b13: packages.filter(item => groupFor(item.packageName) === 'b13'),
  }
  const groupSummary = (items: typeof packages) => {
    if (!items.length) return 'No matching programme data'
    const delayed = items.filter(item => item.delayDays > 0).length
    const worst = Math.max(...items.map(item => item.delayDays))
    return `${items.length} package${items.length === 1 ? '' : 's'} assessed · ${delayed} delayed${worst > 0 ? ` · up to ${worst} days late` : ''}`
  }
  const shortSummary = forecast.delayDays > 0
    ? `Completion is forecast ${forecast.delayDays} days behind the current target. ${forecast.pressurePackage ? `${forecast.pressurePackage.packageName} needs particular attention.` : 'Review delivery constraints and recovery actions.'}`
    : 'Review the current forecast and delivery priorities.'

  return (
    <div className="pmx-command-v2 space-y-4">
      <section className="pmx-section-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="pmx-eyebrow">Project overview</div><h1 className="mt-1 text-3xl font-bold">{project?.project_name || project?.name || 'Selected Project'}</h1><p className="mt-2 max-w-3xl text-sm text-[var(--pmx-muted)]">{shortSummary}</p></div>
          <StatusPill label={intelligence.health.label} tone={healthTone(intelligence.health.score)} dot />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Actual progress', `${progress}%`, `Planned ${planned}%`],
            ['Forecast completion', formatDate(forecast.forecastDate), `Target ${formatDate(forecast.targetDate)}`],
            ['Schedule delay', `${forecast.delayDays} days`, 'Against target'],
            ['Project health', `${intelligence.health.score}/100`, intelligence.health.label],
          ].map(([label, value, detail]) => <div key={label} className="rounded-xl border border-[var(--pmx-border)] p-4"><div className="text-xs text-[var(--pmx-muted)]">{label}</div><div className="mt-2 text-xl font-bold">{value}</div><div className="mt-1 text-xs text-[var(--pmx-muted)]">{detail}</div></div>)}
        </div>
        <div className="mt-5 rounded-xl bg-[var(--pmx-surface-2)] p-4">
          <div className="mb-3 flex justify-between text-sm"><strong>Progress against programme</strong><span className={gap < 0 ? 'text-rose-600' : 'text-emerald-600'}>{gap > 0 ? '+' : ''}{gap.toFixed(1)} percentage points</span></div>
          {[['Actual', progress, 'bg-sky-700'], ['Planned', planned, 'bg-slate-400']].map(([label, value, color]) => <div key={String(label)} className="mb-3"><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span>{value}%</span></div><div className="h-2 rounded-full bg-slate-200"><div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, Number(value)))}%` }} /></div></div>)}
        </div>
      </section>

      <ExecutiveFinancialSnapshot physicalProgress={progress} />

      <section className="pmx-section-panel">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="pmx-eyebrow">Delivery performance</div><h2 className="mt-1 text-xl font-semibold">Delivery packages</h2></div><button className="pmx-btn-secondary" onClick={() => navigate('/app/schedule')}>Review programme →</button></div>
        {packages.length > 0 ? <div className="mt-4 grid gap-3 md:grid-cols-3">
          {isParkVillas ? <>
            {([
              ['october', 'October recovery · A1–A14, B1–B6', '31 Oct 2026'],
              ['december', 'December recovery · B9–B12, B14', '31 Dec 2026'],
              ['b13', 'Existing B13 programme', 'Original programme retained'],
            ] as const).map(([key, label, target]) => <div key={key} className="rounded-xl border border-[var(--pmx-border)] p-4">
              <div className="text-xs text-[var(--pmx-muted)]">{label}</div>
              <div className="mt-2 font-semibold">{target}</div>
              <div className="mt-1 text-xs text-[var(--pmx-muted)]">{key === 'b13' ? 'Approved package dates are unchanged' : 'Management recovery target, not an approved baseline'}</div>
              <div className="mt-3 border-t border-[var(--pmx-border)] pt-3 text-sm">{groupSummary(recoveryGroups[key])}</div>
            </div>)}
          </> : <div className="rounded-xl border border-[var(--pmx-border)] p-4">
            <div className="text-xs text-[var(--pmx-muted)]">Highest delivery pressure</div>
            <div className="mt-2 font-semibold">{forecast.pressurePackage?.packageName || 'Not identified'}</div>
            <div className="mt-1 text-xs text-[var(--pmx-muted)]">{forecast.pressurePackage ? `${forecast.pressurePackage.delayDays} days behind programme` : 'Review detailed package performance'}</div>
          </div>}
        </div> : <p className="mt-4 text-sm text-[var(--pmx-muted)]">No package programme has been recorded.</p>}
        {isParkVillas && packages.length > 0 && <p className="mt-2 text-xs text-[var(--pmx-muted)]">Package counts reflect identifiable schedule groups only. Forecast completion and cost-weighted progress are not inferred from activity sequence.</p>}
        <details className="mt-4"><summary className="cursor-pointer text-sm font-medium">View detailed package performance</summary><div className="mt-3"><PackagePerformancePanel packages={intelligence.deliveryTwin.packages} /></div></details>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="pmx-section-panel"><div className="pmx-eyebrow">Delivery constraints</div><h2 className="mt-1 text-xl font-semibold">Critical risks & constraints</h2>
          <p className="mt-3 text-sm">{forecast.pressurePackage ? `${forecast.pressurePackage.packageName}: ${forecast.pressurePackage.delayDays} days behind its programme.` : 'No specific package constraint identified.'}</p>
          <p className="mt-2 text-sm text-[var(--pmx-muted)]">{intelligence.metrics.highRisks} high risks · {intelligence.metrics.criticalSnags} critical snags · {intelligence.metrics.overdueTasks} overdue tasks</p>
          <button className="mt-4 text-sm font-semibold text-sky-700" onClick={() => navigate('/app/recovery')}>View recovery analysis →</button>
        </section>
        <section className="pmx-section-panel"><div className="pmx-eyebrow">Management attention</div><h2 className="mt-1 text-xl font-semibold">Decisions & immediate actions</h2>
          <div className="mt-3 space-y-3">{recommendations.slice(0, 2).map((item: any) => <button key={item.id} className="block w-full text-left text-sm" onClick={() => item.route && navigate(item.route)}><strong>{item.title}</strong><span className="ml-2 text-sky-700">→</span></button>)}
          <p className="text-xs text-[var(--pmx-muted)]">{intelligence.metrics.pendingApprovals} pending approvals · {intelligence.metrics.overdueApprovals} overdue</p></div>
        </section>
      </div>
      <details className="pmx-section-panel"><summary className="cursor-pointer font-semibold">Detailed intelligence and operational controls</summary><div className="mt-5 space-y-4"><RoleAwareCommandSections project={project} /><div className="grid gap-4 lg:grid-cols-2"><ReadinessPanel readiness={intelligence.readiness} /><ProductionPanel forecast={forecast} /><RootCausePanel rootCause={intelligence.rootCause} /><RecommendationsPanel recommendations={intelligence.recommendations} /></div><HealthTrend days={30} /><DeliveryTwinPanel twin={intelligence.deliveryTwin} sharedForecast={forecast} currentHealth={intelligence.health.score} /></div></details>
      {import.meta.env.DEV ? <V6IntelligenceComparison project={project} /> : null}
    </div>
  )
}
