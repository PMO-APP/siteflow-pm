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

const PHASES = [
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

interface Props {
  task: Task | null
  onClose: () => void
}

export default function TaskModal({ task, onClose }: Props) {
  const { user } = useAuthStore()
  const { projectId } = useProjectStore()

  const role = getRole(user?.email)
  const create = useCreateTask()
  const update = useUpdateTask()
  const del = useDeleteTask()

  const [error, setError] = useState('')

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
      const next = {
        ...prev,
        [key]: value,
      }

      if (key === 'status' && value === 'Completed') {
        next.progress_pct = 100
      }

      if (key === 'status' && value === 'Not Started') {
        next.progress_pct = 0
      }

      if (key === 'progress_pct') {
        const progress = Number(value)

        if (progress >= 100) {
          next.status = 'Completed'
        } else if (progress > 0 && next.status === 'Not Started') {
          next.status = 'In Progress'
        }
      }

      return next
    })
  }

  const cleanDate = (value: string) => {
    return value && value.trim() !== '' ? value : null
  }

  const cleanPayload = () => {
    return {
      task_number: Number(form.task_number || 0),
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
    }
  }

  const save = async () => {
    setError('')

    if (!projectId) {
      setError('No project selected.')
      return
    }

    if (!form.name.trim()) {
      setError('Task name is required.')
      return
    }

    try {
      const payload = cleanPayload()

      if (task) {
        await update.mutateAsync({
          id: task.id,
          ...payload,
        } as any)

        const changes: string[] = []

        if (task.finish_date !== payload.finish_date) {
          changes.push(
            `Finish Date ${task.finish_date || '-'} → ${payload.finish_date || '-'}`
          )

          if (task.finish_date && payload.finish_date) {
            const oldDate = new Date(task.finish_date)
            const newDate = new Date(payload.finish_date)

            const diffDays = Math.round(
              (newDate.getTime() - oldDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )

            if (diffDays > 0 && diffDays < 7) {
              changes.push(`Delay Warning: +${diffDays} days`)

              await supabase.from('notifications').insert({
                user_id: user?.id,
                type: 'warning',
                title: 'Delay Warning',
                message: `${payload.name} delayed by ${diffDays} days`,
                project_id: projectId,
              })
            }

            if (diffDays >= 7) {
              changes.push(`Critical Delay: +${diffDays} days`)

              await supabase.from('notifications').insert({
                user_id: user?.id,
                type: 'alert',
                title: 'Critical Delay',
                message: `${payload.name} delayed by ${diffDays} days`,
                project_id: projectId,
              })

              await supabase.from('risks').upsert(
                {
                  title: `${payload.name} causing critical delay`,
                  category: 'Schedule',
                  owner: payload.responsible || 'PM',
                  severity: 'High',
                  status: 'Open',
                  mitigation: 'Immediate recovery plan required',
                  source: 'Auto from Schedule',
                  project_id: projectId,
                },
                {
                  onConflict: 'title,source',
                }
              )
            }

            if (diffDays < 0) {
              changes.push(`Recovered ${Math.abs(diffDays)} days`)

              await supabase.from('notifications').insert({
                user_id: user?.id,
                type: 'success',
                title: 'Recovery Achieved',
                message: `${payload.name} recovered ${Math.abs(diffDays)} days`,
                project_id: projectId,
              })

              await supabase
                .from('risks')
                .update({
                  severity: Math.abs(diffDays) >= 7 ? 'Low' : 'Medium',
                  status: Math.abs(diffDays) >= 7 ? 'Closed' : 'Monitoring',
                  mitigation:
                    Math.abs(diffDays) >= 7
                      ? 'Recovered through programme acceleration'
                      : 'Delay partially recovered',
                })
                .eq('title', `${payload.name} causing critical delay`)
                .eq('source', 'Auto from Schedule')
                .eq('project_id', projectId)
            }
          }
        }

        if (task.phase !== payload.phase) {
          changes.push(`Phase ${task.phase || '-'} → ${payload.phase || '-'}`)
        }

        if (task.start_date !== payload.start_date) {
          changes.push(
            `Start Date ${task.start_date || '-'} → ${payload.start_date || '-'}`
          )
        }

        if (Number(task.progress_pct || 0) !== payload.progress_pct) {
          changes.push(
            `Progress ${task.progress_pct || 0}% → ${payload.progress_pct}%`
          )
        }

        if (task.status !== payload.status) {
          changes.push(`Status ${task.status} → ${payload.status}`)
        }

        if ((task.dependencies || '') !== (payload.dependencies || '')) {
          changes.push(
            `Deps ${task.dependencies || '-'} → ${payload.dependencies || '-'}`
          )
        }

        if ((task.responsible || '') !== (payload.responsible || '')) {
          changes.push(
            `Owner ${task.responsible || '-'} → ${payload.responsible || '-'}`
          )
        }

        await logAudit(
          user,
          'UPDATE',
          'Schedule',
          task.id,
          changes.length > 0 ? changes.join(' | ') : `${payload.name} updated`
        )
      } else {
        await create.mutateAsync({
          ...payload,
          rag: '',
          created_by: user?.id,
        } as any)

        await logAudit(
          user,
          'CREATE',
          'Schedule',
          'new',
          `${payload.name}`
        )
      }

      onClose()
    } catch (err: any) {
      console.error('Task save failed:', err)
      setError(err.message || 'Unable to save task.')
    }
  }

  const remove = async () => {
    if (!task || !confirm('Delete this task?')) return

    try {
      await del.mutateAsync(task.id)

      await logAudit(
        user,
        'DELETE',
        'Schedule',
        task.id,
        task.name
      )

      onClose()
    } catch (err: any) {
      console.error('Task delete failed:', err)
      setError(err.message || 'Unable to delete task.')
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal max-w-2xl">
        <div className="gold-bar" />

        <div className="modal-head">
          <div className="modal-title">
            {task ? `Edit Task #${task.task_number}` : 'New Task'}
          </div>

          {task && role === 'admin' && (
            <button
              onClick={remove}
              className="text-[#6e7d8c] hover:text-red-400 transition-colors p-1"
            >
              <Trash2 size={14} />
            </button>
          )}

          <button
            onClick={onClose}
            className="text-[#6e7d8c] hover:text-[#ede8de] transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {task && (
          <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-[#111820] border-b border-white/[0.06]">
            {[
              {
                k: 'Duration',
                v: task.duration_days ? `${task.duration_days}d` : '—',
              },
              {
                k: 'Created',
                v: fdate(task.created_at),
              },
              {
                k: 'Updated',
                v: fdate(task.updated_at),
              },
            ].map(i => (
              <div key={i.k} className="bg-[#1c2a36] rounded p-2">
                <div className="text-[8.5px] font-mono text-[#6e7d8c] uppercase tracking-widest mb-0.5">
                  {i.k}
                </div>

                <div className="text-[12px] text-[#ede8de]">
                  {i.v}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-5 space-y-4">
          {!task && (
            <div>
              <label className="form-label">Task Number</label>
              <input
                className="form-control"
                type="number"
                value={form.task_number}
                onChange={e => updateField('task_number', Number(e.target.value))}
                placeholder="e.g. 1"
              />
            </div>
          )}

          <div>
            <label className="form-label">Task Name *</label>
            <input
              className="form-control"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="Task name…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Phase</label>
              <select
                className="form-control"
                value={form.phase}
                onChange={e => updateField('phase', e.target.value)}
              >
                {PHASES.map(phase => (
                  <option key={phase}>{phase}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={form.status}
                onChange={e => updateField('status', e.target.value)}
              >
                {[
                  'Not Started',
                  'In Progress',
                  'Completed',
                  'On Hold',
                  'Blocked',
                ].map(status => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={form.start_date}
                onChange={e => updateField('start_date', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Finish Date</label>
              <input
                type="date"
                className="form-control"
                value={form.finish_date}
                onChange={e => updateField('finish_date', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Dependencies (#)</label>
              <input
                className="form-control"
                value={form.dependencies}
                onChange={e => updateField('dependencies', e.target.value)}
                placeholder="e.g. 1, 3"
              />
            </div>

            <div>
              <label className="form-label">Responsible Person</label>
              <input
                className="form-control"
                value={form.responsible}
                onChange={e => updateField('responsible', e.target.value)}
                placeholder="Name or company…"
              />
            </div>
          </div>

          <div>
            <label className="form-label">
              Progress — {form.progress_pct}%
            </label>

            <input
              type="range"
              min={0}
              max={100}
              value={form.progress_pct}
              onChange={e => updateField('progress_pct', Number(e.target.value))}
              className="w-full accent-[#c49e48] bg-[#1c2a36] h-1.5 rounded-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Procurement Deadline</label>
              <input
                type="date"
                className="form-control"
                value={form.procurement_deadline}
                onChange={e => updateField('procurement_deadline', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Approval Deadline</label>
              <input
                type="date"
                className="form-control"
                value={form.approval_deadline}
                onChange={e => updateField('approval_deadline', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="milestone"
              checked={form.is_milestone}
              onChange={e => updateField('is_milestone', e.target.checked)}
              className="accent-[#c49e48]"
            />

            <label
              htmlFor="milestone"
              className="text-[12px] text-[#bfb9ae] cursor-pointer"
            >
              Mark as Milestone ⬦
            </label>
          </div>

          <div>
            <label className="form-label">Notes</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.notes}
              onChange={e => updateField('notes', e.target.value)}
              placeholder="Notes…"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
          <button
            className="btn-ghost btn-sm btn"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="btn-gold btn-sm btn"
            onClick={save}
            disabled={create.isPending || update.isPending}
          >
            {create.isPending || update.isPending
              ? 'Saving…'
              : task
              ? 'Save Changes'
              : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
