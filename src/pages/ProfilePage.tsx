import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Check,
  Eye,
  EyeOff,
  FolderKanban,
  Lock,
  LogOut,
  Mail,
  Moon,
  Shield,
  Sun,
  User,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useThemeStore } from '@/store/theme'
import { getInitials } from '@/lib/utils'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'
import { useAccessSession } from '@/access/AccessSessionProvider'
import { useWorkspace } from '@/workspace/WorkspaceProvider'

function formatRoleLabel(role?: string | null) {
  if (!role) return 'Team Member'
  const labels: Record<string, string> = {
    workspace_admin: 'Workspace Admin',
    admin: 'Administrator',
    pmo: 'PMO',
    portfolio_manager: 'Portfolio Manager',
    project_owner: 'Project Owner',
    design: 'Design Team',
    costing: 'Costing Team',
    housebuild: 'Housebuild',
    mep: 'MEP',
    infrastructure: 'Infrastructure',
    viewer: 'Viewer',
    guest: 'Guest',
  }
  return labels[role] || role.replace(/_/g, ' ')
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const role = useMembershipStore(state => state.role)
  const { session, refresh } = useAccessSession()
  const { activeWorkspace } = useWorkspace()
  const accessScope = useMembershipStore(state => state.accessScope)
  const portfolioId = useMembershipStore(state => state.portfolioId)
  const projectId = useMembershipStore(state => state.projectId)
  const projectIds = useMembershipStore(state => state.projectIds)

  const [portfolioName, setPortfolioName] = useState('—')
  const [projectNames, setProjectNames] = useState<string[]>([])
  const [editableProjects, setEditableProjects] = useState<any[]>([])
  const [delegates, setDelegates] = useState<any[]>([])
  const [delegations, setDelegations] = useState<any[]>([])
  const [handoverProjectId, setHandoverProjectId] = useState('')
  const [handoverToUserId, setHandoverToUserId] = useState('')
  const [handoverStart, setHandoverStart] = useState('')
  const [handoverEnd, setHandoverEnd] = useState('')
  const [handoverReason, setHandoverReason] = useState('')
  const [handoverNotice, setHandoverNotice] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    let active = true
    async function loadAccessContext() {
      if (portfolioId) {
        const { data } = await supabase.from('portfolios').select('name').eq('id', portfolioId).maybeSingle()
        if (active) setPortfolioName(data?.name || '—')
      } else if (active) setPortfolioName('All portfolios')

      const ids = Array.from(new Set([...(projectIds || []), ...(projectId ? [projectId] : [])]))
      if (!ids.length) {
        if (active) setProjectNames([])
        return
      }
      const { data } = await supabase.from('projects').select('project_name').in('id', ids)
      if (active) setProjectNames((data || []).map(project => project.project_name))
    }
    loadAccessContext()
    return () => { active = false }
  }, [portfolioId, projectId, projectIds])

  useEffect(() => {
    let active = true
    async function loadOwnershipContext() {
      if (!activeWorkspace?.id || !user?.id) return
      const ownedIds = Array.from(new Set(session.assignments
        .filter(item => item.scopeType === 'project' && item.source !== 'delegation' && ['edit','manage'].includes(item.accessLevel))
        .map(item => Number(item.scopeId))
        .filter(Number.isFinite)))
      const [projectResult, memberResult, delegationResult] = await Promise.all([
        ownedIds.length ? supabase.from('projects').select('id,project_name').in('id', ownedIds).order('project_name') : Promise.resolve({ data: [], error: null }),
        supabase.from('workspace_member_access_summary').select('*').eq('workspace_id', activeWorkspace.id).order('full_name'),
        supabase.from('project_access_delegations').select('*').eq('workspace_id', activeWorkspace.id).or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`).order('created_at', { ascending: false }),
      ])
      if (!active) return
      setEditableProjects(projectResult.data || [])
      const myDiscipline = String(session.discipline || role || '').toLowerCase()
      setDelegates((memberResult.data || []).filter((m:any) => String(m.user_id) !== user.id && String(m.discipline || m.role || '').toLowerCase() === myDiscipline))
      setDelegations(delegationResult.data || [])
    }
    void loadOwnershipContext()
    return () => { active = false }
  }, [activeWorkspace?.id, user?.id, session.assignments, session.discipline, role])

  async function createHandover() {
    setHandoverNotice('')
    if (!activeWorkspace?.id || !user?.id || !handoverProjectId || !handoverToUserId || !handoverStart || !handoverEnd) {
      setHandoverNotice('Select a project, colleague, start and end time.')
      return
    }
    const assignment = session.assignments.find(item => item.scopeType === 'project' && String(item.scopeId) === handoverProjectId && item.source !== 'delegation' && ['edit','manage'].includes(item.accessLevel))
    if (!assignment) { setHandoverNotice('You are not the assigned owner of this project.'); return }
    const { error } = await supabase.from('project_access_delegations').insert({
      workspace_id: activeWorkspace.id,
      project_id: Number(handoverProjectId),
      from_user_id: user.id,
      to_user_id: handoverToUserId,
      discipline: assignment.discipline || session.discipline || null,
      starts_at: new Date(handoverStart).toISOString(),
      ends_at: new Date(handoverEnd).toISOString(),
      reason: handoverReason.trim() || null,
      status: 'active',
    })
    if (error) { setHandoverNotice(error.message); return }
    setHandoverNotice('Temporary handover created. It will expire automatically at the end time.')
    setHandoverProjectId(''); setHandoverToUserId(''); setHandoverStart(''); setHandoverEnd(''); setHandoverReason('')
    await refresh()
  }

  async function updatePassword() {
    setPasswordNotice('')
    setPasswordError('')
    if (!newPassword || newPassword.length < 8) return setPasswordError('Password must be at least 8 characters.')
    if (!/[A-Z]/.test(newPassword)) return setPasswordError('Password must include at least one uppercase letter.')
    if (!/[0-9]/.test(newPassword)) return setPasswordError('Password must include at least one number.')
    if (newPassword !== confirmPassword) return setPasswordError('Passwords do not match.')

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError(error.message)
      setPasswordLoading(false)
      return
    }
    setPasswordNotice('Password updated successfully.')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordLoading(false)
  }

  const displayName = user?.full_name || user?.email || 'User'
  const displayEmail = user?.email || 'No email available'
  const displayRole = formatRoleLabel(role || user?.role)
  const hasMinLength = newPassword.length >= 8
  const hasUppercase = /[A-Z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)

  return (
    <div className="min-h-dvh bg-[#f7f9fa] text-[#173f5f]">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-7 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => navigate('/projects')} className="w-fit text-left" aria-label="Go to workspace hub">
            <PMOCorexLogo size={42} />
          </button>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate(-1)} className="ui-button ui-button--secondary"><ArrowLeft size={15} /> Back</button>
            <button onClick={() => navigate('/projects')} className="ui-button ui-button--primary">Workspace Hub</button>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[28px] border border-[#dce7ef] bg-white shadow-[0_16px_50px_rgba(23,63,95,.08)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#ef8354]" />
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-[#173f5f] text-2xl font-black text-white shadow-[0_12px_30px_rgba(23,63,95,.18)]">
                {getInitials(displayName)}
              </div>
              <div>
                <div className="ui-eyebrow">Account profile</div>
                <h1 className="mt-2 text-3xl font-black tracking-[-.03em] text-[#173f5f] sm:text-4xl">{displayName}</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-[#607783]"><Mail size={15} /> {displayEmail}</p>
              </div>
            </div>
            <div className="min-w-[240px] rounded-2xl border border-[#dce7ef] bg-[#f7f9fa] p-4">
              <div className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#7a8c99]">Current permission</div>
              <div className="mt-2 flex items-center gap-2 text-lg font-extrabold text-[#173f5f]"><Shield size={18} className="text-[#ef8354]" /> {displayRole}</div>
              <div className="mt-2 text-xs text-[#607783]">
                Visibility: <span className="font-bold text-[#173f5f]">Workspace-wide</span><br/>
                Edit authority:{' '}
                <span className="font-bold text-[#173f5f]">
                  {editableProjects.length
                    ? editableProjects.map((project:any) => project.project_name).join(', ')
                    : 'None assigned'}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <section className="card p-6 sm:p-7">
              <SectionHeading icon={User} eyebrow="Identity" title="Account details" copy="Your login identity and current PMOCorex access context." />
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <InfoCard icon={User} label="Full name" value={displayName} />
                <InfoCard icon={Mail} label="Login email" value={displayEmail} />
                <InfoCard icon={Shield} label="Role" value={displayRole} />
                <InfoCard icon={Building2} label="Portfolio access" value={portfolioName} />
              </div>
              <div className="mt-3 rounded-2xl border border-[#dce7ef] bg-[#f7f9fa] p-4">
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#7a8c99]"><FolderKanban size={14} className="text-[#ef8354]" /> Editable projects</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {editableProjects.length ? editableProjects.map((project:any) => <span key={project.id} className="ui-badge ui-badge--info">{project.project_name}</span>) : <span className="text-sm text-[#607783]">No permanent project ownership assigned</span>}
                </div>
              </div>
            </section>

            <section className="card p-6 sm:p-7">
              <SectionHeading icon={CalendarClock} eyebrow="Access continuity" title="Temporary project handover" copy="Keep workspace visibility unchanged while temporarily giving a colleague your editing authority during leave or another absence." />
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <select className="form-control" value={handoverProjectId} onChange={e=>setHandoverProjectId(e.target.value)}><option value="">Project you own</option>{editableProjects.map((p:any)=><option key={p.id} value={p.id}>{p.project_name}</option>)}</select>
                <select className="form-control" value={handoverToUserId} onChange={e=>setHandoverToUserId(e.target.value)}><option value="">Colleague in your team</option>{delegates.map((m:any)=><option key={m.user_id} value={m.user_id}>{m.full_name || m.email}</option>)}</select>
                <input className="form-control" type="datetime-local" value={handoverStart} onChange={e=>setHandoverStart(e.target.value)} />
                <input className="form-control" type="datetime-local" value={handoverEnd} onChange={e=>setHandoverEnd(e.target.value)} />
                <input className="form-control md:col-span-2" placeholder="Reason, e.g. annual leave" value={handoverReason} onChange={e=>setHandoverReason(e.target.value)} />
              </div>
              {handoverNotice && <div className="mt-3 rounded-xl border border-[#dce7ef] bg-[#f7f9fa] p-3 text-sm text-[#607783]">{handoverNotice}</div>}
              <button onClick={createHandover} className="ui-button ui-button--primary mt-4" disabled={!editableProjects.length}><CalendarClock size={15}/> Create temporary handover</button>
              <div className="mt-5 space-y-2">
                {delegations.slice(0,5).map((d:any)=><div key={d.id} className="rounded-xl border border-[#e5ebef] p-3 text-xs text-[#607783]">{d.from_user_id === user?.id ? 'Handed over' : 'Received'} · Project {d.project_id} · {d.discipline || 'project'} · until {new Date(d.ends_at).toLocaleString()}</div>)}
              </div>
            </section>

            <section className="card p-6 sm:p-7">
              <SectionHeading icon={Lock} eyebrow="Security" title="Change password" copy="Use a strong password that is unique to this account." />
              {passwordError && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{passwordError}</div>}
              {passwordNotice && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{passwordNotice}</div>}
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <PasswordField label="New password" value={newPassword} onChange={setNewPassword} visible={showNewPassword} onToggle={() => setShowNewPassword(v => !v)} />
                <PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword(v => !v)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <Requirement passed={hasMinLength} text="8+ characters" />
                <Requirement passed={hasUppercase} text="1 uppercase letter" />
                <Requirement passed={hasNumber} text="1 number" />
              </div>
              <button onClick={updatePassword} disabled={passwordLoading} className="ui-button ui-button--primary mt-5">
                <Lock size={15} /> {passwordLoading ? 'Updating…' : 'Update password'}
              </button>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="card p-6">
              <SectionHeading icon={Sun} eyebrow="Display" title="Appearance" copy="Choose how PMOCorex appears on this device." />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <ThemeButton active={theme === 'light'} icon={Sun} label="Light" onClick={() => setTheme('light')} />
                <ThemeButton active={theme === 'dark'} icon={Moon} label="Dark" onClick={() => setTheme('dark')} />
              </div>
            </section>

            <section className="card p-6">
              <SectionHeading icon={FolderKanban} eyebrow="Navigation" title="Quick actions" copy="Return to the areas you use most." />
              <div className="mt-5 space-y-2">
                <button onClick={() => navigate('/projects')} className="ui-button ui-button--secondary w-full"><ArrowLeft size={15} /> Workspace Hub</button>
                {['workspace_admin', 'admin', 'pmo'].includes(role || '') && <button onClick={() => navigate('/admin')} className="ui-button ui-button--secondary w-full"><Shield size={15} /> Admin Console</button>}
              </div>
            </section>

            <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-[0_12px_36px_rgba(23,63,95,.06)]">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-600"><LogOut size={18} /></div>
                <div><h2 className="font-extrabold text-[#173f5f]">Account session</h2><p className="mt-1 text-xs leading-5 text-[#607783]">Sign out securely from this device.</p></div>
              </div>
              <button onClick={signOut} className="ui-button ui-button--danger mt-5 w-full"><LogOut size={15} /> Sign out</button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ icon: Icon, eyebrow, title, copy }: { icon: any; eyebrow: string; title: string; copy: string }) {
  return <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fff2ec] text-[#ef8354]"><Icon size={18} /></div><div><div className="ui-eyebrow">{eyebrow}</div><h2 className="mt-1 text-lg font-extrabold text-[#173f5f]">{title}</h2><p className="mt-1 text-xs leading-5 text-[#607783]">{copy}</p></div></div>
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="rounded-2xl border border-[#dce7ef] bg-white p-4"><div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7a8c99]"><Icon size={14} className="text-[#ef8354]" />{label}</div><div className="mt-2 break-words text-sm font-bold text-[#173f5f]">{value}</div></div>
}

function PasswordField({ label, value, onChange, visible, onToggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) {
  return <div><label className="form-label">{label}</label><div className="relative"><input className="form-control pr-11" type={visible ? 'text' : 'password'} placeholder={label} value={value} onChange={event => onChange(event.target.value)} /><button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a8c99] transition hover:text-[#173f5f]" aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
}

function ThemeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: any; label: string; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-[#173f5f] bg-[#edf4f8] shadow-[0_0_0_2px_rgba(23,63,95,.08)]' : 'border-[#dce7ef] bg-white hover:border-[#bfd0da]'}`}><div className="flex items-center justify-between"><Icon size={18} className={active ? 'text-[#173f5f]' : 'text-[#7a8c99]'} />{active && <span className="grid h-5 w-5 place-items-center rounded-full bg-[#173f5f] text-white"><Check size={12} /></span>}</div><div className="mt-4 text-sm font-extrabold text-[#173f5f]">{label}</div></button>
}

function Requirement({ passed, text }: { passed: boolean; text: string }) {
  return <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${passed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#dce7ef] bg-[#f7f9fa] text-[#7a8c99]'}`}><span>{passed ? '✓' : '•'}</span><span>{text}</span></div>
}
