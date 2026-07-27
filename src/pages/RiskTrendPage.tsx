import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'

export default function RiskTrendPage() {
  const [risks, setRisks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const { projectId } = useProjectStore()

  useEffect(() => {
    load()
  }, [projectId])

  async function load() {
    setLoading(true)

    if (!projectId) {
      setRisks([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('risks')
      .select('*')
      .eq('project_id', projectId)

    if (error) {
      console.error(error)
      setRisks([])
    } else {
      setRisks(data || [])
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="card p-8 text-[#65717c]">
        Loading risk trends…
      </div>
    )
  }

  if (risks.length === 0) {
    return (
      <div className="card p-8 text-[#65717c]">
        No risk trend data available for this project yet.
      </div>
    )
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

  const maxSeverity = Math.max(
    severityCount.High,
    severityCount.Medium,
    severityCount.Low,
    1
  )

  const barWidth = (count: number) =>
    `${Math.round((count / maxSeverity) * 100)}%`

  return (
    <div className="pmx-command-page min-h-screen -m-4 space-y-5 bg-[#f6f5f1] p-4 text-[#18212b] sm:-m-6 sm:p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-3xl text-red-400 font-bold">{open}</div>
          <div className="text-sm text-[#65717c]">Open Risks</div>
        </div>

        <div className="card p-4">
          <div className="text-3xl text-red-500 font-bold">{critical}</div>
          <div className="text-sm text-[#65717c]">Critical Risks</div>
        </div>

        <div className="card p-4">
          <div className="text-3xl text-amber-400 font-bold">{auto}</div>
          <div className="text-sm text-[#65717c]">Auto Risks</div>
        </div>

        <div className="card p-4">
          <div className="text-3xl text-emerald-400 font-bold">{closed}</div>
          <div className="text-sm text-[#65717c]">Closed Risks</div>
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
            <div className="h-3 bg-[#e7ebee] rounded">
              <div
                className="h-3 bg-red-500 rounded"
                style={{ width: barWidth(severityCount.High) }}
              />
            </div>
          </div>

          <div>
            <div className="text-sm mb-1">
              Medium ({severityCount.Medium})
            </div>
            <div className="h-3 bg-[#e7ebee] rounded">
              <div
                className="h-3 bg-amber-400 rounded"
                style={{ width: barWidth(severityCount.Medium) }}
              />
            </div>
          </div>

          <div>
            <div className="text-sm mb-1">
              Low ({severityCount.Low})
            </div>
            <div className="h-3 bg-[#e7ebee] rounded">
              <div
                className="h-3 bg-emerald-400 rounded"
                style={{ width: barWidth(severityCount.Low) }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
