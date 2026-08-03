
import { useEffect, useState } from 'react'
import { Archive, ArrowDown, ArrowUp, Copy, Eye, FileText, GripVertical, Plus, RotateCcw, Save, Settings2, Star, Trash2 } from 'lucide-react'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import {
  WIDGET_LIBRARY, archiveDesignerTemplate, duplicateDesignerTemplate, listDesignerTemplates,
  makeWidget, restoreDesignerTemplate, saveDesignerTemplate, setDefaultDesignerTemplate
} from '@/services/reportDesignerService'
import type { DesignerTemplate, ReportWidget, ReportWidgetType } from '@/services/reportDesignerTypes'

const emptyTemplate=(workspaceId:string):DesignerTemplate=>({
  workspaceId,name:'New Executive Report',reportType:'custom',description:'',
  defaultScope:'workspace',orientation:'portrait',confidentialityLabel:'Confidential',
  signatory:'',approvalRole:'pmo',defaultRecipients:[],widgets:[
    makeWidget('cover'),makeWidget('executive_summary'),makeWidget('kpi_cards')
  ],isDefault:false,isActive:true
})

export default function ReportDesignerPage(){
  const {activeWorkspace}=useWorkspace()
  const [templates,setTemplates]=useState<DesignerTemplate[]>([])
  const [template,setTemplate]=useState<DesignerTemplate|null>(null)
  const [selected,setSelected]=useState<string|null>(null)
  const [message,setMessage]=useState('')
  const [preview,setPreview]=useState(false)

  async function load(){
    if(!activeWorkspace)return
    try{
      const rows=await listDesignerTemplates(activeWorkspace.id)
      setTemplates(rows)
      if(!template)setTemplate(rows[0]||emptyTemplate(activeWorkspace.id))
    }catch(e){setMessage(e instanceof Error?e.message:'Unable to load report templates.')}
  }
  useEffect(()=>{void load()},[activeWorkspace?.id])

  if(!activeWorkspace||!template)return <div className="rounded-2xl border bg-white p-8">Loading report designer…</div>

  const selectedWidget=template.widgets.find(w=>w.id===selected)||null
  const updateWidget=(id:string,patch:Partial<ReportWidget>)=>setTemplate({...template,widgets:template.widgets.map(w=>w.id===id?{...w,...patch}:w)})
  const move=(index:number,delta:number)=>{
    const next=[...template.widgets],target=index+delta
    if(target<0||target>=next.length)return
    ;[next[index],next[target]]=[next[target],next[index]]
    setTemplate({...template,widgets:next})
  }
  async function save(){
    if(!template)return
    try{const saved=await saveDesignerTemplate(template);setTemplate(saved);setMessage('Template saved.');await load()}
    catch(e){setMessage(e instanceof Error?e.message:'Unable to save template.')}
  }

  return <div className="-m-4 min-h-screen bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1700px] space-y-5">
      <section className="rounded-[26px] border border-[#dfe3e7] bg-white p-7">
        <div className="flex flex-wrap justify-between gap-4"><div><div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#df5f41]">Interactive report designer</div><h1 className="mt-2 text-3xl font-semibold text-[#102943]">Report Designer</h1><p className="mt-2 text-sm text-[#6f7d89]">Build reusable, branded reports from live SiteFlow PM data sources.</p></div>
        <div className="flex gap-2"><button onClick={()=>setPreview(!preview)} className="btn btn-ghost"><Eye size={15}/>{preview?'Edit':'Preview'}</button><button onClick={()=>void save()} className="btn btn-gold"><Save size={15}/>Save template</button></div></div>
      </section>

      {message&&<div className="rounded-xl border border-[#f1d5c9] bg-[#fff6f2] px-4 py-3 text-sm text-[#9a4b31]">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_330px]">
        <aside className="space-y-5">
          <Panel title="Templates">
            <button onClick={()=>setTemplate(emptyTemplate(activeWorkspace.id))} className="btn btn-ghost mb-3 w-full"><Plus size={14}/>New template</button>
            <div className="space-y-2">{templates.map(item=><button key={item.id} onClick={()=>setTemplate(item)} className={`w-full rounded-xl border p-3 text-left ${template.id===item.id?'border-[#8fb0c7] bg-[#eef5f8]':'border-[#e2e8eb]'}`}><div className="flex items-center justify-between"><span className="text-sm font-semibold text-[#26384a]">{item.name}</span>{item.isDefault&&<Star size={13}/>}</div><div className="mt-1 text-[11px] text-[#87929b]">{item.isActive?'Active':'Archived'}</div></button>)}</div>
          </Panel>
          <Panel title="Widget library">
            <div className="grid gap-2">{WIDGET_LIBRARY.map(item=><button key={item.type} onClick={()=>setTemplate({...template,widgets:[...template.widgets,makeWidget(item.type)]})} className="flex items-center gap-2 rounded-xl border border-[#e2e8eb] p-3 text-left text-xs font-semibold text-[#52616d] hover:bg-[#f8fafb]"><Plus size={13}/>{item.title}</button>)}</div>
          </Panel>
        </aside>

        <main>
          {preview?<Preview template={template} workspaceName={activeWorkspace.name} primary={activeWorkspace.branding.primaryColor}/>:<div className="rounded-[24px] border border-[#dfe3e7] bg-white p-5">
            <div className="mb-4 grid gap-3 md:grid-cols-2"><input className="form-control" value={template.name} onChange={e=>setTemplate({...template,name:e.target.value})}/><input className="form-control" placeholder="Description" value={template.description} onChange={e=>setTemplate({...template,description:e.target.value})}/></div>
            <div className="space-y-3">{template.widgets.map((widget,index)=><div key={widget.id} onClick={()=>setSelected(widget.id)} className={`rounded-2xl border p-4 ${selected===widget.id?'border-[#8fb0c7] bg-[#f4f9fb]':'border-[#dfe5e8] bg-white'}`}><div className="flex items-center gap-3"><GripVertical size={16} className="text-[#9aa4aa]"/><div className="min-w-0 flex-1"><div className="font-semibold text-[#26384a]">{widget.title}</div><div className="mt-1 text-[11px] text-[#87929b]">{widget.dataSource||'Manual content'} · {widget.type}</div></div><button onClick={e=>{e.stopPropagation();move(index,-1)}}><ArrowUp size={15}/></button><button onClick={e=>{e.stopPropagation();move(index,1)}}><ArrowDown size={15}/></button><button onClick={e=>{e.stopPropagation();setTemplate({...template,widgets:template.widgets.filter(w=>w.id!==widget.id)})}}><Trash2 size={15}/></button></div></div>)}</div>
          </div>}
        </main>

        <aside className="space-y-5">
          <Panel title="Template settings">
            <Field label="Report type"><input className="form-control" value={template.reportType} onChange={e=>setTemplate({...template,reportType:e.target.value})}/></Field>
            <Field label="Default scope"><select className="form-control" value={template.defaultScope} onChange={e=>setTemplate({...template,defaultScope:e.target.value as any})}><option value="workspace">Workspace</option><option value="portfolio">Portfolio</option><option value="project">Project</option></select></Field>
            <Field label="Orientation"><select className="form-control" value={template.orientation} onChange={e=>setTemplate({...template,orientation:e.target.value as any})}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></Field>
            <Field label="Confidentiality"><input className="form-control" value={template.confidentialityLabel} onChange={e=>setTemplate({...template,confidentialityLabel:e.target.value})}/></Field>
            <Field label="Signatory"><input className="form-control" value={template.signatory} onChange={e=>setTemplate({...template,signatory:e.target.value})}/></Field>
            <Field label="Default recipients"><input className="form-control" value={template.defaultRecipients.join(', ')} onChange={e=>setTemplate({...template,defaultRecipients:e.target.value.split(',').map(v=>v.trim()).filter(Boolean)})}/></Field>
            <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={async()=>{const copy=await duplicateDesignerTemplate(template);setTemplate(copy);await load()}} className="btn btn-ghost"><Copy size={14}/>Duplicate</button>{template.id&&<button onClick={async()=>{template.isActive?await archiveDesignerTemplate(template.id!):await restoreDesignerTemplate(template.id!);await load()}} className="btn btn-ghost">{template.isActive?<Archive size={14}/>:<RotateCcw size={14}/>} {template.isActive?'Archive':'Restore'}</button>}</div>
            {template.id&&<button onClick={async()=>{await setDefaultDesignerTemplate(activeWorkspace.id,template.id!,template.reportType);await load()}} className="btn btn-ghost mt-2 w-full"><Star size={14}/>Set as default</button>}
          </Panel>

          {selectedWidget&&<Panel title="Widget settings">
            <Field label="Title"><input className="form-control" value={selectedWidget.title} onChange={e=>updateWidget(selectedWidget.id,{title:e.target.value})}/></Field>
            <Field label="Description"><textarea className="form-control min-h-20" value={selectedWidget.description} onChange={e=>updateWidget(selectedWidget.id,{description:e.target.value})}/></Field>
            <Field label="Data source"><input className="form-control" value={selectedWidget.dataSource||''} onChange={e=>updateWidget(selectedWidget.id,{dataSource:e.target.value||null})}/></Field>
            <Field label="Chart type"><select className="form-control" value={selectedWidget.chartType} onChange={e=>updateWidget(selectedWidget.id,{chartType:e.target.value as any})}><option value="none">None</option><option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option></select></Field>
            <Field label="Maximum records"><input type="number" className="form-control" value={selectedWidget.maxRecords} onChange={e=>updateWidget(selectedWidget.id,{maxRecords:Number(e.target.value)})}/></Field>
            <Field label="Commentary"><textarea className="form-control min-h-20" value={selectedWidget.commentary} onChange={e=>updateWidget(selectedWidget.id,{commentary:e.target.value})}/></Field>
            <label className="mt-3 flex items-center justify-between text-sm"><span>Hide widget</span><input type="checkbox" checked={selectedWidget.hidden} onChange={e=>updateWidget(selectedWidget.id,{hidden:e.target.checked})}/></label>
            <label className="mt-3 flex items-center justify-between text-sm"><span>Page break before</span><input type="checkbox" checked={selectedWidget.pageBreakBefore} onChange={e=>updateWidget(selectedWidget.id,{pageBreakBefore:e.target.checked})}/></label>
          </Panel>}
        </aside>
      </div>
    </div>
  </div>
}

