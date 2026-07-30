import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ProjectHealthContributor } from '@/core/engine/types'
import { HealthStatusBadge } from './HealthStatusBadge'

function contributorLabel(contributor: ProjectHealthContributor) {
  return contributor.status === 'not_assessed' ? 'Not assessed' : contributor.score! >= 80 ? 'Healthy' : contributor.score! >= 60 ? 'Recoverable' : contributor.score! >= 40 ? 'At risk' : 'Critical'
}

export function HealthContributors({ contributors }: { contributors: ProjectHealthContributor[] }) {
  const [openKey, setOpenKey] = useState<string | null>(contributors[0]?.key || null)

  return (
    <div className="divide-y divide-slate-100">
      {contributors.map(contributor => {
        const open = openKey === contributor.key
        const score = contributor.score
        return (
          <div key={contributor.key} className="py-1">
            <button type="button" onClick={() => setOpenKey(open ? null : contributor.key)} className="flex w-full items-center gap-4 py-3.5 text-left">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{contributor.label}</span>
                  <HealthStatusBadge tone={contributor.tone} label={contributorLabel(contributor)} />
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-700" style={{ width: `${score ?? 0}%`, opacity: score === null ? .2 : 1 }} />
                </div>
              </div>
              <div className="w-14 text-right text-sm font-semibold text-slate-900">{score === null ? '—' : `${score}%`}</div>
              <ChevronDown size={17} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="mb-4 rounded-xl bg-slate-50 p-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">Why this score</div>
                    <ul className="mt-2 space-y-2 text-sm text-slate-700">
                      {(contributor.explanations.length ? contributor.explanations : ['No supporting explanation is available.']).map(item => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-500">Recommended action</div>
                    <ul className="mt-2 space-y-2 text-sm text-slate-700">
                      {(contributor.recommendations.length ? contributor.recommendations : ['Maintain current controls and continue monitoring.']).map(item => <li key={item}>• {item}</li>)}
                    </ul>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(contributor.metrics).slice(0, 6).map(([key, value]) => (
                    <span key={key} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><span className="font-semibold text-slate-800">{key.replace(/_/g, ' ')}:</span> {value ?? '—'}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
