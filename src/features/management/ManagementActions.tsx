import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { CheckCircle2, Plus, Send, X } from 'lucide-react'
import {
  createManagementAction, updateManagementActionStatus,
  type ManagementAction, type ManagementActionType,
} from '@/services/managementActionService'
import { updateExecutiveDecision } from '@/services/executiveDashboardService'
import { loadCustomerAdministration } from '@/workspace/customerAdminService'
import type { CustomerAdminMember } from '@/workspace/customerAdminTypes'
import type { Decision, Project } from './model'

export type ActionDraft = { projectId: string; title?: string }

const open = (status?: string) => !['completed', 'cancelled', 'canceled', 'closed'].includes((status || '').toLowerCase())
const displayDue = (value?: string | null) => value
  ? new Date(value).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' })
  : 'No due date'

type ManagementActionsProps = {
  actions: ManagementAction[] | null
  decisions: Decision[] | null
  projects: Project[]
  canManage: boolean
  onCreate: () => void
  onRefresh: () => Promise<unknown>
}

export function ManagementActions({ actions, decisions, projects, canManage, onCreate, onRefresh }: ManagementActionsProps) {
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState('')
  const openActions = actions?.filter(item => open(item.status))
  const openDecisions = decisions?.filter(item => open(item.status))
  const markComplete = async (id: string, kind: 'action' | 'decision') => {
    setPending(id)
    setError('')
    try {
      if (kind === 'action') await updateManagementActionStatus(id, 'completed')
      else await updateExecutiveDecision(id, { status: 'completed' })
      await onRefresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The item could not be marked complete.')
    } finally {
      setPending(null)
    }
  }

  return <section id="actions" className="mi-panel scroll-mt-6" aria-labelledby="actions-heading">
    <div className="mi-section-heading">
      <div><h2 id="actions-heading">Management actions</h2><p>Issue instructions, request updates and track decisions.</p></div>
      {canManage && <button type="button" className="mi-back" onClick={onCreate}><Plus size={16} /> New management action</button>}
    </div>
    {error && <p className="mi-notice mb-3" role="alert">{error}</p>}
    <div className="mi-split">
      <div>
        <h3>Assigned actions</h3>
        {openActions && <p className="mi-footnote mt-1">{openActions.length} open · {openActions.filter(item => item.dueAt && new Date(item.dueAt).getTime() < Date.now()).length} overdue</p>}
        {openActions?.map(item => <article className="mi-action-row" key={item.id}>
          <div>
            <h4>{item.title}</h4>
            <small>{[item.projectName || 'Workspace-wide', item.actionType.replace('_', ' '), item.priority].join(' · ')}</small>
            <p>{item.message}</p>
            <small>{[item.recipientLabels.join(', '), displayDue(item.dueAt)].filter(Boolean).join(' · ')}</small>
          </div>
          {canManage && <button type="button" className="mi-text-button" disabled={pending !== null} aria-label={`Mark ${item.title} complete`} onClick={() => void markComplete(item.id, 'action')}><CheckCircle2 size={18} /></button>}
        </article>)}
        {!openActions?.length && <p className="mi-empty">{openActions ? 'No open actions in this selection.' : 'Management actions are unavailable.'}</p>}
      </div>
      <div>
        <h3>Decisions required</h3>
        {openDecisions?.map(item => <article className="mi-action-row" key={item.id}>
          <div>
            <h4>{item.decision}</h4>
            {item.rationale && <p>{item.rationale}</p>}
            <small>{[projects.find(p => p.id === Number(item.project_id))?.project_name ?? 'Workspace-wide', item.owner_name, displayDue(item.due_date)].filter(Boolean).join(' · ')}</small>
          </div>
          {canManage && <button type="button" className="mi-text-button" disabled={pending !== null} aria-label="Mark decision complete" onClick={() => void markComplete(item.id, 'decision')}><CheckCircle2 size={18} /></button>}
        </article>)}
        {!openDecisions?.length && <p className="mi-empty">{openDecisions ? 'No open decisions in this selection.' : 'Management decisions are unavailable.'}</p>}
      </div>
    </div>
  </section>
}

type ActionAudience = { id: string; label: string; helper: string; userIds: string[] }

function buildActionAudiences(members: CustomerAdminMember[]): ActionAudience[] {
  const active = members.filter(member => member.status === 'active')
  const normalize = (value?: string | null) => (value || '').toLowerCase().replace(/[\s_-]+/g, ' ').trim()
  const teamsByName = [
    ['Design Team', ['design']],
    ['Landscaping Team', ['landscaping', 'landscape']],
    ['Costing Team', ['costing', 'cost', 'quantity surveying', 'qs']],
    ['Housebuild Team', ['housebuild', 'house build']],
    ['Infrastructure Team', ['infrastructure', 'infra']],
    ['MEP Team', ['mep', 'mechanical', 'electrical']],
    ['HSE Team', ['hse', 'health safety environment', 'health and safety']],
  ] as const
  const teams = teamsByName.map(([label, aliases]) => ({
    id: `team:${label}`, label, helper: 'Team audience',
    userIds: [...new Set(active.filter(member => {
      const fields = [member.departmentName, member.role, member.jobTitle].map(normalize)
      return aliases.some(alias => fields.some(field => field.includes(alias)))
    }).map(member => member.userId))],
  }))
  const ipd = teams.filter(team => ['Housebuild Team', 'Infrastructure Team', 'MEP Team', 'HSE Team'].includes(team.label))
  const people = active.map(member => ({
    id: `person:${member.userId}`, label: member.fullName || member.email,
    helper: [member.jobTitle, member.departmentName, member.email].filter(Boolean).join(' · '),
    userIds: [member.userId],
  }))
  return [
    { id: 'team:IPD', label: 'IPD', helper: 'Housebuild + Infrastructure + MEP + HSE', userIds: [...new Set(ipd.flatMap(team => team.userIds))] },
    ...teams, ...people,
  ].filter(item => item.userIds.length > 0)
}

