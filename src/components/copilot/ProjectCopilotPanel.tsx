import { useMemo, useState } from 'react'
import { ArrowRight, Bot, ChevronDown, ChevronUp, Send, Sparkles } from 'lucide-react'
import { askProjectCopilot, assembleCopilotContext, COPILOT_QUESTIONS } from '@/intelligence'
import type { runProjectIntelligence, IntelligenceSource } from '@/intelligence'
import type { CopilotAnswer, CopilotQuestionId } from '@/intelligence/copilot/types'

type Intelligence = ReturnType<typeof runProjectIntelligence>

interface ProjectCopilotPanelProps {
  projectName?: string
  intelligence: Intelligence
  onOpenSource?: (source: IntelligenceSource) => void
}

export function ProjectCopilotPanel({ projectName, intelligence, onOpenSource }: ProjectCopilotPanelProps) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<CopilotAnswer | null>(null)
  const [expanded, setExpanded] = useState(true)
  const context = useMemo(() => assembleCopilotContext(projectName, intelligence), [projectName, intelligence])

  function submit(prompt: string, id?: CopilotQuestionId) {
    const cleaned = prompt.trim()
    if (!cleaned) return
    setAnswer(askProjectCopilot(context, cleaned, id))
    setQuestion('')
    setExpanded(true)
  }

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white" aria-label="PMO Copilot">
      <div className="flex flex-col gap-5 border-b border-slate-200 bg-slate-950 px-5 py-6 text-white sm:px-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Bot className="h-5 w-5" /></span>
          <div className="min-w-0"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200"><Sparkles className="h-3.5 w-3.5" /> PMO Copilot</div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Ask the project intelligence</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Answers are generated from verified PIF health, forecast, warning, governance and decision outputs.</p></div>
        </div>
        <button type="button" onClick={() => setExpanded(value => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10" aria-expanded={expanded}>{expanded ? 'Collapse' : 'Open copilot'}{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
      </div>

      {expanded && <div className="p-5 sm:p-7">
        <div className="flex flex-wrap gap-2">
          {COPILOT_QUESTIONS.slice(0, 6).map(item => <button key={item.id} type="button" onClick={() => submit(item.label, item.id)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800">{item.label}</button>)}
        </div>

        <form className="mt-5 flex gap-3" onSubmit={event => { event.preventDefault(); submit(question) }}>
          <label className="sr-only" htmlFor="project-copilot-question">Ask PMO Copilot</label>
          <input id="project-copilot-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask why the project is delayed, what changed, or what should happen next…" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
          <button type="submit" disabled={!question.trim()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-4 w-4" /><span className="hidden sm:inline">Ask</span></button>
        </form>

        {answer ? <article className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-5 sm:p-6" aria-live="polite">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Grounded answer</div><h3 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-slate-950">{answer.headline}</h3></div><span className="shrink-0 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-800">{answer.confidence}% confidence</span></div>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-700">{answer.answer}</p>
          {answer.evidence.length > 0 && <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{answer.evidence.slice(0, 4).map((item, index) => <button key={`${item.label}-${index}`} type="button" disabled={!item.source} onClick={() => item.source && onOpenSource?.(item.source)} className="rounded-xl border border-slate-200 bg-white p-3 text-left disabled:cursor-default"><span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{item.label}</span><span className="mt-1 block text-sm font-semibold text-slate-900">{item.value}</span></button>)}</div>}
          {answer.actions.length > 0 && <div className="mt-5 border-t border-blue-100 pt-4"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Open supporting controls</div><div className="mt-3 flex flex-wrap gap-2">{answer.actions.map((action, index) => <button key={`${action.label}-${index}`} type="button" onClick={() => onOpenSource?.(action.source)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-800">{action.label}<ArrowRight className="h-3.5 w-3.5" /></button>)}</div></div>}
        </article> : <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">Select a management question or ask in your own words. The copilot routes the question to deterministic project intelligence and shows the supporting evidence.</div>}
      </div>}
    </section>
  )
}
