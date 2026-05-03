import { useProjectStore } from '@/store/project'
import { supabase } from '@/lib/supabase'
import { getRole } from '@/lib/access'
import { logAudit } from '@/lib/audit'
import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { useAuthStore } from '@/store/auth'
import type { Task } from '@/types'
import { fdate } from '@/lib/utils'

const PHASES = ['Approval Schedule','Program Schedule','Internal "Wet works" (Contractor)','External Works Phase','Internal works & Interior Design']

interface Props {
  task: Task | null
  onClose: () => void
}

export default function TaskModal({ task, onClose }: Props) {
  const { user } =
  useAuthStore()

const { projectId } =
  useProjectStore()
  const role = getRole(user?.email)
  const create = useCreateTask()
  const update = useUpdateTask()
  const del = useDeleteTask()

  const [form, setForm] = useState({
    name: task?.name || '',
    phase: task?.phase || PHASES[1],
    start_date: task?.start_date || '',
    finish_date: task?.finish_date || '',
    dependencies: task?.dependencies || '',
    responsible: task?.responsible || '',
    status: task?.status || 'Not Started',
    progress_pct: task?.progress_pct || 0,
    notes: task?.notes || '',
    is_milestone: task?.is_milestone || false,
    procurement_deadline: task?.procurement_deadline || '',
    approval_deadline: task?.approval_deadline || '',
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
  if (!form.name.trim()) return

  if (task) {
    await update.mutateAsync({
  id: task.id,
  ...form,
  project_id: projectId
})

  const changes: string[] = []

if (task.finish_date !== form.finish_date) {
  const oldDate = task.finish_date
  const newDate = form.finish_date

  changes.push(
    `Finish Date ${oldDate || '-'}→${newDate || '-'}`
  )

  if (oldDate && newDate) {
    const oldD = new Date(oldDate)
    const newD = new Date(newDate)

    const diffDays =
      Math.round(
        (newD.getTime() - oldD.getTime()) /
        (1000 * 60 * 60 * 24)
      )

    if (diffDays > 0 && diffDays < 7) {
  changes.push(
    `Delay Warning: +${diffDays} days`
  )

  await supabase
    .from('notifications')
    .insert({
      user_id: user?.id,
      type: 'warning',
      title: 'Delay Warning',
      message: `${form.name} delayed by ${diffDays} days`
    })
}

    if (diffDays >= 7) {
      await supabase
  .from('notifications')
  .insert({
    user_id: user?.id,
    type: 'alert',
    title: 'Critical Delay',
    message: `${form.name} delayed by ${diffDays} days`
  })
  changes.push(
    `CRITICAL DELAY CHANGE: +${diffDays} days`
  )

  await supabase
    .from('risks')
    .upsert(
  {
    title: `${form.name} causing critical delay`,
    category: 'Schedule',
    owner: form.responsible || 'PM',
    severity: 'High',
    status: 'Open',
    mitigation: 'Immediate recovery plan required',
    source: 'Auto from Schedule',
    project_id: projectId,
  },
  {
    onConflict: 'title,source'
  }
)
}

    if (diffDays < 0) {
      await supabase
  .from('notifications')
  .insert({
    user_id: user?.id,
    type: 'success',
    title: 'Recovery Achieved',
    message: `${form.name} recovered ${Math.abs(diffDays)} days`
  })
  changes.push(
    `Recovered ${Math.abs(diffDays)} days`
  )

  await supabase
    .from('risks')
    .update({
      severity: 'Medium',
      status: 'Monitoring',
      mitigation: 'Delay partially recovered'
    })
    .eq(
      'title',
      `${form.name} causing critical delay`
    )
    .eq(
      'source',
      'Auto from Schedule'
    )
      .eq('project_id', projectId)

  if (Math.abs(diffDays) >= 7) {
    await supabase
      .from('risks')
      .update({
        severity: 'Low',
        status: 'Closed',
        mitigation:
          'Recovered through programme acceleration'
      })
      .eq(
        'title',
        `${form.name} causing critical delay`
      )
      .eq(
        'source',
        'Auto from Schedule'
      )
    .eq('project_id', projectId)
  }
}
  }
}

if (task.start_date !== form.start_date) {
  changes.push(
    `Start Date ${task.start_date || '-'}→${form.start_date || '-'}`
  )
}

if (task.progress_pct !== form.progress_pct) {
  changes.push(
    `Progress ${task.progress_pct}%→${form.progress_pct}%`
  )
}

if (task.status !== form.status) {
  changes.push(
    `Status ${task.status}→${form.status}`
  )
}

if (task.dependencies !== form.dependencies) {
  changes.push(
    `Deps ${task.dependencies || '-'}→${form.dependencies || '-'}`
  )
}

if (task.responsible !== form.responsible) {
  changes.push(
    `Owner ${task.responsible || '-'}→${form.responsible || '-'}`
  )
}

const desc =
  changes.length > 0
    ? changes.join(' | ')
    : `${form.name} updated`

await logAudit(
  user,
  'UPDATE',
  'Schedule',
  task.id,
  desc
)

  } else {
await create.mutateAsync({
  ...form,
  rag: '',
  created_by: user?.id,
  project_id: projectId
} as any)

    await logAudit(
      user,
      'CREATE',
      'Schedule',
      'new',
      `${form.name}`
    )
  }

  onClose()
}

  const remove = async () => {
  if (!task || !confirm('Delete this task?')) return

  await del.mutateAsync(task.id)

  await logAudit(
    user,
    'DELETE',
    'Schedule',
    task.id,
    task.name
  )

  onClose()
}

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal max-w-2xl">
        <div className="gold-bar" />
        <div className="modal-head">
          <div className="modal-title">{task ? `Edit Task #${task.task_number}` : 'New Task'}</div>
          {task && role === 'admin' && (
  <button
    onClick={remove}
    className="text-[#6e7d8c] hover:text-red-400 transition-colors p-1"
  >
    <Trash2 size={14} />
  </button>
)}
          <button onClick={onClose} className="text-[#6e7d8c] hover:text-[#ede8de] transition-colors p-1"><X size={16} /></button>
        </div>

        {task && (
          <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-[#111820] border-b border-white/[0.06]">
            {[
              { k: 'Duration', v: task.duration_days ? `${task.duration_days}d` : '—' },
              { k: 'Created', v: fdate(task.created_at) },
              { k: 'Updated', v: fdate(task.updated_at) },
            ].map(i => (
              <div key={i.k} className="bg-[#1c2a36] rounded p-2">
                <div className="text-[8.5px] font-mono text-[#6e7d8c] uppercase tracking-widest mb-0.5">{i.k}</div>
                <div className="text-[12px] text-[#ede8de]">{i.v}</div>
              </div>
            ))}
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <label className="form-label">Task Name *</label>
            <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Task name…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Phase</label>
              <select className="form-control" value={form.phase} onChange={e => set('phase', e.target.value)}>
                {PHASES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
                {['Not Started','In Progress','Completed','On Hold','Blocked'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Start Date</label>
              <input type="date" className="form-control" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Finish Date</label>
              <input type="date" className="form-control" value={form.finish_date} onChange={e => set('finish_date', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Dependencies (#)</label>
              <input className="form-control" value={form.dependencies} onChange={e => set('dependencies', e.target.value)} placeholder="e.g. 1, 3" />
            </div>
            <div>
              <label className="form-label">Responsible Person</label>
              <input className="form-control" value={form.responsible} onChange={e => set('responsible', e.target.value)} placeholder="Name or company…" />
            </div>
          </div>

          <div>
            <label className="form-label">Progress — {form.progress_pct}%</label>
            <input type="range" min={0} max={100} value={form.progress_pct} onChange={e => set('progress_pct', +e.target.value)}
              className="w-full accent-[#c49e48] bg-[#1c2a36] h-1.5 rounded-full" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Procurement Deadline</label>
              <input type="date" className="form-control" value={form.procurement_deadline} onChange={e => set('procurement_deadline', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Approval Deadline</label>
              <input type="date" className="form-control" value={form.approval_deadline} onChange={e => set('approval_deadline', e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="milestone" checked={form.is_milestone} onChange={e => set('is_milestone', e.target.checked)} className="accent-[#c49e48]" />
            <label htmlFor="milestone" className="text-[12px] text-[#bfb9ae] cursor-pointer">Mark as Milestone ⬦</label>
          </div>

          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notes…" />
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
          <button className="btn-ghost btn-sm btn" onClick={onClose}>Cancel</button>
          <button className="btn-gold btn-sm btn" onClick={save} disabled={create.isPending || update.isPending}>
            {create.isPending || update.isPending ? 'Saving…' : task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
