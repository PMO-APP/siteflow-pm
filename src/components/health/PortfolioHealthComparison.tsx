import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { HealthTrendIndicator } from './HealthTrendIndicator'
import type { HealthTrend } from './HealthTrendIndicator'

export function PortfolioHealthComparison({ projects }: { projects: any[] }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['portfolio-health-snapshot-comparison', projects.map(item => item.id).join(',')],
    enabled: projects.length > 0,
    queryFn: async () => {
      const ids = projects.map(item => item.id)
      const { data, error } = await supabase.from('project_health_snapshots').select('project_id,overall_score,health_label,calculated_at').in('project_id', ids).order('calculated_at', { ascending: false })
      if (error) throw error
      const grouped = new Map<string, any[]>()
      ;(data || []).forEach(row => { const key = String(row.project_id); grouped.set(key, [...(grouped.get(key) || []), row]) })
      return projects.map(project => {
        const rows = grouped.get(String(project.id)) || []
        const current = rows[0]
        const previous = rows[1]
        const delta = current && previous ? Number(current.overall_score) - Number(previous.overall_score) : 0
        const trend: HealthTrend = !previous ? 'insufficient_history' : delta >= 2 ? 'improving' : delta <= -2 ? 'declining' : 'stable'
        return { project, current, delta, trend }
      }).filter(item => item.current).sort((a, b) => Number(a.current.overall_score) - Number(b.current.overall_score))
    },
    staleTime: 60_000,
  })
  return <section className="mt-6 rounded-2xl border border-[#dfe7e6] bg-white p-5 shadow-sm sm:p-6">
    <div><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#82939c]">Unified health engine</div><h2 className="mt-1 text-xl font-semibold text-[#173f5f]">Portfolio health comparison</h2><p className="mt-1 text-sm text-[#71838d]">Latest persisted health position and movement for each project.</p></div>
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="border-b border-[#dfe7e6] text-[10px] uppercase tracking-[0.14em] text-[#7c8d97]"><th className="px-3 py-3">Project</th><th className="px-3 py-3">Health</th><th className="px-3 py-3">Position</th><th className="px-3 py-3">Trend</th><th className="px-3 py-3">Last calculated</th></tr></thead><tbody>{data.map(item => <tr key={item.project.id} className="border-b border-[#edf2f2]"><td className="px-3 py-4 font-semibold text-[#173f5f]">{item.project.name || item.project.project_name}</td><td className="px-3 py-4 font-semibold text-[#405b69]">{Math.round(Number(item.current.overall_score))}%</td><td className="px-3 py-4 text-sm text-[#536974]">{item.current.health_label}</td><td className="px-3 py-4"><HealthTrendIndicator trend={item.trend} /></td><td className="px-3 py-4 text-sm text-[#71838d]">{new Date(item.current.calculated_at).toLocaleDateString('en-GB')}</td></tr>)}</tbody></table>{!isLoading && data.length === 0 && <div className="py-8 text-center text-sm text-[#82959e]">Health comparisons appear after project snapshots are created.</div>}{isLoading && <div className="py-8 text-center text-sm text-[#82959e]">Loading persisted health…</div>}</div>
  </section>
}
