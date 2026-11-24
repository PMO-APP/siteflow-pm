import {useState} from 'react'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {supabase} from '@/lib/supabase'
import {useMembershipStore} from '@/store/membership'
import type {Task} from '@/types'
import {executableTasks,calculateProgressPosition} from '@/core/metrics/progressMetrics'
import {constructionTemplates,proposeWeights,proposePackageWeights,type WeightRow} from './constructionWeights'
export default function ProgressWeighting({tasks,projectId,packageNames}:{tasks:Task[],projectId:number|string,packageNames:Record<string,string>}) {
 const qc=useQueryClient()
 const role=useMembershipStore(s=>s.role)
 const admin=['admin','workspace_admin'].includes(role||'')
 const [reason,setReason]=useState('')
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const history=useQuery({queryKey:['progress-weight-history',projectId],enabled:admin,queryFn:async()=>{const {data,error}=await supabase.from('progress_weight_versions').select('id,method,reason,approved_at').eq('project_id',projectId).order('id',{ascending:false});if(error)throw error;return data}})
 const eligible=executableTasks(tasks).filter(t=>!t.is_milestone)
 const [packageMode,setPackageMode]=useState(false)
 const [packageValues,setPackageValues]=useState<Record<string,number>>({})
 const packageIds=[...new Set(eligible.map(t=>t.delivery_package_id||'unassigned'))]
 const [mode,setMode]=useState('BOQ / manual')
 const [draft,setDraft]=useState<Record<string,WeightRow>>({})
 const [open,setOpen]=useState(false)
 const groups=constructionTemplates[mode as keyof typeof constructionTemplates] as Record<string,number>|undefined
 const rows=eligible.map(t=>draft[t.id]||{id:t.id,category:'',value:0})
 let result:ReturnType<typeof proposeWeights>=[],error=''
 try {result=packageMode?proposePackageWeights(rows.map((r,i)=>({...r,packageId:eligible[i].delivery_package_id||'unassigned'})),packageValues,groups):proposeWeights(rows,groups)} catch(e){error=(e as Error).message}
 const preview=result.length?calculateProgressPosition(eligible.map(t=>({...t,weight_pct:result.find(r=>r.id===t.id)?.weight_pct}))):null
 async function approve(){if(!admin||error||busy||reason.trim().length<5)return;if(!window.confirm('Approve these weights for the entire project? Live progress may change.'))return;setBusy(true);setMessage('');try{const {error}=await supabase.rpc('approve_progress_weights',{p_project_id:Number(projectId),p_method:mode,p_weights:result,p_reason:reason});if(error)throw error;setMessage('Weights approved.');await qc.invalidateQueries()}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
 function exportDraft(){const blob=new Blob([JSON.stringify({status:'draft',method:mode,activities:result},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='progress-weighting-draft.json';a.click();URL.revokeObjectURL(url)}
 return <section className="rounded-2xl border bg-white p-5"><button className="font-semibold text-[#123a60]" onClick={()=>setOpen(!open)}>Progress Weighting {open?'−':'+'}</button><p className="text-sm text-slate-500">Prepare and review construction scope weights. Draft weights do not affect reporting until administrator approval.</p>{open&&<div className="mt-4 space-y-3"><select className="rounded border p-2" value={mode} onChange={e=>{setMode(e.target.value);setDraft({})}}>{['BOQ / manual',...Object.keys(constructionTemplates)].map(m=><option key={m}>{m}</option>)}</select><label className="block"><input type="checkbox" checked={packageMode} onChange={e=>setPackageMode(e.target.checked)}/> Allocate scope by delivery package</label>{packageMode&&packageIds.map(id=><label key={id} className="block">{packageNames[id]||id} <input type="number" min="0" className="border rounded p-1" value={packageValues[id]??0} onChange={e=>setPackageValues({...packageValues,[id]:Number(e.target.value)})}/></label>)}<p className="text-sm">{groups?'Assign each activity to a category and enter relative scope values within that category.':'Enter comparable BOQ values or manual relative weights for each activity. Use zero for non-physical activities.'}</p><div className="max-h-96 overflow-auto"><table className="w-full text-sm"><thead><tr><th>Activity</th><th>Category</th><th>Scope value</th><th>Weight %</th></tr></thead><tbody>{eligible.map((t,i)=><tr key={t.id} className="border-t"><td className="p-2">{t.name}<div className="text-xs text-slate-500">{packageNames[t.delivery_package_id||'unassigned']||t.delivery_package_id||'Unassigned'}</div></td><td>{groups&&<select value={rows[i].category} onChange={e=>setDraft({...draft,[t.id]:{...rows[i],category:e.target.value}})}><option value="">Select</option>{Object.keys(groups).map(g=><option key={g}>{g}</option>)}</select>}</td><td><input aria-label={`Scope value for ${t.name}`} type="number" min="0" className="w-28 border rounded p-1" value={rows[i].value} onChange={e=>setDraft({...draft,[t.id]:{...rows[i],value:Number(e.target.value)}})}/></td><td>{result[i]?.weight_pct??'—'}</td></tr>)}</tbody></table></div>{error?<p className="text-amber-700">{error}</p>:<p>Draft weighted actual: {preview?.actual}% · planned: {preview?.planned}% · Total: 100%</p>}<button disabled={!!error} onClick={exportDraft} className="rounded bg-[#123a60] px-4 py-2 text-white disabled:opacity-40">Export draft for review</button>{admin&&<div className="space-y-2 border-t pt-3"><label>Approval reason<input className="block w-full rounded border p-2" value={reason} onChange={e=>setReason(e.target.value)}/></label><button disabled={!!error||busy||reason.trim().length<5||history.isError||history.isLoading} onClick={approve} className="rounded bg-[#123a60] px-4 py-2 text-white disabled:opacity-40">Approve project weights</button><p role="status">{message}</p><h4 className="font-semibold">Approval history</h4>{history.isError?<p>History unavailable. Apply and verify the database migration first.</p>:history.data?.map(v=><p key={v.id}>Version {v.id} · {v.method} · {new Date(v.approved_at).toLocaleString()} · {v.reason}</p>)}</div>}</div>}</section>
}
