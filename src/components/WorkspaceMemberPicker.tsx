import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Member = { userId: string; email: string; name: string; department: string }
const cache = new Map<string, Member[]>()

export default function WorkspaceMemberPicker({ workspaceId, value, onChange, onSelect, placeholder = 'Search workspace members', className = 'form-control', required = false }: {
  workspaceId?: string | null
  value: string
  onChange: (email: string) => void
  onSelect?: (member: Member) => void
  placeholder?: string
  className?: string
  required?: boolean
}) {
  const [members, setMembers] = useState<Member[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!workspaceId) { setMembers([]); return }
    const cached = cache.get(workspaceId)
    if (cached) { setMembers(cached); return }
    let cancelled = false
    setLoading(true)
    void (async () => {
      const { data, error: loadError } = await supabase.from('workspace_members')
        .select('user_id,email,full_name,status,workspace_departments(name)')
        .eq('workspace_id', workspaceId)
      if (cancelled) return
      setLoading(false)
      if (loadError) { setError('Unable to load workspace directory'); return }
      const list = (data || []).filter((row: any) => row.status !== 'inactive' && row.email).map((row: any) => ({
        userId: String(row.user_id), email: String(row.email).toLowerCase(),
        name: String(row.full_name || row.email),
        department: String((Array.isArray(row.workspace_departments) ? row.workspace_departments[0]?.name : row.workspace_departments?.name) || ''),
      }))
      cache.set(workspaceId, list)
      setMembers(list)
    })()
    return () => { cancelled = true }
  }, [workspaceId])
  const matches = useMemo(() => members.filter(m => `${m.name} ${m.email} ${m.department}`.toLowerCase().includes(value.toLowerCase())).slice(0, 8), [members, value])
  return <div className="relative w-full min-w-0">
    <input className={`${className} w-full min-w-0`} type="text" autoComplete="off" required={required}
      placeholder={placeholder} value={value} onFocus={() => setOpen(true)}
      onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      onChange={e => { onChange(e.target.value); setOpen(true) }} />
    {open && value.trim() && <div role="listbox" className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
      {matches.map(member => <button key={member.userId} type="button" role="option" aria-selected={value.toLowerCase() === member.email}
        className="block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-teal-50"
        onMouseDown={e => e.preventDefault()} onClick={() => { onChange(member.email); onSelect?.(member); setOpen(false) }}>
        <span className="block text-sm font-semibold text-slate-800">{member.name}</span>
        <span className="block text-xs text-slate-500">{member.department ? `${member.department} · ` : ''}{member.email}</span>
      </button>)}
      {!matches.length && <div className="px-3 py-2 text-xs text-slate-500">{loading ? 'Loading members…' : error || 'No matching workspace member'}</div>}
    </div>}
  </div>
}
