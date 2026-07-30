import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useProjectHealthHistory } from '@/hooks/useProjectHealthHistory'
import { HealthTrendIndicator } from './HealthTrendIndicator'

const ranges = [7, 30, 90]
export function HealthHistoryChart({ projectId }: { projectId?: string | number | null }) {
  const [days, setDays] = useState(30)
  const { history, trend, isLoading } = useProjectHealthHistory(days, projectId)
  const data = history.map(row => ({ date: new Date(row.calculated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), score: Number(row.overall_score) }))
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-semibold text-slate-950">Health history</h3><p className="mt-1 text-sm text-slate-500">Recorded movement from the unified health engine.</p></div>
      <div className="flex items-center gap-2"><HealthTrendIndicator trend={trend.direction} /><div className="rounded-lg bg-slate-100 p-1">{ranges.map(range => <button key={range} onClick={() => setDays(range)} className={`rounded-md px-2.5 py-1 text-xs font-medium ${days === range ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{range}d</button>)}</div></div>
    </div>
    <p className="mt-3 text-sm text-slate-600">{trend.explanation}</p>
    <div className="mt-5 h-56">{isLoading ? <div className="h-full animate-pulse rounded-xl bg-slate-100" /> : data.length < 2 ? <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">Trend becomes available after two snapshots.</div> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} tick={{ fontSize: 11 }} /><Tooltip /><Area type="monotone" dataKey="score" stroke="currentColor" fill="currentColor" fillOpacity={0.12} /></AreaChart></ResponsiveContainer>}</div>
  </section>
}
