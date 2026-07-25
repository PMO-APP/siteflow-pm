import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  Gauge,
  HardHat,
  Layers3,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UploadCloud,
  Users,
} from 'lucide-react'

import { useMembershipStore } from '@/store/membership'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import { useProjectIntelligence } from '@/hooks/useProjectIntelligence'

type Tone = 'healthy' | 'attention' | 'critical' | 'info'

type ActionItem = {
  label: string
  description: string
  route: string
  icon: typeof Activity
}

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
  if (minutes < 1) return 'Now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`
  return `${Math.floor(minutes / 1440)} day${minutes >= 2880 ? 's' : ''} ago`
}

function roleLabel(role?: string | null) {
  const labels: Record<string, string> = {
    workspace_admin: 'Workspace Admin',
    admin: 'Admin',
    pmo: 'PMO',
    portfolio_manager: 'Portfolio Manager',
    project_owner: 'Project Owner',
    overall_project_owner: 'Project Owner',
    housebuild_project_owner: 'Housebuild Project Owner',
    infrastructure_project_owner: 'Infrastructure Project Owner',
    mep_project_owner: 'MEP Project Owner',
    housebuild: 'Housebuild',
    infrastructure: 'Infrastructure',
    design: 'Design',
    costing: 'Costing',
    mep: 'MEP',
    hse: 'HSE',
    hse_lead: 'HSE Lead',
    hse_manager: 'HSE Manager',
    viewer: 'Viewer',
    guest: 'Guest',
  }
  return labels[role || ''] || 'Project Viewer'
}

function statusTone(score: number): Tone {
  if (score >= 80) return 'healthy'
  if (score >= 60) return 'attention'
  return 'critical'
}

function toneClasses(tone: Tone) {
  return {
    healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    attention: 'border-orange-200 bg-orange-50 text-orange-700',
    critical: 'border-rose-200 bg-rose-50 text-rose-700',
    info: 'border-sky-200 bg-sky-50 text-sky-700',
  }[tone]
}

function actionsForRole(role?: string | null): ActionItem[] {
  const executive = ['workspace_admin', 'admin', 'pmo', 'portfolio_manager']
  const owners = ['project_owner', 'overall_project_owner']

  if (executive.includes(role || '') || owners.includes(role || '')) {
    return [
      { label: 'Update progress', description: 'Record current delivery position', route: '/app/schedule', icon: TrendingUp },
      { label: 'Upload programme', description: 'Import the latest schedule', route: '/app/schedule', icon: UploadCloud },
      { label: 'Recovery plan', description: 'Review delays and interventions', route: '/app/recovery', icon: Target },
      { label: 'Project controls', description: 'Open risks, approvals and actions', route: '/app/project-controls', icon: Gauge },
    ]
  }

  if (role === 'design') {
    return [
      { label: 'Drawings', description: 'Upload and review design information', route: '/app/documents', icon: FileText },
      { label: 'Design approvals', description: 'Review pending submissions', route: '/app/approvals', icon: FileCheck2 },
      { label: 'RFIs', description: 'Respond to open design queries', route: '/app/external-communication-review', icon: Activity },
    ]
  }

  if (['hse', 'hse_lead', 'hse_manager'].includes(role || '')) {
    return [
      { label: 'Inspections', description: 'Manage site safety inspections', route: '/app/hse', icon: HardHat },
      { label: 'Incidents', description: 'Review and close incident records', route: '/app/hse', icon: AlertTriangle },
      { label: 'Safety actions', description: 'Track corrective actions', route: '/app/hse', icon: ShieldCheck },
    ]
  }

  if (role === 'costing') {
    return [
      { label: 'Commercial controls', description: 'Contracts, payments and variations', route: '/app/costing', icon: FileCheck2 },
      { label: 'Procurement', description: 'Review packages and delivery status', route: '/app/procurement', icon: PackageCheck },
      { label: 'Approvals', description: 'Check commercial decisions', route: '/app/approvals', icon: CheckCircle2 },
    ]
  }

  if (['housebuild', 'housebuild_project_owner', 'infrastructure', 'infrastructure_project_owner', 'mep', 'mep_project_owner'].includes(role || '')) {
    return [
      { label: 'Update progress', description: 'Update permitted work activities', route: '/app/schedule', icon: TrendingUp },
      { label: 'Site records', description: 'Review current site information', route: '/app/site', icon: HardHat },
      { label: 'Documents', description: 'Open project files and drawings', route: '/app/documents', icon: FileText },
    ]
  }

  return [
    { label: 'View programme', description: 'Review the latest delivery schedule', route: '/app/schedule', icon: CalendarDays },
    { label: 'View documents', description: 'Open project information', route: '/app/documents', icon: FileText },
    { label: 'View reports', description: 'Review current project reporting', route: '/app/reports', icon: Layers3 },
  ]
}

