import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, FileSpreadsheet, Brain, Send, LayoutTemplate, ChevronRight } from 'lucide-react'
import { useProjectStore } from '@/store/project'
const tools=[
 {title:'Executive Weekly Report',description:'Project-wide PMO weekly management report.',to:'/app/pmo-weekly-report',icon:FileText},
 {title:'Reporting Centre',description:'Executive reporting and consolidated project reporting.',to:'/app/executive-reporting',icon:FileSpreadsheet},
 {title:'Executive Narrative',description:'Management narrative and project intelligence.',to:'/app/executive-narrative',icon:Brain},
 {title:'Report Designer',description:'Configure report presentation and layouts.',to:'/app/report-designer',icon:LayoutTemplate},
 {title:'Report Distribution',description:'Manage report distribution and circulation.',to:'/app/report-distribution',icon:Send},
]
function mondayInLagos() {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date())
  const get = (key: string) => Number(parts.find(part => part.type === key)?.value)
  const d = new Date(Date.UTC(get('year'),get('month')-1,get('day')))
  const offset = (d.getUTCDay()+6)%7
  d.setUTCDate(d.getUTCDate()-offset)
  return d.toISOString().slice(0,10)
}
function SubmissionTracker({projectId}:{projectId:number|null}) {
  const [week,setWeek] = useState(mondayInLagos)
  const [records,setRecords] = useState<Record<string,any[]>>({})
  const [errors,setErrors] = useState<string[]>([])
  const [loading,setLoading] = useState(false)
  useEffect(()=>{
    if (!projectId) return
    let active = true
    setLoading(true)
    Promise.all([
      supabase.from('design_report_submissions').select('id,report_week,submitted_at,submitted_by,status').eq('project_id',projectId).eq('report_week',week),
      supabase.from('cost_report_submissions').select('id,report_week,submitted_at,submitted_by,status').eq('project_id',projectId).eq('report_week',week),
      supabase.from('weekly_reports').select('id,report_date,submitted_at,submitted_by,status,discipline').eq('project_id',projectId).gte('report_date',week).lte('report_date',new Date(Date.parse(week+'T00:00:00Z')+4*86400000).toISOString().slice(0,10))
    ]).then(results=>{
      if(!active)return
      setRecords({Design:results[0].data||[],Costing:results[1].data||[],IPD:results[2].data||[]})
      setErrors(results.flatMap((result,index)=>result.error?[`${['Design','Costing','IPD'][index]}: ${result.error.message}`]:[]))
    }).finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[projectId,week])
  const rows = [
    {name:'Design',items:records.Design||[]},
    {name:'Costing',items:records.Costing||[]},
    ...['Housebuild','Mechanical','Electrical','Infrastructure'].map(name=>({name,items:(records.IPD||[]).filter((r:any)=>String(r.discipline||'').toLowerCase()===name.toLowerCase())}))
  ]
  return <section className="rounded-2xl border border-[#dfe5ea] bg-white p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-xl">Weekly submission tracker</h2><p className="text-sm text-[#65717c]">Current project · submitted records only. Missing records require follow-up.</p></div><label className="text-sm">Week commencing <input aria-label="Week commencing" type="date" value={week} onChange={e=>setWeek(e.target.value)} className="ml-2 rounded border p-2"/></label></div>
    {!projectId&&<p>Select a project to see its reporting status.</p>}
    {loading&&<p>Loading submissions…</p>}
    {errors.length>0&&<p role="alert" className="text-sm text-red-700">Unable to verify all departments: {errors.join(' · ')}</p>}
    {!loading&&!!projectId&&<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="py-2">Department</th><th>Status</th><th>Submitted at</th><th>Records</th></tr></thead><tbody>{rows.map(row=><tr key={row.name} className="border-b"><td className="py-3 font-medium">{row.name}</td><td>{row.items.length?'Submitted':'Not recorded'}</td><td>{row.items[0]?.submitted_at?new Date(row.items[0].submitted_at).toLocaleString('en-NG',{timeZone:'Africa/Lagos'}):'—'}</td><td>{row.items.length}</td></tr>)}</tbody></table></div>}
    <p className="text-xs text-[#65717c]">This view does not yet determine which departments were required to submit or send notifications. “Not recorded” is not automatically an overdue finding.</p>
  </section>
}
export default function PMOReportsHubPage(){const {projectName,projectId}=useProjectStore();return <div className="min-h-screen -m-4 bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 text-[#102943]"><div className="max-w-6xl mx-auto space-y-7"><div><Link to="/app/reports" className="text-sm text-[#df5f41] hover:underline">← Reports</Link><div className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[#df5f41] font-semibold">PMO & Executive</div><h1 className="mt-2 text-3xl font-bold">PMO / Executive Reports</h1><p className="mt-2 text-sm text-[#65717c]">{projectName || 'Current project'} · Management reporting tools in one place.</p></div><div className="grid gap-4 md:grid-cols-2">{tools.map(({title,description,to,icon:Icon})=><Link key={title} to={to} className="group rounded-2xl border border-[#dfe5ea] bg-white p-5 shadow-sm transition hover:border-[#ffb7a5] hover:shadow-md"><div className="flex items-center gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0ec] text-[#df5f41]"><Icon size={21}/></div><div className="min-w-0 flex-1"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-[#65717c]">{description}</p></div><ChevronRight size={19} className="text-[#9aa6b2] group-hover:text-[#df5f41]"/></div></Link>)}</div><SubmissionTracker projectId={projectId}/></div></div>}
