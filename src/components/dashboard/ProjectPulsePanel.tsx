import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock, Gauge, ShieldAlert } from 'lucide-react'
import type { ReturnTypeProjectIntelligence } from './projectPulseTypes'

interface ProjectPulsePanelProps {
  intelligence: ReturnTypeProjectIntelligence
  onOpenSource?: (source: string) => void
}

const pulseTone = {
  improving: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  stable: 'border-blue-200 bg-blue-50 text-blue-800',
  watch: 'border-amber-200 bg-amber-50 text-amber-800',
  deteriorating: 'border-orange-200 bg-orange-50 text-orange-800',
  critical: 'border-red-200 bg-red-50 text-red-800',
}

const trendIcon = {
  improving: ArrowUpRight,
  stable: ArrowRight,
  declining: ArrowDownRight,
}

export function ProjectPulsePanel({ intelligence, onOpenSource }: ProjectPulsePanelProps) {
  const { pulse, escalation, warnings, decisionQueue, timeline } = intelligence
  const TrendIcon = trendIcon[pulse.trend]
  const currentStory = timeline.currentCritical[0] || timeline.nextMilestones[0]

  return (
    <section className="space-y-6" aria-label="Predictive project intelligence">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Project pulse</div><div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{pulse.score}%</div></div>
            <Gauge className="h-5 w-5 text-blue-700" />
          </div>
          <div className={`mt-4 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${pulseTone[pulse.status]}`}>{pulse.label}</div>
          <p className="mt-3 text-sm leading-5 text-slate-600">{pulse.explanation}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Delivery trend</div><div className="mt-2 capitalize text-2xl font-semibold text-slate-950">{pulse.trend}</div></div><TrendIcon className="h-5 w-5 text-blue-700" /></div>
          <div className="mt-4 text-sm text-slate-600">Momentum <span className="font-semibold capitalize text-slate-900">{pulse.momentum.direction}</span> · {pulse.momentum.score}%</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{ width: `${pulse.momentum.score}%` }} /></div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Executive attention</div><div className="mt-2 text-2xl font-semibold text-slate-950">{pulse.attention.score}%</div></div><ShieldAlert className="h-5 w-5 text-blue-700" /></div>
          <div className="mt-4 text-sm font-semibold text-slate-900">{pulse.attention.label}</div>
          <p className="mt-2 text-sm text-slate-600">{pulse.attention.reasons[0] || 'No immediate executive escalation driver.'}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">14-day escalation risk</div><div className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{escalation.probability}%</div></div><AlertTriangle className="h-5 w-5 text-blue-700" /></div>
          <p className="mt-4 text-sm leading-5 text-slate-600">{escalation.explanation}</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Decision queue</div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">Highest-impact actions</h2></div><span className="text-sm text-slate-500">{decisionQueue.length} prioritised</span></div>
          <div className="mt-5 divide-y divide-slate-100">
            {decisionQueue.length ? decisionQueue.map((item, index) => (
              <button key={item.id} type="button" onClick={() => onOpenSource?.(item.source)} className="group flex w-full items-start gap-4 py-4 text-left">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">{index + 1}</span>
                <span className="min-w-0 flex-1"><span className="block font-medium text-slate-900 group-hover:text-blue-700">{item.action}</span><span className="mt-1 block text-sm text-slate-500">Impact {item.impactScore}% · Confidence {item.confidence}%{item.recoveryDays ? ` · ${item.recoveryDays} recovery days` : ''}</span></span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">{item.urgency.replace('_', ' ')}</span>
              </button>
            )) : <div className="rounded-xl bg-emerald-50 p-5 text-sm text-emerald-800">No high-impact decision is currently open.</div>}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Project story</div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">Now and next</h2></div><CalendarClock className="h-5 w-5 text-blue-700" /></div>
          {currentStory ? <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Current focus</div><div className="mt-2 font-semibold text-slate-950">{currentStory.title}</div><p className="mt-2 text-sm leading-5 text-slate-600">{currentStory.explanation}</p></div> : <p className="mt-5 text-sm text-slate-500">No current critical activity is available.</p>}
          <div className="mt-5 space-y-3">
            {timeline.decisionPoints.slice(0, 3).map(item => <button key={item.id} type="button" onClick={() => onOpenSource?.(item.source)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"><span className="h-2 w-2 rounded-full bg-amber-500"/><span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{item.title}</span><ArrowRight className="h-4 w-4 text-slate-400"/></button>)}
          </div>
        </article>
      </div>

      {warnings.length > 0 && <article className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">Early warning system</div><h2 className="mt-2 text-xl font-semibold text-red-950">{warnings[0].title}</h2></div><span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-red-700">{warnings[0].probability}% probability</span></div><p className="mt-3 text-sm leading-6 text-red-900">{warnings[0].description}</p><div className="mt-4 text-sm font-semibold text-red-950">Recommended control: {warnings[0].recommendedAction}</div></article>}
    </section>
  )
}