function permissionSummary(role?: string | null) {
  const full = ['workspace_admin', 'admin', 'pmo', 'portfolio_manager']
  const owners = ['project_owner', 'overall_project_owner']

  if (full.includes(role || '')) {
    return {
      can: ['Update programme and progress', 'Manage project controls', 'Invite and coordinate project teams'],
      readOnly: role === 'admin' || role === 'workspace_admin' ? [] : ['Permanent deletion'],
    }
  }
  if (owners.includes(role || '')) {
    return {
      can: ['Update assigned project programme', 'Edit project progress', 'Manage delivery and recovery actions'],
      readOnly: ['Workspace administration', 'Permanent deletion'],
    }
  }
  if (role === 'design') {
    return { can: ['Upload drawings and documents', 'Respond to RFIs', 'Manage design approvals'], readOnly: ['Programme progress', 'Commercial controls'] }
  }
  if (role === 'costing') {
    return { can: ['Manage commercial records', 'Update procurement packages', 'Review cost approvals'], readOnly: ['Programme progress', 'HSE records'] }
  }
  if (['hse', 'hse_lead', 'hse_manager'].includes(role || '')) {
    return { can: ['Manage HSE inspections', 'Record incidents and actions', 'Maintain safety documentation'], readOnly: ['Programme progress', 'Commercial controls'] }
  }
  if (['housebuild', 'housebuild_project_owner'].includes(role || '')) {
    return { can: ['Update housebuild activities', 'Record site progress', 'Manage housebuild delivery issues'], readOnly: ['Infrastructure activities', 'Commercial controls'] }
  }
  if (['infrastructure', 'infrastructure_project_owner'].includes(role || '')) {
    return { can: ['Update infrastructure activities', 'Record site progress', 'Manage infrastructure delivery issues'], readOnly: ['Housebuild activities', 'Commercial controls'] }
  }
  if (['mep', 'mep_project_owner'].includes(role || '')) {
    return { can: ['Update MEP activities', 'Record MEP progress', 'Manage MEP delivery issues'], readOnly: ['Other disciplines', 'Commercial controls'] }
  }
  return { can: ['View project information', 'Review reports and dashboards'], readOnly: ['All editing actions'] }
}