const actionTypes = {
  instruction: 'Instruction', question: 'Question', request_update: 'Request update', decision: 'Decision',
}

export function ManagementActionDrawer({ workspaceId, projects, draft, createdByName, onClose, onSaved }: {
  workspaceId: string; projects: Project[]; draft: ActionDraft; createdByName: string;
  onClose: () => void; onSaved: (notificationError: boolean) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [members, setMembers] = useState<CustomerAdminMember[]>([])
  const [selected, setSelected] = useState<ActionAudience[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    projectId: draft.projectId, actionType: 'instruction' as ManagementActionType,
    title: draft.title || '', message: '', priority: 'normal', dueAt: '',
  })

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => { element?.close() }
  }, [])

  useEffect(() => {
    let live = true
    loadCustomerAdministration(workspaceId, 'Workspace')
      .then(data => { if (live) setMembers(data.members) })
      .catch(() => { if (live) setError('Unable to load recipients.') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [workspaceId])

  const audiences = useMemo(() => buildActionAudiences(members), [members])
  const search = query.trim().toLowerCase()
  const suggestions = audiences.filter(item =>
    !selected.some(chosen => chosen.id === item.id) && `${item.label} ${item.helper}`.toLowerCase().includes(search)
  ).slice(0, 10)
  const recipientUserIds = [...new Set(selected.flatMap(item => item.userIds))]

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!recipientUserIds.length) {
      setError('Choose at least one person or team.')
      return
    }
    const project = projects.find(item => String(item.id) === form.projectId)
    if (form.projectId && !project) {
      setError('Choose a project in the current selection.')
      return
    }
    if (!form.title.trim() || !form.message.trim()) {
      setError('Enter a title and message.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const action = await createManagementAction({
        workspaceId, projectId: project?.id ?? null, projectName: project?.project_name ?? null,
        actionType: form.actionType, title: form.title.trim(), message: form.message.trim(), priority: form.priority,
        dueAt: form.dueAt ? new Date(`${form.dueAt}+01:00`).toISOString() : null,
        recipientLabels: selected.map(item => item.label), recipientUserIds, createdByName,
      })
      onSaved(action.notificationError)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to issue management action.')
    } finally {
      setSaving(false)
    }
  }

  return <dialog ref={dialog} className="mi-action-drawer" aria-labelledby="mi-new-action" onCancel={event => {
    event.preventDefault()
    if (!saving) onClose()
  }}>
    <header className="mi-section-heading">
      <h2 id="mi-new-action" className="text-xl font-semibold">New management action</h2>
      <button type="button" className="mi-back" aria-label="Close management action" disabled={saving} onClick={onClose}><X size={18} /></button>
    </header>
    {error && <p role="alert" className="mi-notice">{error}</p>}
    <form onSubmit={submit} className="mt-4 space-y-4">
      <Field label="Project">
        <select className="form-control" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
          <option value="">Workspace-wide / multiple projects</option>
          {projects.map(project => <option key={project.id} value={project.id}>{project.project_name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type"><select className="form-control" value={form.actionType} onChange={e => setForm({ ...form, actionType: e.target.value as ManagementActionType })}>
          {Object.entries(actionTypes).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></Field>
        <Field label="Priority"><select className="form-control" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
          <option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option>
        </select></Field>
      </div>
      <Field label="Title"><input className="form-control" value={form.title} required onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
      <Field label="Instruction, question or comment"><textarea className="form-control" value={form.message} required rows={4} onChange={e => setForm({ ...form, message: e.target.value })} /></Field>
      <Field label="To people or teams">
        <input className="form-control" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search members, Design, IPD, MEP or Costing" disabled={loading} />
      </Field>
      {!!selected.length && <div className="mi-chips">
        {selected.map(item => <button type="button" key={item.id} onClick={() => setSelected(current => current.filter(choice => choice.id !== item.id))}
          aria-label={`Remove ${item.label}`}>{item.label} ×</button>)}
      </div>}
      {search && <ul className="mi-audience-results" aria-label="Matching recipients">
        {suggestions.map(item => <li key={item.id}><button type="button" onClick={() => { setSelected([...selected, item]); setQuery('') }}>
          <strong>{item.label}</strong><small>{item.helper}</small>
        </button></li>)}
        {!suggestions.length && <li className="p-2">No matching recipients.</li>}
      </ul>}
      <p className="mi-footnote">{loading ? 'Loading recipients…' : `${recipientUserIds.length} recipients selected`}</p>
      <Field label="Response or completion due (Lagos time)"><input className="form-control" type="datetime-local" value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })} /></Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="mi-back" disabled={saving} onClick={onClose}>Cancel</button>
        <button type="submit" className="btn bg-[#0B2A3C] text-white" disabled={saving || loading}><Send size={15} />{saving ? 'Issuing…' : 'Issue action'}</button>
      </div>
    </form>
  </dialog>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="mi-action-field"><span>{label}</span>{children}</label>
}
