import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspace } from '@/workspace/WorkspaceProvider'

function roleDiscipline(role?: string | null, discipline?: string | null) {
  if (discipline) return discipline
  const clean = String(role || '').toLowerCase()
  if (clean.includes('housebuild')) return 'housebuild'
  if (clean.includes('infrastructure')) return 'infrastructure'
  if (clean.includes('mep')) return 'mep'
  if (clean.includes('design')) return 'design'
  if (clean.includes('cost')) return 'costing'
  if (clean.includes('hse')) return 'hse'
  if (clean.includes('project_owner') || clean.includes('overall')) return 'overall'
  return null
}

export default function ProjectDelegationsPanel() {
  const { activeWorkspace } = useWorkspace()
  const [members, setMembers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [delegations, setDelegations] = useState<any[]>([])
  const [fromUserId, setFromUserId] = useState('')
  const [toUserId, setToUserId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { void load() }, [activeWorkspace?.id])

  async function load() {
    if (!activeWorkspace?.id) return
    const [memberResult, projectResult, delegationResult] = await Promise.all([
      supabase.from('workspace_member_access_summary').select('*').eq('workspace_id', activeWorkspace.id).order('full_name'),
      supabase.from('projects').select('id,project_name').order('project_name'),
      supabase.from('project_access_delegations').select('*').eq('workspace_id', activeWorkspace.id).order('created_at', { ascending: false }),
    ])
    setMembers(memberResult.data || [])
    setProjects(projectResult.data || [])
    setDelegations(delegationResult.data || [])
  }

  const memberMap = useMemo(() => new Map(members.map((m:any) => [String(m.user_id), m])), [members])
  const projectMap = useMemo(() => new Map(projects.map((p:any) => [String(p.id), p.project_name])), [projects])

  function onFromUser(value: string) {
    setFromUserId(value)
    const member = memberMap.get(value)
    setDiscipline(roleDiscipline(member?.role, member?.discipline) || '')
  }

  async function createDelegation() {
    setNotice('')
    if (!activeWorkspace?.id || !fromUserId || !toUserId || !projectId || !startsAt || !endsAt) {
      setNotice('From, to, project, start and end are required.')
      return
    }
    if (fromUserId === toUserId) {
      setNotice('The delegate must be another person.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('project_access_delegations').insert({
      workspace_id: activeWorkspace.id,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      project_id: Number(projectId),
      discipline: discipline || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      reason: reason.trim() || null,
      status: 'active',
    })
    setSaving(false)
    if (error) { setNotice(error.message); return }
    setNotice('Temporary project edit access created.')
    setFromUserId(''); setToUserId(''); setProjectId(''); setDiscipline(''); setStartsAt(''); setEndsAt(''); setReason('')
    await load()
  }

  async function revoke(id: string) {
    const { error } = await supabase.from('project_access_delegations').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', id)
    if (error) { setNotice(error.message); return }
    setNotice('Delegation revoked.')
    await load()
  }

  return <section className="space-y-5">
    <div className="rounded-[28px] border border-[#dce6ed] bg-white px-6 py-7 shadow-[0_18px_50px_rgba(16,41,67,0.07)]">
      <div className="flex items-start justify-between gap-4">
        <div><div className="ui-eyebrow">Temporary authority</div><h1 className="mt-2 text-2xl font-black text-[#102943]">Project Delegations</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#66788a]">Temporarily hand a person’s project editing rights to another team member. Workspace visibility does not change, and access expires automatically.</p></div>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={15}/>Refresh</button>
      </div>
    </div>

    {notice && <div className="rounded-xl border border-[#dce6ed] bg-white px-4 py-3 text-sm text-[#536974]">{notice}</div>}

    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 font-extrabold text-[#102943]"><CalendarClock size={18}/>Create temporary handover</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <select className="form-control" value={fromUserId} onChange={e=>onFromUser(e.target.value)}><option value="">Current owner</option>{members.map((m:any)=><option key={m.user_id} value={m.user_id}>{m.full_name || m.email} · {m.role}</option>)}</select>
        <select className="form-control" value={toUserId} onChange={e=>setToUserId(e.target.value)}><option value="">Delegate to</option>{members.filter((m:any)=>String(m.user_id)!==fromUserId).map((m:any)=><option key={m.user_id} value={m.user_id}>{m.full_name || m.email} · {m.role}</option>)}</select>
        <select className="form-control" value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Project</option>{projects.map((p:any)=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select>
        <input className="form-control" placeholder="Discipline" value={discipline} onChange={e=>setDiscipline(e.target.value)} />
        <input className="form-control" type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} />
        <input className="form-control" type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} />
        <input className="form-control md:col-span-2 xl:col-span-3" placeholder="Reason, e.g. annual leave" value={reason} onChange={e=>setReason(e.target.value)} />
      </div>
      <button className="btn btn-primary mt-4" disabled={saving} onClick={createDelegation}><Plus size={15}/>{saving ? 'Creating…' : 'Create delegation'}</button>
    </div>

    <div className="card overflow-hidden">
      <div className="border-b border-[#e5ebef] px-5 py-4 font-extrabold text-[#102943]">Delegation history</div>
      <div className="divide-y divide-[#edf2f5]">
        {delegations.length === 0 ? <div className="p-6 text-sm text-[#71838d]">No temporary handovers yet.</div> : delegations.map((d:any)=>{
          const from=memberMap.get(String(d.from_user_id)); const to=memberMap.get(String(d.to_user_id))
          const active=d.status==='active' && new Date(d.ends_at).getTime() >= Date.now()
          return <div key={d.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div><div className="font-bold text-[#102943]">{from?.full_name || from?.email || 'Owner'} → {to?.full_name || to?.email || 'Delegate'}</div><div className="mt-1 text-sm text-[#66788a]">{projectMap.get(String(d.project_id)) || `Project ${d.project_id}`} · {d.discipline || 'Project'} · {new Date(d.starts_at).toLocaleString()} to {new Date(d.ends_at).toLocaleString()}</div>{d.reason && <div className="mt-1 text-xs text-[#8292a1]">{d.reason}</div>}</div>
            <div className="flex items-center gap-2"><span className={`badge ${active ? 'badge-green' : 'badge-muted'}`}>{active ? 'Active' : d.status}</span>{d.status==='active' && <button className="btn btn-ghost btn-sm" onClick={()=>revoke(d.id)}><Trash2 size={14}/>Revoke</button>}</div>
          </div>
        })}
      </div>
    </div>
  </section>
}
