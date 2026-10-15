import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types'

type PackageOption = { id: string; name: string }
type ReviewRow = { id: string; activity_id: string; review_status: string; quantity_unit: string; quantity_completed?: number; remaining_quantity?: number; observed_on?: string; crew_count?: number; working_hours?: number; planned_crew_count?: number; planned_hours_per_day?: number; working_days_per_week?: number; notes?: string }
export default function ProductionEvidenceReview({ projectId, packages, tasks }: { projectId: string | number; packages: PackageOption[]; tasks: Task[] }) {
 const [isReviewer,setIsReviewer]=useState(false)
 const [packageId,setPackageId]=useState('')
 const [activityId,setActivityId]=useState('')
 const [observations,setObservations]=useState<ReviewRow[]>([])
 const [inputs,setInputs]=useState<ReviewRow[]>([])
 const [quantity,setQuantity]=useState('')
 const [unit,setUnit]=useState('m²')
 const [crew,setCrew]=useState('')
 const [hours,setHours]=useState('8')
 const [days,setDays]=useState('5')
 const [notes,setNotes]=useState('')
 const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({})
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const selected=packageId || packages[0]?.id || ''
 const activities=tasks.filter(t=>String(t.delivery_package_id||'')===selected)
 const activity=activityId || String(activities[0]?.id||'')
 async function reload() {
  const [r,o,i]=await Promise.all([
   supabase.from('package_production_reviewers').select('project_id').eq('project_id',Number(projectId)).limit(1),
   supabase.from('package_production_observations').select('id,activity_id,review_status,quantity_unit,quantity_completed,observed_on,crew_count,working_hours,notes').eq('project_id',Number(projectId)).eq('delivery_package_id',selected).eq('review_status','pending').limit(250),
   supabase.from('package_remaining_work_inputs').select('id,activity_id,review_status,quantity_unit,remaining_quantity,planned_crew_count,planned_hours_per_day,working_days_per_week,notes').eq('project_id',Number(projectId)).eq('delivery_package_id',selected).eq('review_status','pending').limit(250)
  ])
  setIsReviewer(!r.error && !!r.data?.length)
  setObservations((o.data||[]) as ReviewRow[])
  setInputs((i.data||[]) as ReviewRow[])
  if(o.error||i.error) setMessage(o.error?.message||i.error?.message||'Evidence query failed')
 }
 useEffect(()=>{if(projectId&&selected) void reload()},[projectId,selected])
 async function review(kind:'observation'|'input',id:string,approve:boolean){
  setBusy(true);setMessage('')
  const {error}=kind==='observation'
   ? await supabase.rpc('review_package_production_observation',{p_observation_id:id,p_approve:approve,p_notes:reviewNotes[id]||''})
   : await supabase.rpc('review_package_remaining_work_input',{p_input_id:id,p_approve:approve,p_notes:reviewNotes[id]||''})
  if(error)setMessage(error.message);else{setMessage(approve?'Verified':'Rejected');await reload()}
  setBusy(false)
 }
 async function submit(){
  const q=Number(quantity),c=Number(crew),h=Number(hours),d=Number(days)
  if(!activity||!(q>0)||!Number.isInteger(c)||c<1||!(h>0&&h<=24)||!Number.isInteger(d)||d<1||d>7||!unit.trim()) {setMessage('Enter valid remaining quantity, unit, crew, hours and working days.');return}
  setBusy(true);setMessage('')
  const {error}=await supabase.from('package_remaining_work_inputs').insert({project_id:Number(projectId),delivery_package_id:selected,activity_id:activity,remaining_quantity:q,quantity_unit:unit.trim(),planned_crew_count:c,planned_hours_per_day:h,working_days_per_week:d,notes:notes.trim()})
  if(error)setMessage(error.message);else{setMessage('Submitted for independent verification');setQuantity('');await reload()}
  setBusy(false)
 }
 if(!isReviewer)return null
 function renderPending(rows:ReviewRow[],kind:'observation'|'input'){
  return rows.map(r=><div key={r.id} className="mt-2 rounded border p-3 text-xs">
   <p>Activity {r.activity_id}: {kind==='observation'?`${r.quantity_completed} ${r.quantity_unit} completed on ${r.observed_on}; ${r.crew_count} crew × ${r.working_hours} hours`:`${r.remaining_quantity} ${r.quantity_unit} remaining; ${r.planned_crew_count} crew × ${r.planned_hours_per_day} hours/day, ${r.working_days_per_week} days/week`}</p>
   <p>{r.notes||'No supporting notes provided'}</p>
   <input className="mt-2 w-full rounded border p-2" placeholder="Review notes (required to reject)" value={reviewNotes[r.id]||''} onChange={e=>setReviewNotes(p=>({...p,[r.id]:e.target.value}))}/>
   <div className="mt-2 flex gap-2"><button className="rounded border px-3 py-1" type="button" disabled={busy} onClick={()=>review(kind,r.id,true)}>Verify</button><button className="rounded border px-3 py-1" type="button" disabled={busy||!reviewNotes[r.id]?.trim()} onClick={()=>review(kind,r.id,false)}>Reject</button></div>
  </div>)
 }
 return <details className="rounded-xl border border-[#dfe3e7] bg-white p-4">
  <summary className="cursor-pointer text-sm font-semibold text-[#123a60]">PMO production evidence verification</summary>
  <p className="mt-2 text-xs">Only assigned project reviewers can use this panel. Self-approval is prohibited. Verification does not publish a forecast.</p>
  <label className="mt-3 block text-xs">Package<select className="mt-1 w-full rounded border p-2" value={selected} onChange={e=>{setPackageId(e.target.value);setActivityId('')}}>{packages.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  <h4 className="mt-4 text-sm font-semibold">Pending production observations ({observations.length})</h4>
  {renderPending(observations,'observation')}
  <h4 className="mt-4 text-sm font-semibold">Submit remaining-work assumption</h4>
  <div className="mt-2 grid gap-2 sm:grid-cols-3">
   <label className="text-xs">Activity<select className="mt-1 w-full rounded border p-2" value={activity} onChange={e=>setActivityId(e.target.value)}>{activities.map(t=><option key={String(t.id)} value={String(t.id)}>{String(t.name||t.id)}</option>)}</select></label>
   {([['Remaining quantity',quantity,setQuantity],['Unit',unit,setUnit],['Planned crew',crew,setCrew],['Hours/day',hours,setHours],['Working days/week',days,setDays],['Basis / site notes',notes,setNotes]] as const).map(([label,value,change])=><label key={label} className="text-xs">{label}<input className="mt-1 w-full rounded border p-2" value={value} onChange={e=>change(e.target.value)}/></label>)}
  </div>
  <button type="button" disabled={busy||!activities.length} onClick={submit} className="mt-3 rounded bg-[#123a60] px-4 py-2 text-xs text-white">Submit for verification</button>
  <h4 className="mt-4 text-sm font-semibold">Pending remaining-work assumptions ({inputs.length})</h4>
  {renderPending(inputs,'input')}
  {message&&<p role="status" className="mt-3 text-xs">{message}</p>}
 </details>
}
