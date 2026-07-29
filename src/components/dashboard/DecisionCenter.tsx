import { useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Clock3, ShieldCheck, Target } from 'lucide-react'
import type { GovernanceAssessment, ProjectDecision } from '@/intelligence'

interface Props {
  decisions: ProjectDecision[]
  governance: GovernanceAssessment
  onOpenSource?: (source: ProjectDecision['source']) => void
}

const urgencyTone = {
  today: 'border-red-200 bg-red-50 text-red-700',
  this_week: 'border-amber-200 bg-amber-50 text-amber-700',
  monitor: 'border-slate-200 bg-slate-50 text-slate-600',
}

const urgencyLabel = { today: 'Decision today', this_week: 'This week', monitor: 'Monitor' }

export default function DecisionCenter({ decisions, governance, onOpenSource }: Props) {
  const [showGovernance, setShowGovernance] = useState(false)
  const topDecisions = decisions.slice(0, 5)

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Project decision centre</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">What management needs to decide now</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Actions are ranked by delivery impact, urgency, supported recovery and confidence in the available project evidence.</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em]">Governance maturity</div>
          <div className="mt-1 flex items-baseline gap-2"><span className="text-2xl font-semibold">{governance.score}%</span><span className="text-xs font-semibold">{governance.level}</span></div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {topDecisions.length ? topDecisions.map((decision, index) => (
          <article key={decision.id} className="grid gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 sm:grid-cols-[42px_minmax(0,1fr)_auto] sm:items-center sm:p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white">{index + 1}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-950">{decision.action}</h3>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${urgencyTone[decision.urgency]}`}>{urgencyLabel[decision.urgency]}</span>
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-600">{decision.rationale}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5"/>Impact {decision.impactScore}%</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5"/>Confidence {decision.confidence}%</span>
                {decision.recoveryDays > 0 && <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5"/>Potential recovery {decision.recoveryDays}d</span>}
              </div>
            </div>
            <button onClick={() => onOpenSource?.(decision.source)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">Review <ArrowRight className="h-4 w-4"/></button>
          </article>
        )) : <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center text-sm text-slate-500">No high-impact decision is currently supported by the available evidence.</div>}
      </div>

      <div className="mt-5">
        <button onClick={() => setShowGovernance(value => !value)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-700"/>Explain governance maturity</span>
          {showGovernance ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
        </button>
        {showGovernance && <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{governance.checks.map(check => (
          <div key={check.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3"><span className="text-sm font-medium text-slate-900">{check.label}</span><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${check.score >= 80 ? 'bg-emerald-50 text-emerald-700' : check.score >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{check.score}%</span></div>
            <p className="mt-3 text-xs leading-5 text-slate-500">{check.evidence}</p>
          </div>
        ))}</div>}
      </div>
    </section>
  )
}
