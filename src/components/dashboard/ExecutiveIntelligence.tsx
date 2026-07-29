import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertCircle, Gauge, Target, TrendingUp } from 'lucide-react'
import type { ExecutiveBrief } from '@/intelligence/board/ExecutiveBrief'
import type { WeeklyNarrative } from '@/intelligence/narrative/WeeklySummary'

interface Props {
  brief: ExecutiveBrief
  weekly: WeeklyNarrative
  onOpenRecovery?: () => void
}

const tone = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
}

export default function ExecutiveIntelligence({ brief, weekly, onOpenRecovery }: Props) {
  const [showHealth, setShowHealth] = useState(false)
  const [activeQuestion, setActiveQuestion] = useState<'status' | 'delay' | 'next' | 'week'>('status')
  const answer = activeQuestion === 'delay'
    ? brief.forecast.drivers.length ? `The forecast is being driven by ${brief.forecast.drivers.slice(0, 3).join(', ')}.` : 'No material delay driver is currently supported by the available evidence.'
    : activeQuestion === 'next'
    ? brief.executive.immediatePriorities.join(' ') || 'Maintain current controls and validate the next reporting cycle.'
    : activeQuestion === 'week'
    ? weekly.narrative
    : brief.executive.summary

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Executive intelligence brief</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-3xl">{brief.executive.headline}</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{brief.executive.summary}</p>
        </div>
        <div className="flex gap-3">
          <div className={`rounded-2xl border px-4 py-3 ${tone[brief.status]}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em]">Health</div>
            <div className="mt-1 text-2xl font-semibold">{brief.healthScore}%</div>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em]">Confidence</div>
            <div className="mt-1 text-2xl font-semibold">{brief.confidence.score}%</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><AlertCircle className="h-4 w-4 text-amber-600"/>Key issues</div>
          <div className="mt-4 space-y-3">{brief.executive.keyIssues.length ? brief.executive.keyIssues.map(item => <div key={item} className="text-sm leading-5 text-slate-600">• {item}</div>) : <div className="text-sm text-slate-500">No material issue identified.</div>}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Target className="h-4 w-4 text-blue-700"/>Immediate priorities</div>
          <div className="mt-4 space-y-3">{brief.executive.immediatePriorities.length ? brief.executive.immediatePriorities.slice(0, 4).map(item => <div key={item} className="text-sm leading-5 text-slate-600">• {item}</div>) : <div className="text-sm text-slate-500">Maintain current controls.</div>}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><TrendingUp className="h-4 w-4 text-emerald-700"/>Executive outlook</div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{brief.executive.outlook}</p>
          <button onClick={onOpenRecovery} className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-800">Review recovery options</button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {[
            ['status', 'Why is this project this status?'],
            ['delay', 'Why is completion delayed?'],
            ['week', 'What changed this week?'],
            ['next', 'What should happen next?'],
          ].map(([key, label]) => <button key={key} onClick={() => setActiveQuestion(key as typeof activeQuestion)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${activeQuestion === key ? 'bg-blue-700 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}>{label}</button>)}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-700">{answer}</p>
      </div>

      <div className="mt-5">
        <button onClick={() => setShowHealth(value => !value)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50">
          <span className="flex items-center gap-2"><Gauge className="h-4 w-4 text-blue-700"/>Explain project health</span>
          {showHealth ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
        </button>
        {showHealth && <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{brief.healthBreakdown.map(item => <div key={item.key} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-4"><span className="font-medium text-slate-900">{item.label}</span><span className="font-semibold text-slate-950">{item.score}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.score >= 80 ? 'bg-emerald-500' : item.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${item.score}%` }}/></div><p className="mt-3 text-xs leading-5 text-slate-500">{item.explanation}</p></div>)}</div>}
      </div>
    </section>
  )
}
