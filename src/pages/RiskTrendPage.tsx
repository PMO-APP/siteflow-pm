import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function RiskTrendPage() {
  const [risks, setRisks] = useState<any[]>([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('risks')
      .select('*')

    setRisks(data || [])
  }

  const open = risks.filter(r => r.status === 'Open').length
  const critical = risks.filter(r => r.severity === 'High').length
  const auto = risks.filter(r => r.source === 'Auto from Schedule').length
  const closed = risks.filter(r => r.status === 'Closed').length

  const severityCount = {
    High: risks.filter(r => r.severity === 'High').length,
    Medium: risks.filter(r => r.severity === 'Medium').length,
    Low: risks.filter(r => r.severity === 'Low').length,
  }

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <div className="card p-4">
          <div className="text-3xl text-red-400 font-bold">{open}</div>
          <div className="text-sm text-slate-400">Open Risks</div>
        </div>

        <div className="card p-4">
          <div className="text-3xl text-red-500 font-bold">{critical}</div>
          <div className="text-sm text-slate-400">Critical Risks</div>
        </div>

        <div className="card p-4">
          <div className="text-3xl text-amber-400 font-bold">{auto}</div>
          <div className="text-sm text-slate-400">Auto Risks</div>
        </div>

        <div className="card p-4">
          <div className="text-3xl text-emerald-400 font-bold">{closed}</div>
          <div className="text-sm text-slate-400">Closed Risks</div>
        </div>

      </div>

      <div className="card p-4">
        <div className="text-lg font-semibold mb-4">
          Risks by Severity
        </div>

        <div className="space-y-3">

          <div>
            <div className="text-sm mb-1">
              High ({severityCount.High})
            </div>
            <div className="h-3 bg-slate-800 rounded">
              <div
                className="h-3 bg-red-500 rounded"
                style={{
                  width: `${severityCount.High * 20}px`
                }}
              />
            </div>
          </div>

          <div>
            <div className="text-sm mb-1">
              Medium ({severityCount.Medium})
            </div>
            <div className="h-3 bg-slate-800 rounded">
              <div
                className="h-3 bg-amber-400 rounded"
                style={{
                  width: `${severityCount.Medium * 20}px`
                }}
              />
            </div>
          </div>

          <div>
            <div className="text-sm mb-1">
              Low ({severityCount.Low})
            </div>
            <div className="h-3 bg-slate-800 rounded">
              <div
                className="h-3 bg-emerald-400 rounded"
                style={{
                  width: `${severityCount.Low * 20}px`
                }}
              />
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
