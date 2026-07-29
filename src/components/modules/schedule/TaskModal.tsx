import { useProjectStore } from '@/store/project'
import { getRole } from '@/lib/access'
import { logAudit } from '@/lib/audit'
import { useState } from 'react'
import { CalendarDays, CheckCircle2, Flag, Trash2 } from 'lucide-react'
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { useAuthStore } from '@/store/auth'
import type { Task } from '@/types'
import { fdate } from '@/lib/utils'
import { Drawer } from '@/components/ui/Drawer'
import { pmoConfirm } from '@/lib/notifications'

interface Props {
  task: Task | null
  onClose: () => void
  deliveryPackageId?: string
  discipline?: 'Housebuild' | 'MEP' | 'Infrastructure'
}

export default function TaskModal({ task, onClose, deliveryPackageId, discipline }: Props) {
  const { user } = useAuthStore()
  const { projectId } = useProjectStore()
  const role = getRole(user?.email)
  const create = useCreateTask()
  const update = useUpdateTask()
  const del = useDeleteTask()
  const [error, setError] = useState('')

  const DEFAULT_PHASES = [
    'Approval Schedule',
    'Program Schedule',
    'Site Preparation',
    'Substructure',
    'Foundation',
    'Superstructure',
    'Blockwork',
    'Roofing',
    'Internal "Wet works" (Contractor)',
    'MEP Works',
    'External Works Phase',
    'Internal works & Interior Design',
    'Finishes',
    'Snagging',
    'Handover',
  ]

  const PHASES = Array.from(new Set([...DEFAULT_PHASES, task?.phase || ''].filter(Boolean)))
  const isEditMode = !!task

  const [form, setForm] = useState({
    task_number: task?.task_number ?? 0,
    name: task?.name || '',
    phase: task?.phase || PHASES[1],
    start_date: task?.start_date || '',
    finish_date: task?.finish_date || '',
    dependencies: task?.dependencies || '',
    responsible: task?.responsible || '',
    status: task?.status || 'Not Started',
    progress_pct: task?.progress_pct ?? 0,
    notes: task?.notes || '',
    is_milestone: task?.is_milestone || false,
    procurement_deadline: task?.procurement_deadline || '',
    approval_deadline: task?.approval_deadline || '',
  })

  const updateField = (key: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'status' && value === 'Completed') next.progress_pct = 100
      if (key === 'status' && value === 'Not Started') next.progress_pct = 0
      if (key === 'progress_pct') {
        const progress = Number(value)
        if (progress >= 100) next.status = 'Completed'
        else if (progress > 0 && next.status === 'Not Started') next.status = 'In Progress'
      }
      return next
    })
  }

  const cleanDate = (value: string) => (value && value.trim() !== '' ? value : null)

  const cleanCreatePayload = () => ({
    task_number: Number(form.task_number || 0),
    delivery_package_id: deliveryPackageId || task?.delivery_package_id || null,
    discipline: discipline || task?.discipline || 'Housebuild',
    name: form.name.trim(),
    phase: form.phase,
    start_date: cleanDate(form.start_date),
    finish_date: cleanDate(form.finish_date),
    dependencies: form.dependencies || null,
    responsible: form.responsible || null,
    status: form.status,
    progress_pct: Number(form.progress_pct || 0),
    notes: form.notes || null,
    is_milestone: form.is_milestone,
    procurement_deadline: cleanDate(form.procurement_deadline),
    approval_deadline: cleanDate(form.approval_deadline),
  })

  const cleanUpdatePayload = () => ({
    status: form.status,
    progress_pct: Number(form.progress_pct || 0),
    notes: form.notes || null,
    is_milestone: form.is_milestone,
  })

  const save = async () => {
    setError('')
    if (!projectId) return setError('No project selected.')
    if (!isEditMode && !form.name.trim()) return setError('Task name is required.')

    try {
      if (task) {
        const payload = cleanUpdatePayload()
        await update.mutateAsync({ id: task.id, ...payload } as any)
        const changes: string[] = []
        if (task.status !== payload.status) changes.push(`Status ${task.status} → ${payload.status}`)
        if (Number(task.progress_pct || 0) !== payload.progress_pct) changes.push(`Progress ${task.progress_pct || 0}% → ${payload.progress_pct}%`)
        if ((task.notes || '') !== (payload.notes || '')) changes.push('Notes updated')
        if (Boolean(task.is_milestone) !== Boolean(payload.is_milestone)) changes.push(payload.is_milestone ? 'Marked as milestone' : 'Removed from milestones')
        await logAudit(user, 'UPDATE', 'Schedule', task.id, changes.length ? changes.join(' | ') : `${task.name} updated`)
      } else {
        const payload = cleanCreatePayload()
        await create.mutateAsync({ ...payload, rag: '', created_by: user?.id } as any)
        await logAudit(user, 'CREATE', 'Schedule', 'new', payload.name)
      }
      onClose()
    } catch (err: any) {
      console.error('Task save failed:', err)
      setError(err.message || 'Unable to save task.')
    }
  }

  const remove = async () => {
    if (!task || !await pmoConfirm('Delete this task?')) return
    try {
      await del.mutateAsync(task.id)
      await logAudit(user, 'DELETE', 'Schedule', task.id, task.name)
      onClose()
    } catch (err: any) {
      console.error('Task delete failed:', err)
      setError(err.message || 'Unable to delete task.')
    }
  }

  const pending = create.isPending || update.isPending

  return (
    <Drawer
      open
      width="lg"
      title={task ? `Update Task #${task.task_number}` : 'Create Task'}
      description={task ? 'Record the latest site position without changing the approved baseline.' : 'Add an activity to the selected delivery schedule.'}
      onClose={onClose}
      footer={
        <>
          {task && role === 'admin' && (
            <button className="ui-button ui-button--danger mr-auto" onClick={remove} disabled={del.isPending}>
              <Trash2 size={15} /> Delete task
            </button>
          )}
          <button className="ui-button ui-button--secondary" onClick={onClose}>Cancel</button>
          <button className="ui-button ui-button--primary" onClick={save} disabled={pending}>
            <CheckCircle2 size={15} />
            {pending ? 'Saving…' : task ? 'Save update' : 'Create task'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {task && (
          <section className="rounded-2xl border border-[#dce7ef] bg-[#f7f9fa] p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-[#7a8c99]">
              <CalendarDays size={14} className="text-[#ef8354]" /> Approved baseline
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { k: 'Phase', v: task.phase || '—' },
                { k: 'Planned start', v: fdate(task.start_date) },
                { k: 'Planned finish', v: fdate(task.finish_date) },
              ].map(item => (
                <div key={item.k} className="rounded-xl border border-[#dce7ef] bg-white p-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7a8c99]">{item.k}</div>
                  <div className="mt-1 text-sm font-bold text-[#173f5f]">{item.v}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div>
            <div className="ui-eyebrow">Activity details</div>
            <h3 className="mt-1 text-lg font-extrabold text-[#173f5f]">{isEditMode ? 'Progress update' : 'Schedule information'}</h3>
          </div>

          {!isEditMode && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr]">
                <div>
                  <label className="form-label">Task number</label>
                  <input className="form-control" type="number" value={form.task_number} onChange={e => updateField('task_number', Number(e.target.value))} />
                </div>
                <div>
                  <label className="form-label">Task name *</label>
                  <input className="form-control" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Enter activity name" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label">Phase</label>
                  <select className="form-control" value={form.phase} onChange={e => updateField('phase', e.target.value)}>
                    {PHASES.map(phase => <option key={phase}>{phase}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Responsible person</label>
                  <input className="form-control" value={form.responsible} onChange={e => updateField('responsible', e.target.value)} placeholder="Name or company" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label className="form-label">Start date</label><input type="date" className="form-control" value={form.start_date} onChange={e => updateField('start_date', e.target.value)} /></div>
                <div><label className="form-label">Finish date</label><input type="date" className="form-control" value={form.finish_date} onChange={e => updateField('finish_date', e.target.value)} /></div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label className="form-label">Procurement deadline</label><input type="date" className="form-control" value={form.procurement_deadline} onChange={e => updateField('procurement_deadline', e.target.value)} /></div>
                <div><label className="form-label">Approval deadline</label><input type="date" className="form-control" value={form.approval_deadline} onChange={e => updateField('approval_deadline', e.target.value)} /></div>
              </div>

              <div><label className="form-label">Dependencies (#)</label><input className="form-control" value={form.dependencies} onChange={e => updateField('dependencies', e.target.value)} placeholder="e.g. 1, 3" /></div>
            </>
          )}

          {isEditMode && (
            <div className="rounded-2xl border border-[#dce7ef] bg-white p-4">
              <div className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7a8c99]">Task</div>
              <div className="mt-1 text-base font-extrabold text-[#173f5f]">{task?.name}</div>
            </div>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#dce7ef] bg-[#f7f9fa] p-4 transition hover:border-[#bfd0da]">
            <input type="checkbox" checked={form.is_milestone} onChange={e => updateField('is_milestone', e.target.checked)} className="mt-1 h-4 w-4 accent-[#ef8354]" />
            <Flag size={17} className="mt-0.5 text-[#ef8354]" />
            <span>
              <span className="block font-bold text-[#173f5f]">Mark as milestone</span>
              <span className="mt-1 block text-xs leading-5 text-[#7a8c99]">This activity will appear automatically in the Milestone Tracker.</span>
            </span>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={e => updateField('status', e.target.value)}>
                {['Not Started', 'In Progress', 'Completed', 'On Hold', 'Blocked'].map(status => <option key={status}>{status}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Progress</label>
              <div className="rounded-xl border border-[#dce7ef] bg-white px-4 py-[.72rem]">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#516779]"><span>Completion</span><span className="text-[#173f5f]">{form.progress_pct}%</span></div>
                <input type="range" min={0} max={100} value={form.progress_pct} onChange={e => updateField('progress_pct', Number(e.target.value))} className="w-full accent-[#ef8354]" />
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">Notes / update</label>
            <textarea className="form-control min-h-[140px] resize-y" value={form.notes} onChange={e => updateField('notes', e.target.value)} placeholder={isEditMode ? 'Add progress update, site observation, delay reason or action taken…' : 'Add supporting notes…'} />
          </div>
        </section>
      </div>
    </Drawer>
  )
}
