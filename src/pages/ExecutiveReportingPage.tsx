
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Plus, RefreshCw, Download, FileSpreadsheet, CheckCircle2, Clock3 } from 'lucide-react'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { useProjectStore } from '@/store/project'
import {
  approveReport, exportReportExcel, exportReportPdf, generateExecutiveReport,
  listGeneratedReports, listReportTemplates
} from '@/services/executiveReportService'
import type { ExecutiveReportType, GeneratedReport, ReportTemplate } from '@/services/executiveReportTypes'

const REPORT_LABELS: Record<ExecutiveReportType,string> = {
  executive_portfolio:'Executive Portfolio Report',
  weekly_pmo:'Weekly PMO Report',
  monthly_board:'Monthly Board Report',
  project_health:'Project Health Report',
  risk:'Risk Report',
  procurement:'Procurement Status Report',
  cost:'Cost Report',
  contractor_performance:'Contractor Performance Report',
  consultant_performance:'Consultant Performance Report',
  quality:'QA/QC Report',
  hse:'HSE Report',
  schedule_recovery:'Schedule Recovery Report'
}

export default function ExecutiveReportingPage() {
  const navigate = useNavigate()
  const { activeWorkspace } = useWorkspace()
  const { projectId, projectName, portfolioId } = useProjectStore()
  const [templates,setTemplates]=useState<ReportTemplate[]>([])
  const [reports,setReports]=useState<GeneratedReport[]>([])
  const [loading,setLoading]=useState(true)
  const [message,setMessage]=useState('')
  const [showCreate,setShowCreate]=useState(false)

  async function load(){
    if(!activeWorkspace)return
    setLoading(true);setMessage('')
    try{
      const [templateData,reportData]=await Promise.all([
        listReportTemplates(activeWorkspace.id),
        listGeneratedReports(activeWorkspace.id)
      ])
      setTemplates(templateData);setReports(reportData)
    }catch(err){setMessage(err instanceof Error?err.message:'Unable to load executive reporting centre.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[activeWorkspace?.id])

  const approved=reports.filter(r=>r.status==='approved').length
  const latest=reports[0]
  const grouped=useMemo(()=>templates.reduce<Record<string,ReportTemplate[]>>((acc,t)=>{(acc[t.reportType] ||= []).push(t);return acc},{}),[templates])

  if(!activeWorkspace)return <div className="rounded-2xl border bg-white p-8">No active workspace.</div>

  return <div className="-m-4 min-h-screen bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="rounded-[26px] border border-[#dfe3e7] bg-white p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#df5f41]">Executive reporting engine</div><h1 className="mt-2 text-3xl font-semibold text-[#102943]">Executive Reporting Centre</h1><p className="mt-2 max-w-3xl text-sm text-[#6f7d89]">Generate versioned, branded management reports from live workspace and project data.</p></div>
          <div className="flex flex-wrap gap-2"><button onClick={()=>navigate('/app/boardroom')} className="btn btn-ghost">Boardroom</button><button onClick={()=>navigate('/app/report-distribution')} className="btn btn-ghost">Report distribution</button><button onClick={()=>navigate('/app/report-designer')} className="btn btn-ghost">Report designer</button><button onClick={()=>navigate('/app/executive-narrative')} className="btn btn-ghost">Executive narrative</button><button onClick={()=>setShowCreate(true)} className="btn btn-gold"><Plus size={15}/>Generate report</button><button onClick={()=>void load()} className="btn btn-ghost"><RefreshCw size={15}/>Refresh</button></div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Templates" value={templates.length} helper="Available report structures"/>
        <Metric label="Generated reports" value={reports.length} helper="Stored report versions"/>
        <Metric label="Approved" value={approved} helper="Approved for distribution"/>
        <Metric label="Latest version" value={latest?`v${latest.versionNumber}`:'—'} helper={latest?.title||'No reports yet'}/>
      </section>

      {message&&<div className="rounded-xl border border-[#f1d5c9] bg-[#fff6f2] px-4 py-3 text-sm text-[#9a4b31]">{message}</div>}

      <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="rounded-[24px] border border-[#dfe3e7] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#102943]">Report library</h2>
          <p className="mt-1 text-sm text-[#87929b]">Standard templates available to this workspace.</p>
          <div className="mt-5 space-y-3">{templates.length===0?<div className="rounded-xl bg-[#f7f9fa] p-6 text-center text-sm text-[#87929b]">Run the reporting migration to seed standard templates.</div>:Object.entries(grouped).map(([type,items])=><div key={type} className="rounded-xl border border-[#e4eaed] p-4"><div className="flex items-center gap-2"><FileText size={16} className="text-[#1f668f]"/><div className="font-semibold text-[#26384a]">{REPORT_LABELS[type as ExecutiveReportType]||type}</div></div><div className="mt-2 text-xs text-[#87929b]">{items[0]?.description}</div><div className="mt-3 text-[10px] uppercase tracking-wider text-[#929da5]">{items[0]?.sections.length} sections</div></div>)}</div>
        </div>

        <div className="rounded-[24px] border border-[#dfe3e7] bg-white">
          <div className="border-b border-[#e6ecef] p-5"><h2 className="text-lg font-semibold text-[#102943]">Generated reports</h2><p className="mt-1 text-sm text-[#87929b]">Versioned reports generated from a fixed source-data timestamp.</p></div>
          {loading?<div className="p-12 text-center text-sm text-[#87929b]">Loading reports…</div>:reports.length===0?<div className="p-12 text-center"><FileText size={28} className="mx-auto text-[#c5d0d5]"/><div className="mt-3 text-sm font-semibold text-[#52616d]">No reports generated yet</div><div className="mt-1 text-xs text-[#98a3aa]">Generate the first report from live project data.</div></div>:<div className="divide-y divide-[#edf0f2]">{reports.map(report=><article key={report.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-[#102943]">{report.title}</h3><span className="badge badge-muted">v{report.versionNumber}</span><span className={`badge ${report.status==='approved'?'badge-green':'badge-amber'}`}>{report.status}</span></div><div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[#929da5]"><span className="flex items-center gap-1"><Clock3 size={12}/>{new Date(report.generatedAt).toLocaleString()}</span><span>{REPORT_LABELS[report.reportType]}</span></div><p className="mt-3 max-w-3xl text-sm leading-6 text-[#6f7d89]">{report.executiveSummary}</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>exportReportPdf(report,activeWorkspace)} className="btn btn-ghost"><Download size={14}/>PDF</button><button onClick={()=>exportReportExcel(report)} className="btn btn-ghost"><FileSpreadsheet size={14}/>Excel</button>{report.status!=='approved'&&<button onClick={async()=>{try{await approveReport(report.id);await load();setMessage('Report approved.')}catch(err){setMessage(err instanceof Error?err.message:'Unable to approve report.')}}} className="btn btn-gold"><CheckCircle2 size={14}/>Approve</button>}</div></div></article>)}</div>}
        </div>
      </section>
    </div>

    {showCreate&&<GenerateDrawer
      templates={templates}
      workspaceId={activeWorkspace.id}
      currentProjectId={projectId}
      currentProjectName={projectName}
      currentPortfolioId={portfolioId}
      onClose={()=>setShowCreate(false)}
      onGenerate={async (values:any)=>{
        try{
          await generateExecutiveReport(activeWorkspace,values)
          setShowCreate(false);setMessage('Report generated successfully.');await load()
        }catch(err){setMessage(err instanceof Error?err.message:'Unable to generate report.')}
      }}
    />}
  </div>
}

function GenerateDrawer({templates,workspaceId,currentProjectId,currentProjectName,currentPortfolioId,onClose,onGenerate}:any){
  const [form,setForm]=useState({
    reportType:'weekly_pmo' as ExecutiveReportType,
    title:currentProjectName?`${currentProjectName} Weekly PMO Report`:'Executive Portfolio Report',
    reportingPeriodStart:'',
    reportingPeriodEnd:new Date().toISOString().slice(0,10),
    scope:'project',
    templateId:''
  })
  const [saving,setSaving]=useState(false)
  useEffect(()=>{
    const defaultTemplate=templates.find((t:ReportTemplate)=>t.reportType===form.reportType&&t.isDefault)||templates.find((t:ReportTemplate)=>t.reportType===form.reportType)
    setForm(current=>({...current,templateId:defaultTemplate?.id||''}))
  },[form.reportType,templates])

  async function submit(e:FormEvent){
    e.preventDefault();setSaving(true)
    try{
      await onGenerate({
        workspaceId,
        projectId:form.scope==='project'?currentProjectId:null,
        portfolioId:form.scope==='portfolio'?currentPortfolioId:null,
        reportType:form.reportType,
        title:form.title,
        reportingPeriodStart:form.reportingPeriodStart||null,
        reportingPeriodEnd:form.reportingPeriodEnd||null,
        templateId:form.templateId||null
      })
    }finally{setSaving(false)}
  }
  return <div className="fixed inset-0 z-50 bg-[#102943]/35" onClick={onClose}><aside className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="text-xs uppercase tracking-wider text-[#df5f41]">Report generation</div><h2 className="mt-2 text-2xl font-semibold text-[#102943]">Generate executive report</h2><form onSubmit={submit} className="mt-6 space-y-4">
    <Field label="Report type"><select className="form-control" value={form.reportType} onChange={e=>setForm({...form,reportType:e.target.value as ExecutiveReportType,title:REPORT_LABELS[e.target.value as ExecutiveReportType]})}>{Object.entries(REPORT_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
    <Field label="Report title"><input className="form-control" required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field>
    <Field label="Scope"><select className="form-control" value={form.scope} onChange={e=>setForm({...form,scope:e.target.value})}><option value="workspace">Entire workspace</option><option value="portfolio" disabled={!currentPortfolioId}>Current portfolio</option><option value="project" disabled={!currentProjectId}>Current project</option></select></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Period start"><input type="date" className="form-control" value={form.reportingPeriodStart} onChange={e=>setForm({...form,reportingPeriodStart:e.target.value})}/></Field><Field label="Period end"><input type="date" className="form-control" value={form.reportingPeriodEnd} onChange={e=>setForm({...form,reportingPeriodEnd:e.target.value})}/></Field></div>
    <Field label="Template"><select className="form-control" value={form.templateId} onChange={e=>setForm({...form,templateId:e.target.value})}><option value="">Default structure</option>{templates.filter((t:ReportTemplate)=>t.reportType===form.reportType).map((t:ReportTemplate)=><option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
    <div className="rounded-xl bg-[#f4f8fa] p-4 text-xs leading-6 text-[#6f7d89]">The report stores a fixed data snapshot, executive summary, version number and source-data timestamp. Exported reports use the active workspace branding.</div>
    <div className="flex justify-end gap-2 pt-3"><button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button><button disabled={saving} className="btn btn-gold">{saving?'Generating…':'Generate report'}</button></div>
  </form></aside></div>
}

function Metric({label,value,helper}:{label:string;value:any;helper:string}){return <div className="rounded-2xl border border-[#dfe3e7] bg-white p-5"><div className="text-3xl font-semibold text-[#102943]">{value}</div><div className="mt-2 text-xs font-semibold text-[#536170]">{label}</div><div className="mt-1 text-[11px] text-[#87929b]">{helper}</div></div>}
function Field({label,children}:{label:string;children:any}){return <label className="block text-xs font-semibold text-[#52616d]">{label}<div className="mt-2">{children}</div></label>}
