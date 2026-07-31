import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Gauge,
  Lightbulb,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
  XCircle,
} from 'lucide-react'
import type { runProjectIntelligence } from '@/intelligence/PIF'

type Intelligence = ReturnType<typeof runProjectIntelligence>
type Recommendation = Intelligence['recommendations'][number]
type Scenario = Intelligence['impactScenarios'][number]
type ActionState = 'open' | 'accepted' | 'dismissed'

interface Props {
  projectId: string | number
  intelligence: Intelligence
  onOpenSource?: (source: string) => void
}

const priorityTone: Record<string, string> = {
  critical: 'border-red-200 bg-red-50 text-red-700',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-slate-200 bg-slate-50 text-slate-600',
}

function inferSource(recommendation: Recommendation) {
  const eventId = recommendation.relatedEventIds[0] || ''
  return eventId.split(':')[0] || 'schedule'
}

function actionStorageKey(projectId: string | number) {
  return `pmocorex:autonomous-actions:${projectId}`
}

function formatDays(value: number) {
  if (value === 0) return 'No forecast movement'
  return value < 0 ? `${Math.abs(value)} days recovered` : `${value} days added`
}

export function AutonomousIntelligencePanel({ projectId, intelligence, onOpenSource }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({})

  useEffect(() => {
    try {
      const saved = localStorage.getItem(actionStorageKey(projectId))
      setActionStates(saved ? JSON.parse(saved) : {})
    } catch {
      setActionStates({})
    }
  }, [projectId])

  function updateAction(id: string, state: ActionState) {
    const next = { ...actionStates, [id]: state }
    setActionStates(next)
    try {
      localStorage.setItem(actionStorageKey(projectId), JSON.stringify(next))
    } catch {
      // Local persistence is an enhancement; the action centre remains usable without it.
    }
  }

  const recommendations = useMemo(
    () => intelligence.recommendations.filter(item => actionStates[item.id] !== 'dismissed'),
    [actionStates, intelligence.recommendations],
  )

  const executiveFocus = recommendations
    .filter(item => actionStates[item.id] !== 'accepted')
    .slice(0, 3)

  const acceptedCount = Object.values(actionStates).filter(value => value === 'accepted').length
  const bestRecovery = [...intelligence.impactScenarios]
    .sort((a, b) => a.scheduleImpactDays - b.scheduleImpactDays)[0]

  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-950 px-5 py-6 text-white sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
              <Sparkles className="h-4 w-4" /> Autonomous project intelligence
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Management actions supported by live project evidence</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">Recommendations are deterministic, ranked by severity, forecast impact and confidence. Nothing is executed automatically.</p>
          </div>
          <div className="grid min-w-[250px] grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-slate-300">Open focus actions</div>
              <div className="mt-1 text-3xl font-semibold">{executiveFocus.length}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs text-slate-300">Potential recovery</div>
              <div className="mt-1 text-3xl font-semibold">{bestRecovery?.scheduleImpactDays < 0 ? `${Math.abs(bestRecovery.scheduleImpactDays)}d` : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)]">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Executive focus</div>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-slate-950">Highest-priority actions now</h3>
            </div>
            <span className="text-xs font-medium text-slate-500">{acceptedCount} accepted</span>
          </div>

          <div className="mt-5 space-y-3">
            {executiveFocus.length ? executiveFocus.map((item, index) => {
              const isExpanded = expanded === item.id
              const state = actionStates[item.id] || 'open'
              return (
                <article key={item.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                  <div className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-sm font-semibold text-white">{index + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-slate-950">{item.title}</h4>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityTone[item.priority] || priorityTone.low}`}>{item.priority}</span>
                        {state === 'accepted' && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Accepted</span>}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.action}</p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />Up to {item.expectedRecoveryDays}d recovery</span>
                        <span className="flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" />{item.confidence}% confidence</span>
                        <span className="flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" />{item.estimatedCost} cost impact</span>
                      </div>

                      <button type="button" onClick={() => setExpanded(isExpanded ? null : item.id)} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                        {isExpanded ? 'Hide rationale' : 'Explain recommendation'}
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      {isExpanded && <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{item.rationale}</div>}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => updateAction(item.id, 'accepted')} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"><CheckCircle2 className="h-4 w-4" />Accept action</button>
                        <button type="button" onClick={() => onOpenSource?.(inferSource(item))} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">Review source <ArrowRight className="h-4 w-4" /></button>
                        <button type="button" onClick={() => updateAction(item.id, 'dismissed')} className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"><XCircle className="h-4 w-4" />Dismiss</button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            }) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                <div className="mt-3 font-semibold text-slate-900">No critical management action is supported by current evidence.</div>
                <p className="mt-1 text-sm text-slate-500">Continue monitoring schedule, approvals, procurement and delivery risks.</p>
              </div>
            )}
          </div>

          {acceptedCount > 0 && (
            <button type="button" onClick={() => { setActionStates({}); localStorage.removeItem(actionStorageKey(projectId)) }} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800"><RotateCcw className="h-3.5 w-3.5" />Reset action decisions</button>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Impact simulation</div>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-slate-950">Compare recovery options</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Select a scenario to see its forecast effect, confidence and operational trade-off.</p>

          <div className="mt-5 space-y-2">
            {intelligence.impactScenarios.map(scenario => (
              <button key={scenario.id} type="button" onClick={() => setSelectedScenario(scenario)} className={`w-full rounded-xl border p-4 text-left transition ${selectedScenario?.id === scenario.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{scenario.title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{scenario.operationalImpact}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${scenario.scheduleImpactDays < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{formatDays(scenario.scheduleImpactDays)}</span>
                </div>
              </button>
            ))}
          </div>

          {selectedScenario && (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-900"><Lightbulb className="h-4 w-4" />Scenario interpretation</div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{selectedScenario.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white p-3"><div className="text-xs text-slate-500">Forecast delay</div><div className="mt-1 font-semibold text-slate-950">{selectedScenario.forecastDelayDays} days</div></div>
                <div className="rounded-xl bg-white p-3"><div className="text-xs text-slate-500">Confidence</div><div className="mt-1 font-semibold text-slate-950">{selectedScenario.confidence}%</div></div>
                <div className="rounded-xl bg-white p-3"><div className="text-xs text-slate-500">Cost impact</div><div className="mt-1 font-semibold capitalize text-slate-950">{selectedScenario.costImpact}</div></div>
                <div className="rounded-xl bg-white p-3"><div className="text-xs text-slate-500">Affected records</div><div className="mt-1 font-semibold text-slate-950">{selectedScenario.affectedEventIds.length}</div></div>
              </div>
              <div className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-slate-700"><strong className="text-slate-950">Recommended control:</strong> {selectedScenario.recommendation}</div>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Users className="h-4 w-4 text-blue-700" />Management safeguard</div>
            <p className="mt-2 text-xs leading-5 text-slate-500">PMOCorex recommends and simulates actions. Project owners retain approval responsibility before any programme, cost, resource or contractual change is implemented.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
