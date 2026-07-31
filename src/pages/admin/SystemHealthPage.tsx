import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, Gauge, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Metric = { label: string; value: string; note: string; icon: typeof Activity }
export default function SystemHealthPage() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  useEffect(() => { void (async () => {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const [telemetry, security] = await Promise.all([
      supabase.from('system_telemetry').select('kind,value', { count: 'exact' }).gte('created_at', since),
      supabase.from('security_events').select('severity', { count: 'exact' }).gte('created_at', since),
    ])
    const rows = telemetry.data ?? []
    const durations = rows.filter(r => r.kind === 'performance' && typeof r.value === 'number').map(r => Number(r.value))
    const avg = durations.length ? Math.round(durations.reduce((a,b) => a+b, 0) / durations.length) : 0
    setMetrics([
      { label: 'Telemetry events', value: String(telemetry.count ?? rows.length), note: 'Last 24 hours', icon: Activity },
      { label: 'Average measured duration', value: avg ? `${avg} ms` : 'No data', note: 'Browser performance entries', icon: Gauge },
      { label: 'Security events', value: String(security.count ?? 0), note: 'Authorization and access activity', icon: ShieldCheck },
      { label: 'Client errors', value: String(rows.filter(r => r.kind === 'error').length), note: 'Unhandled errors captured', icon: AlertTriangle },
    ])
  })() }, [])
  return <div className="space-y-6 p-6"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#ef8354]">Administration</p><h1 className="mt-1 text-3xl font-extrabold text-[#173f5f]">System health</h1><p className="mt-2 text-sm text-slate-600">Operational visibility for performance, security, and application reliability.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{metrics.map(m => <div key={m.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><m.icon className="text-[#173f5f]" size={20}/><div className="mt-4 text-2xl font-extrabold text-slate-900">{m.value}</div><div className="mt-1 text-sm font-semibold text-slate-700">{m.label}</div><div className="mt-1 text-xs text-slate-500">{m.note}</div></div>)}</div></div>
}
