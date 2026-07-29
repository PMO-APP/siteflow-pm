import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpenCheck, BrainCircuit, Dna, ShieldCheck } from 'lucide-react'
import type { ReturnTypeProjectIntelligence } from './projectPulseTypes'

interface ProjectLearningPanelProps {
  intelligence: ReturnTypeProjectIntelligence
}

const profileLabel = (value: string) => value.replace('_', ' ')
const benchmarkIcon = {
  better: ArrowUpRight,
  in_line: ArrowRight,
  worse: ArrowDownRight,
}
const benchmarkTone = {
  better: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  in_line: 'text-blue-700 bg-blue-50 border-blue-200',
  worse: 'text-red-700 bg-red-50 border-red-200',
}

export function ProjectLearningPanel({ intelligence }: ProjectLearningPanelProps) {
  const { projectDNA, patterns, lessons, benchmarks } = intelligence.learning
  const leadingPattern = patterns[0]
  const leadingLesson = lessons[0]

  return (
    <section className="space-y-6" aria-label="Project DNA and organizational learning">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><Dna className="h-4 w-4" />Project DNA</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">{projectDNA.archetype}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{projectDNA.summary}</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-right">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">DNA confidence</div>
              <div className="mt-1 text-3xl font-semibold text-slate-950">{projectDNA.confidence}%</div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projectDNA.dimensions.map(item => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3"><span className="text-sm font-medium text-slate-800">{item.label}</span><span className="text-sm font-semibold text-slate-950">{item.score}%</span></div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{ width: `${item.score}%` }} /></div>
                <div className="mt-2 text-xs font-semibold capitalize text-slate-500">{profileLabel(item.profile)}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Strengths</div><div className="mt-2 text-sm leading-6 text-emerald-950">{projectDNA.strengths.join(' · ') || 'No strong control signature is established yet.'}</div></div>
            <div className="rounded-xl bg-amber-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Primary vulnerability</div><div className="mt-2 text-sm leading-6 text-amber-950">{projectDNA.dominantConstraint}</div></div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Pattern intelligence</div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">What the project is teaching us</h2></div><BrainCircuit className="h-5 w-5 text-blue-700" /></div>
          {leadingPattern ? <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4"><div className="flex items-center justify-between gap-3"><div className="font-semibold text-slate-950">{leadingPattern.title}</div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-700">{leadingPattern.confidence}% confidence</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{leadingPattern.explanation}</p></div> : <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">No recurring delivery pattern is currently strong enough to surface.</div>}
          {leadingLesson && <div className="mt-5"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><BookOpenCheck className="h-4 w-4 text-blue-700" />Recommended practice</div><p className="mt-2 text-sm leading-6 text-slate-600">{leadingLesson.recommendedPractice}</p><div className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Apply {leadingLesson.applicability.replace('_', ' ')}</div></div>}
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><ShieldCheck className="h-4 w-4" />Learning benchmark</div><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">Control-position indicators</h2></div><p className="max-w-xl text-sm text-slate-500">Initial PMOCorex reference thresholds are used until sufficient completed-project history is available.</p></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {benchmarks.map(item => {
            const Icon = benchmarkIcon[item.position]
            return <div key={item.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><span className="text-sm font-medium text-slate-800">{item.label}</span><span className={`rounded-full border p-1 ${benchmarkTone[item.position]}`}><Icon className="h-3.5 w-3.5" /></span></div><div className="mt-4 text-2xl font-semibold text-slate-950">{item.projectValue}{item.unit}</div><div className="mt-1 text-xs text-slate-500">Reference {item.referenceValue}{item.unit}</div><p className="mt-3 text-xs leading-5 text-slate-500">{item.explanation}</p></div>
          })}
        </div>
      </article>
    </section>
  )
}
