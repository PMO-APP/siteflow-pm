import { useMemo, useState } from 'react'
import { CalendarCheck, ChevronDown, ChevronUp, ClipboardCheck, ExternalLink, Printer } from 'lucide-react'
import type { runProjectIntelligence, IntelligenceSource } from '@/intelligence'

type Intelligence = ReturnType<typeof runProjectIntelligence>

interface ProjectReviewPanelProps {
  intelligence: Intelligence
  onOpenSource?: (source: IntelligenceSource) => void
}

const priorityTone = {
  critical: 'border-red-200 bg-red-50 text-red-800',
  high: 'border-amber-200 bg-amber-50 text-amber-800',
  normal: 'border-slate-200 bg-slate-50 text-slate-700',
}

export function ProjectReviewPanel({ intelligence, onOpenSource }: ProjectReviewPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const brief = intelligence.meeting
  const generated = useMemo(() => new Date(brief.generatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), [brief.generatedAt])

  function printBrief() {
    window.print()
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white" aria-label="Project review intelligence">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white"><CalendarCheck className="h-5 w-5" /></span>
          <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Meeting intelligence</div><h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-slate-950">{brief.meetingTitle}</h2><p className="mt-1 text-sm text-slate-500">Prepared {generated}</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={printBrief} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-800"><Printer className="h-4 w-4" /> Print brief</button>
          <button type="button" onClick={() => setExpanded(value => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700" aria-expanded={expanded}>{expanded ? 'Collapse' : 'Open review'}{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
        </div>
      </div>

      {expanded && <div className="p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Opening statement</div><p className="mt-3 text-sm leading-6 text-slate-700">{brief.openingStatement}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Review readiness</div><div className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-slate-950">{brief.readinessScore}<span className="text-lg text-slate-400">%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{ width: `${brief.readinessScore}%` }} /></div></div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
          <div>
            <div className="flex items-end justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Agenda</div><h3 className="mt-2 text-xl font-semibold text-slate-950">Priority discussion sequence</h3></div><span className="text-sm text-slate-500">{brief.agenda.length} items</span></div>
            <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {brief.agenda.map((item, index) => <div key={item.id} className="p-4 sm:p-5"><div className="flex items-start gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-slate-950">{item.title}</h4><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${priorityTone[item.priority]}`}>{item.priority}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.purpose}</p><div className="mt-3 flex flex-wrap gap-2">{item.evidence.slice(0, 3).map(evidence => <span key={evidence} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{evidence}</span>)}</div>{item.source && <button type="button" onClick={() => onOpenSource?.(item.source!)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900">Open source control <ExternalLink className="h-3.5 w-3.5" /></button>}</div></div></div>)}
            </div>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Since last review</div><div className="mt-4 space-y-3">{brief.sinceLastReview.map(line => <div key={line} className="flex gap-3 text-sm leading-5 text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-700" />{line}</div>)}</div></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"><ClipboardCheck className="h-4 w-4" /> Follow-up actions</div><div className="mt-4 space-y-3">{brief.followUpActions.length ? brief.followUpActions.map(action => <div key={action.id} className="rounded-xl border border-slate-200 p-3"><div className="text-sm font-semibold text-slate-900">{action.action}</div><div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{action.owner}</span><span>{action.deadline}</span></div></div>) : <p className="text-sm text-slate-500">No follow-up action is currently required.</p>}</div></section>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">Closing outlook</div><p className="mt-3 text-sm leading-6 text-slate-200">{brief.closingOutlook}</p></div>
      </div>}
    </section>
  )
}
