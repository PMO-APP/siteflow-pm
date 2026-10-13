import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Forecast = { id:string; project_id:number; currency:string; actual_cost:number; estimate_to_complete:number; forecast_final_cost:number; basis:string; status:string; submitted_by:string; submitted_at:string; reviewed_at:string|null; review_note:string|null }
const currencyFormat = (n:number,c:string) => new Intl.NumberFormat('en-NG',{style:'currency',currency:c,maximumFractionDigits:0}).format(n)
const financeRoles = new Set(['costing','admin','workspace_admin'])
const reviewerRoles = new Set(['pmo','admin','workspace_admin'])
export default function ProjectCostForecast({projectId,approvedBudget,budgetCurrency,role}:{projectId:number;approvedBudget:number|null;budgetCurrency:string;role:string}) {
 const [items,setItems]=useState<Forecast[]>([])
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(true)
 const [busy,setBusy]=useState(false)
 const [actual,setActual]=useState('')
 const [remaining,setRemaining]=useState('')
 const [basis,setBasis]=useState('')
 const [reviewNote,setReviewNote]=useState('')
 const [userId,setUserId]=useState<string|null>(null)
 const reload=useCallback(async()=>{
  if(!Number.isFinite(projectId)){setLoading(false);return}
  setLoading(true)
  const {data,error:err}=await supabase.from('project_cost_forecasts').select('*').eq('project_id',projectId).order('submitted_at',{ascending:false}).limit(40)
  setItems((data||[]) as Forecast[]);setError(err?.message||'');setLoading(false)
 },[projectId])
 useEffect(()=>{setItems([]);setError('');void reload();void supabase.auth.getUser().then(({data})=>setUserId(data.user?.id||null))},[reload])
 const approvedHistory=useMemo(()=>items.filter(i=>i.status==='approved'&&i.reviewed_at).sort((a,b)=>new Date(b.reviewed_at!).getTime()-new Date(a.reviewed_at!).getTime()),[items])
 const approved=approvedHistory[0]
 const previous=approvedHistory[1]
 const movement=approved&&previous&&approved.currency===previous.currency?Number(approved.forecast_final_cost)-Number(previous.forecast_final_cost):null
 const stale=approved?.reviewed_at?Math.floor((Date.now()-new Date(approved.reviewed_at).getTime())/86400000)>30:false
 const pending=items.filter(i=>i.status==='submitted')
 const variance=approved&&approvedBudget!==null&&approved.currency===budgetCurrency?Number(approved.forecast_final_cost)-approvedBudget:null
 const submit=async()=>{
  const a=Number(actual),r=Number(remaining)
  if(!actual.trim()||!remaining.trim()||!Number.isFinite(a)||!Number.isFinite(r)||a<0||r<0||basis.trim().length<15){setError('Enter valid nonnegative costs and a basis of at least 15 characters.');return}
  setBusy(true);setError('')
  const {error:err}=await supabase.from('project_cost_forecasts').insert({project_id:projectId,currency:budgetCurrency,actual_cost:a,estimate_to_complete:r,basis:basis.trim()})
  if(err)setError(err.message);else {setActual('');setRemaining('');setBasis('');await reload()}
  setBusy(false)
 }
 const review=async(id:string,approve:boolean)=>{
  if(!approve&&reviewNote.trim().length<5){setError('Provide a rejection reason (at least five characters).');return}
  setBusy(true);setError('')
  const {error:err}=await supabase.rpc('review_project_cost_forecast',{p_forecast:id,p_approve:approve,p_note:reviewNote.trim()||null})
  if(err)setError(err.message);else {setReviewNote('');await reload()}
  setBusy(false)
 }
 return <div className="mt-4 border-t border-[var(--pmx-border)] pt-4">
  <h3 className="font-semibold">Verified forecast final cost</h3>
  {loading?<p className="mt-2 text-xs">Loading forecasts…</p>:<>
   {error&&<p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
   {approved?<div className="mt-2 space-y-1 text-sm">
    <p>Latest approved EAC: <strong>{currencyFormat(Number(approved.forecast_final_cost),approved.currency)}</strong></p>
    <p>Actual cost to date: {currencyFormat(Number(approved.actual_cost),approved.currency)} · Estimate to complete: {currencyFormat(Number(approved.estimate_to_complete),approved.currency)}</p>
    <p>Forecast budget variance: <strong>{variance===null?'Unavailable (budget missing or currency mismatch)':`${variance>0?'+':''}${currencyFormat(variance,approved.currency)}`}</strong></p>
    <p className="text-xs text-[var(--pmx-muted)]">Approved {approved.reviewed_at?new Date(approved.reviewed_at).toLocaleDateString('en-GB'):'date unavailable'}. Basis: {approved.basis}</p>
    {movement!==null&&<p className={movement>0?'text-xs font-semibold text-red-700':'text-xs font-semibold'}>Change since previous approved forecast: {movement>0?'+':''}{currencyFormat(movement,approved.currency)} {movement>0?'(increased exposure)':movement<0?'(reduced forecast)':'(unchanged)'}</p>}
    {stale&&<p role="status" className="text-xs text-amber-700">Forecast last approved more than 30 days ago. Request an updated Costing forecast.</p>}
    {approvedHistory.length>1&&<details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold">Approved forecast history ({approvedHistory.length})</summary><div className="mt-2 max-h-48 overflow-y-auto"><table className="w-full text-left"><thead><tr><th className="py-1">Approved</th><th>Forecast final cost</th><th>Change</th></tr></thead><tbody>{approvedHistory.map((f,index)=>{const older=approvedHistory[index+1];const diff=older&&older.currency===f.currency?Number(f.forecast_final_cost)-Number(older.forecast_final_cost):null;return <tr key={f.id} className="border-t border-[var(--pmx-border)]"><td className="py-1">{new Date(f.reviewed_at!).toLocaleDateString('en-GB')}</td><td>{currencyFormat(Number(f.forecast_final_cost),f.currency)}</td><td>{diff===null?'—':`${diff>0?'+':''}${currencyFormat(diff,f.currency)}`}</td></tr>})}</tbody></table></div><p className="mt-1 text-[var(--pmx-muted)]">Showing up to 40 most recently submitted forecasts; older history may not be included.</p></details>}
   </div>:<p className="mt-2 text-xs text-[var(--pmx-muted)]">No independently approved estimate at completion yet. No forecast or budget variance is assumed.</p>}
   {pending.length>0&&<div className="mt-3 space-y-2"><p className="text-xs font-semibold">Awaiting review ({pending.length})</p>{pending.map(f=><div key={f.id} className="rounded-lg border border-[var(--pmx-border)] p-3 text-xs">
    <p><strong>{currencyFormat(Number(f.forecast_final_cost),f.currency)}</strong> · submitted {new Date(f.submitted_at).toLocaleDateString('en-GB')}</p><p className="mt-1">{f.basis}</p>
    {reviewerRoles.has(role)&&userId!==f.submitted_by&&<div className="mt-2 flex flex-wrap gap-2"><input aria-label="Review reason" placeholder="Review note / rejection reason" className="min-w-40 flex-1 rounded border p-2" value={reviewNote} onChange={e=>setReviewNote(e.target.value)}/><button disabled={busy} className="pmx-btn-secondary" onClick={()=>void review(f.id,true)}>Approve</button><button disabled={busy} className="pmx-btn-secondary" onClick={()=>void review(f.id,false)}>Reject</button></div>}
   </div>)}</div>}
   {financeRoles.has(role)&&<div className="mt-4 space-y-2"><p className="text-xs font-semibold">Submit a new cost forecast for independent review</p>
    <div className="grid gap-2 sm:grid-cols-2"><label className="text-xs">Actual cost incurred ({budgetCurrency})<input type="number" min="0" step="0.01" value={actual} onChange={e=>setActual(e.target.value)} className="mt-1 w-full rounded border p-2"/></label><label className="text-xs">Estimated cost to complete ({budgetCurrency})<input type="number" min="0" step="0.01" value={remaining} onChange={e=>setRemaining(e.target.value)} className="mt-1 w-full rounded border p-2"/></label></div>
    <textarea aria-label="Forecast basis" placeholder="Forecast assumptions, outstanding works, commitments, claims and exclusions" value={basis} onChange={e=>setBasis(e.target.value)} className="w-full rounded border p-2 text-xs" rows={2}/>
    <button disabled={busy} onClick={()=>void submit()} className="pmx-btn-secondary">Submit forecast</button>
   </div>}
   <p className="mt-3 text-xs text-[var(--pmx-muted)]">EAC = actual cost incurred + estimated cost to complete. Approved forecasts are immutable; new submissions preserve history. Costing must reconcile committed costs, claims, contingencies and outstanding work before submission. Only an independently approved forecast is shown as verified.</p>
  </>}
 </div>
}
