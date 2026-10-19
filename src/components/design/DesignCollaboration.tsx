import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

export type EvidenceContext = 'review' | 'issue' | 'weekly'
type Evidence = { id: string; file_name: string; storage_path: string; caption: string | null; location: string | null; created_at: string; uploaded_by: string | null }
type Comment = { id: string; body: string; created_at: string; author_id: string; evidence_id: string | null }
const BUCKET = 'design-collaboration'
const allowed = ['application/pdf','image/jpeg','image/png','image/webp']

export default function DesignCollaboration({ projectId, context, contextId, canEdit, heading, onChanged }: { projectId: number | string | null | undefined; context: EvidenceContext; contextId: string; canEdit: boolean; heading?: string; onChanged?: () => void }) {
  const { user } = useAuthStore()
  const [files, setFiles] = useState<Evidence[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<File[]>([])
  const [reviewStatus, setReviewStatus] = useState('Under Review')
  const [reviewer, setReviewer] = useState('')
  const [review, setReview] = useState<any>(null)
  const [revision, setRevision] = useState('')
  async function refresh() {
    if (!projectId) return
    const [{data:f,error:e1},{data:c,error:e2}] = await Promise.all([
      supabase.from('design_collaboration_files').select('*').eq('project_id',Number(projectId)).eq('context_type',context).eq('context_id',contextId).order('created_at',{ascending:false}),
      supabase.from('design_collaboration_comments').select('*').eq('project_id',Number(projectId)).eq('context_type',context).eq('context_id',contextId).order('created_at',{ascending:true})
    ])
    if(e1 || e2) setNotice(e1?.message || e2?.message || 'Unable to load evidence')
    setFiles(f || []);setComments(c || [])
    if(context==='review') {
      const {data,error}=await supabase.from('design_collaboration_reviews').select('*').eq('project_id',Number(projectId)).eq('context_id',contextId).maybeSingle()
      if(error) setNotice(error.message)
      setReview(data); if(data){setReviewStatus(data.status);setReviewer(data.reviewer || '');setRevision(data.revision || '')}
    }
  }
  useEffect(()=>{void refresh()},[projectId,context,contextId])
  async function upload() {
    if(!projectId || !user?.id || !canEdit || !draft.length) return
    if(draft.some(f=>!allowed.includes(f.type)||f.size>15*1024*1024)){setNotice('PDF, JPG, PNG or WebP only, maximum 15 MB per file.');return}
    setBusy(true);setNotice('')
    try {
      for(const file of draft){
        const path=`${projectId}/${context}/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
        const {error:up}=await supabase.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type})
        if(up) throw up
        const {error:insert}=await supabase.from('design_collaboration_files').insert({project_id:Number(projectId),context_type:context,context_id:contextId,storage_path:path,file_name:file.name,mime_type:file.type,caption:caption.trim()||null,location:location.trim()||null,uploaded_by:user.id})
        if(insert){await supabase.storage.from(BUCKET).remove([path]);throw insert}
      }
      setDraft([]);setCaption('');setLocation('');await refresh();onChanged?.()
    }catch(e:any){setNotice(e.message || 'Upload failed')}finally{setBusy(false)}
  }
  async function open(file:Evidence){
    const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(file.storage_path,120)
    if(error || !data?.signedUrl){setNotice(error?.message || 'File unavailable');return}
    window.open(data.signedUrl,'_blank','noopener,noreferrer')
  }
  async function post(){
    if(!projectId || !user?.id || !canEdit || !message.trim()) return
    setBusy(true)
    const {error}=await supabase.from('design_collaboration_comments').insert({project_id:Number(projectId),context_type:context,context_id:contextId,body:message.trim(),author_id:user.id})
    if(error)setNotice(error.message);else{setMessage('');await refresh()}
    setBusy(false)
  }
  async function saveReview(){
    if(!projectId || !canEdit || !user?.id)return
    setBusy(true)
    const {error}=await supabase.from('design_collaboration_reviews').upsert({project_id:Number(projectId),context_id:contextId,status:reviewStatus,reviewer:reviewer.trim()||null,revision:revision.trim()||null,updated_by:user.id},{onConflict:'project_id,context_id'})
    if(error)setNotice(error.message);else await refresh()
    setBusy(false)
  }
  return <section className="card p-5 space-y-4">
    <div><h3 className="font-bold text-[#102943]">{heading || (context==='review'?'Collaborative drawing review':context==='issue'?'Issue evidence & discussion':'Progress photos & supporting evidence')}</h3><p className="text-xs text-slate-500 mt-1">Project-scoped evidence. Files remain private; drawing uploads are for review and are not automatically approved construction documents.</p></div>
    {notice && <p role="alert" className="text-sm text-red-700">{notice}</p>}
    {context==='review' && <div className="grid gap-2 sm:grid-cols-3"><label className="text-sm">Revision<input className="form-control mt-1" value={revision} disabled={!canEdit} onChange={e=>setRevision(e.target.value)} placeholder="e.g. R02"/></label><label className="text-sm">Reviewer / discipline<input className="form-control mt-1" value={reviewer} disabled={!canEdit} onChange={e=>setReviewer(e.target.value)} placeholder="e.g. Structural"/></label><label className="text-sm">Review status<select className="form-control mt-1" value={reviewStatus} disabled={!canEdit} onChange={e=>setReviewStatus(e.target.value)}>{['Draft','Under Review','Changes Required','Reviewed','Approved','Superseded'].map(s=><option key={s}>{s}</option>)}</select></label>{canEdit && <button className="btn btn-ghost sm:col-span-3" disabled={busy} onClick={saveReview}>Save review status (not construction approval)</button>}</div>}
    {canEdit && <div className="space-y-2 rounded-xl border border-slate-200 p-3"><input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e=>setDraft(Array.from(e.target.files||[]))} className="block w-full text-sm"/><div className="grid gap-2 sm:grid-cols-2"><input className="form-control" placeholder="Caption / drawing reference" value={caption} onChange={e=>setCaption(e.target.value)}/><input className="form-control" placeholder="Location / block (optional)" value={location} onChange={e=>setLocation(e.target.value)}/></div><button className="btn btn-gold" disabled={busy || !draft.length} onClick={upload}>{busy?'Saving…':`Upload ${draft.length || ''} file(s)`}</button></div>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{files.map(f=><div key={f.id} className="rounded-xl border border-slate-200 p-3"><div className="text-sm font-semibold break-all">{f.file_name}</div><div className="text-xs text-slate-500">{f.caption || 'No caption'}{f.location?` · ${f.location}`:''}</div><button className="mt-2 text-sm font-semibold text-teal-700 underline" onClick={()=>void open(f)}>Open secure preview</button></div>)}</div>
    {!files.length && <p className="text-sm text-slate-500">No evidence uploaded yet.</p>}
    <div className="border-t border-slate-200 pt-3"><h4 className="font-semibold text-sm">Discussion</h4><div className="space-y-2 my-3">{comments.map(c=><div key={c.id} className="rounded-lg bg-slate-50 p-2 text-sm"><p className="whitespace-pre-wrap">{c.body}</p><span className="text-xs text-slate-500">{new Date(c.created_at).toLocaleString()}</span></div>)}</div>{canEdit && <div className="flex gap-2"><input className="form-control" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Add a review comment or update"/><button className="btn btn-ghost" disabled={busy||!message.trim()} onClick={post}>Post</button></div>}</div>
  </section>
}
