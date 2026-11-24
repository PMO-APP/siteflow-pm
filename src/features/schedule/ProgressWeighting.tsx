import {useState} from 'react'
import type {Task} from '@/types'
import {executableTasks,calculateProgressPosition} from '@/core/metrics/progressMetrics'
import {constructionTemplates,proposeWeights,type WeightRow} from './constructionWeights'
export default function ProgressWeighting({tasks}:{tasks:Task[]}) {
 const eligible=executableTasks(tasks).filter(t=>!t.is_milestone)
 const [mode,setMode]=useState('BOQ / manual')
 const [draft,setDraft]=useState<Record<string,WeightRow>>({})
 const [open,setOpen]=useState(false)
 const groups=constructionTemplates[mode as keyof typeof constructionTemplates] as Record<string,number>|undefined
 const rows=eligible.map(t=>draft[t.id]||{id:t.id,category:'',value:0})
 let result:ReturnType<typeof proposeWeights>=[],error=''
 try {result=proposeWeights(rows,groups)} catch(e){error=(e as Error).message}
 const preview=result.length?calculateProgressPosition(eligible.map(t=>({...t,weight_pct:result.find(r=>r.id===t.id)?.weight_pct}))):null
 function exportDraft(){const blob=new Blob([JSON.stringify({status:'draft',method:mode,activities:result},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='progress-weighting-draft.json';a.click();URL.revokeObjectURL(url)}
 return <section className="rounded-2xl border bg-white p-5"><button className="font-semibold text-[#123a60]" onClick={()=>setOpen(!open)}>Progress Weighting {open?'−':'+'}</button><p className="text-sm text-slate-500">Prepare and review construction scope weights. Draft only; live reporting is unchanged.</p>{open&&<div className="mt-4 space-y-3"><select className="rounded border p-2" value={mode} onChange={e=>{setMode(e.target.value);setDraft({})}}>{['BOQ / manual',...Object.keys(constructionTemplates)].map(m=><option key={m}>{m}</option>)}</select><p className="text-sm">{groups?'Assign each activity to a category and enter relative scope values within that category.':'Enter comparable BOQ values or manual relative weights for each activity. Use zero for non-physical activities.'}</p><div className="max-h-96 overflow-auto"><table className="w-full text-sm"><thead><tr><th>Activity</th><th>Category</th><th>Scope value</th><th>Weight %</th></tr></thead><tbody>{eligible.map((t,i)=><tr key={t.id} className="border-t"><td className="p-2">{t.name}</td><td>{groups&&<select value={rows[i].category} onChange={e=>setDraft({...draft,[t.id]:{...rows[i],category:e.target.value}})}><option value="">Select</option>{Object.keys(groups).map(g=><option key={g}>{g}</option>)}</select>}</td><td><input aria-label={`Scope value for ${t.name}`} type="number" min="0" className="w-28 border rounded p-1" value={rows[i].value} onChange={e=>setDraft({...draft,[t.id]:{...rows[i],value:Number(e.target.value)}})}/></td><td>{result[i]?.weight_pct??'—'}</td></tr>)}</tbody></table></div>{error?<p className="text-amber-700">{error}</p>:<p>Draft weighted actual: {preview?.actual}% · planned: {preview?.planned}% · Total: 100%</p>}<button disabled={!!error} onClick={exportDraft} className="rounded bg-[#123a60] px-4 py-2 text-white disabled:opacity-40">Export draft for review</button></div>}</section>
}