function Preview({template,workspaceName,primary}:{template:DesignerTemplate;workspaceName:string;primary:string}){return <div className="rounded-[24px] border border-[#dfe3e7] bg-white p-8"><div className="border-b pb-5" style={{borderColor:primary}}><div className="text-xs uppercase tracking-widest text-[#87929b]">{template.confidentialityLabel}</div><h2 className="mt-3 text-3xl font-semibold" style={{color:primary}}>{template.name}</h2><p className="mt-2 text-sm text-[#6f7d89]">{workspaceName}</p></div><div className="mt-6 space-y-5">{template.widgets.filter(w=>!w.hidden).map(w=><section key={w.id} className={`${w.pageBreakBefore?'border-t-4 pt-6':''} rounded-2xl border border-[#e3e8eb] p-5`}><h3 className="font-semibold text-[#26384a]">{w.title}</h3>{w.description&&<p className="mt-2 text-sm text-[#7b8791]">{w.description}</p>}<div className="mt-4 rounded-xl bg-[#f6f8f9] p-6 text-center text-xs text-[#87929b]">{w.dataSource?`Live data: ${w.dataSource}`:'Manual content'}{w.chartType!=='none'?` · ${w.chartType} chart`:''}</div>{w.commentary&&<p className="mt-3 text-sm leading-6 text-[#536170]">{w.commentary}</p>}</section>)}</div></div>}
function Panel({title,children}:{title:string;children:any}){return <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-5"><div className="mb-4 flex items-center gap-2 text-[#102943]"><Settings2 size={17}/><h2 className="font-semibold">{title}</h2></div>{children}</section>}
function Field({label,children}:{label:string;children:any}){return <label className="mb-4 block text-xs font-semibold text-[#52616d]">{label}<div className="mt-2">{children}</div></label>}