export default function RoleBasedCommandCenter({ project }: { project?: any }) {
  const navigate = useNavigate()
  const role = useMembershipStore(state => state.role)
  const intelligence = useProjectIntelligence({ project })
  const { data: activity = [], isLoading: activityLoading } = useActivityFeed(8)

  const actions = actionsForRole(role)
  const permissions = permissionSummary(role)
  const health = statusTone(intelligence.health.score)
  const forecast = intelligence.forecastV2
  const focusItems = intelligence.recommendations.items.slice(0, 4)

  const activityItems = useMemo(
    () =>
      (activity as any[]).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        time: relativeTime(item.created_at),
        route: item.route,
      })),
    [activity]
  )

  const healthCards = [
    { label: 'Schedule', value: intelligence.health.breakdown.schedule, icon: CalendarDays },
    { label: 'Commercial', value: intelligence.health.breakdown.commercial, icon: FileCheck2 },
    { label: 'Quality', value: intelligence.health.breakdown.quality, icon: ShieldCheck },
    { label: 'Risk', value: intelligence.health.breakdown.risk, icon: AlertTriangle },
    { label: 'Governance', value: intelligence.health.breakdown.governance, icon: Users },
  ]

  return (
    <div className="space-y-6 bg-slate-50/70 pb-10">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-[#0E3157] via-[#154A78] to-[#1D6A96] px-6 py-7 text-white lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                <span>Project command centre</span>
                <span className="h-1 w-1 rounded-full bg-sky-200" />
                <span>{project?.portfolio_name || project?.portfolio || 'Mixta Africa'}</span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {project?.project_name || project?.name || 'Selected Project'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-sky-50/90">
                {intelligence.narrative.summary}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium">
                  Role: {roleLabel(role)}
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium">
                  Progress: {intelligence.metrics.scheduleProgress}%
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium">
                  Forecast: {formatDate(forecast.forecastDate)}
                </span>
              </div>
            </div>

            <div className="min-w-[220px] rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between text-sm text-sky-100">
                <span>Project health</span>
                <Gauge size={18} />
              </div>
              <div className="mt-2 flex items-end gap-2">
                <strong className="text-5xl font-semibold">{intelligence.health.score}</strong>
                <span className="pb-1 text-sm text-sky-100">/100</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-[#FF7A59]" style={{ width: `${Math.max(0, Math.min(100, intelligence.health.score))}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-sky-100">
                <span>{intelligence.health.label}</span>
                <span>{forecast.recoveryConfidence}% confidence</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ['Forecast completion', formatDate(forecast.forecastDate), `Target ${formatDate(forecast.targetDate)}`],
            ['Progress', `${intelligence.metrics.scheduleProgress}%`, `Planned ${intelligence.metrics.plannedProgress}%`],
            ['Delay', `${forecast.delayDays} days`, 'Current variance'],
            ['Open risks', intelligence.metrics.openRisks, `${intelligence.metrics.highRisks} high`],
            ['Approvals', intelligence.metrics.pendingApprovals, `${intelligence.metrics.overdueApprovals} overdue`],
            ['Snags', intelligence.metrics.openSnags, `${intelligence.metrics.criticalSnags} critical`],
          ].map(([label, value, helper]) => (
            <div key={String(label)} className="bg-white px-5 py-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
              <div className="mt-0.5 text-xs text-slate-500">{helper}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D6A96]">My work today</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Highest-impact actions</h2>
              <p className="mt-1 text-sm text-slate-500">Prioritised for your current responsibility on this project.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{focusItems.length} items</span>
          </div>

          <div className="mt-5 divide-y divide-slate-100">
            {focusItems.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                <CheckCircle2 size={22} />
                <div>
                  <div className="font-semibold">No urgent intervention</div>
                  <div className="text-sm text-emerald-700/80">There are no immediate actions requiring your attention.</div>
                </div>
              </div>
            ) : (
              focusItems.map((item: any, index: number) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.route && navigate(item.route)}
                  className="group flex w-full items-start gap-4 py-4 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-bold text-[#E85D3F]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">{item.title}</span>
                    <span className="mt-1 block text-sm leading-5 text-slate-500">{item.description}</span>
                  </span>
                  <ArrowRight size={17} className="mt-1 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#1D6A96]" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-[#1D6A96]">
              <ShieldCheck size={21} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D6A96]">Your access</div>
              <h2 className="text-xl font-semibold text-slate-900">{roleLabel(role)}</h2>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">You can</div>
            <div className="mt-3 space-y-2">
              {permissions.can.map(item => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {permissions.readOnly.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Read only</div>
              <div className="mt-3 space-y-2">
                {permissions.readOnly.map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock3 size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D6A96]">Quick actions</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Tools for your role</h2>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map(action => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.route)}
                className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-[#1D6A96] transition group-hover:bg-[#1D6A96] group-hover:text-white">
                  <Icon size={19} />
                </div>
                <div className="mt-4 font-semibold text-slate-900">{action.label}</div>
                <div className="mt-1 text-sm leading-5 text-slate-500">{action.description}</div>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D6A96]">Project pulse</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Delivery health</h2>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(health)}`}>
            {intelligence.health.label}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {healthCards.map(card => {
            const Icon = card.icon
            const tone = statusTone(card.value)
            return (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon size={19} />
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses(tone)}`}>
                    {tone === 'healthy' ? 'Healthy' : tone === 'attention' ? 'Attention' : 'Critical'}
                  </span>
                </div>
                <div className="mt-5 text-sm font-medium text-slate-500">{card.label}</div>
                <div className="mt-1 text-3xl font-semibold text-slate-900">{card.value}%</div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#1D6A96]" style={{ width: `${Math.max(0, Math.min(100, card.value))}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D6A96]">Delivery position</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Planned vs actual</h2>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Should be today</span><CalendarDays size={16} />
              </div>
              <div className="mt-2 font-semibold text-slate-900">{forecast.plannedPosition?.name || 'No planned position found'}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Actual site position</span><Clock3 size={16} />
              </div>
              <div className="mt-2 font-semibold text-slate-900">{forecast.actualPosition?.name || 'No active site position found'}</div>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-orange-700">Activity gap</div>
              <div className="mt-1 text-2xl font-semibold text-orange-800">{forecast.activityGap} step{forecast.activityGap === 1 ? '' : 's'} behind</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D6A96]">Recent activity</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">What changed</h2>
            </div>
            <Activity size={20} className="text-slate-400" />
          </div>
          <div className="mt-5">
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(item => <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
              </div>
            ) : activityItems.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No recent activity has been recorded.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activityItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => item.route && navigate(item.route)}
                    className="flex w-full items-start gap-3 py-3 text-left"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FF7A59]" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-900">{item.title}</span>
                      {item.description ? <span className="mt-0.5 block text-sm text-slate-500">{item.description}</span> : null}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{item.time}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#1D6A96]/20 bg-[#EAF5FA] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1D6A96] shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D6A96]">PMOCorex intelligence</div>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">{intelligence.narrative.headline}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{intelligence.narrative.outlook}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/recovery')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0E3157] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#154A78]"
          >
            View recovery intelligence <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  )
}
