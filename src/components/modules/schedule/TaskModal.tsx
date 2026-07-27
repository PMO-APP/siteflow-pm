import { useProjectStore } from '@/store/project'
import { getRole } from '@/lib/access'
import { logAudit } from '@/lib/audit'
import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { useAuthStore } from '@/store/auth'
import type { Task } from '@/types'
import { fdate } from '@/lib/utils'

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

  const PHASES = Array.from(
    new Set([...DEFAULT_PHASES, task?.phase || ''].filter(Boolean))
  )

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

  const cleanCreatePayload = () => {
    return {
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
    }
  }

  const cleanUpdatePayload = () => {
    return {
      status: form.status,
      progress_pct: Number(form.progress_pct || 0),
      notes: form.notes || null,
      is_milestone: form.is_milestone,
    }
  }

  const save = async () => {
    setError('')

    if (!projectId) {
      setError('No project selected.')
      return
    }

    if (!isEditMode && !form.name.trim()) {
      setError('Task name is required.')
      return
    }

    try {
      if (task) {
        const payload = cleanUpdatePayload()

        await update.mutateAsync({
          id: task.id,
          ...payload,
        } as any)

        const changes: string[] = []

        if (task.status !== payload.status) {
          changes.push(`Status ${task.status} → ${payload.status}`)
        }

        if (Number(task.progress_pct || 0) !== payload.progress_pct) {
          changes.push(
            `Progress ${task.progress_pct || 0}% → ${payload.progress_pct}%`
          )
        }

        if ((task.notes || '') !== (payload.notes || '')) {
          changes.push('Notes updated')
        }

        if (Boolean(task.is_milestone) !== Boolean(payload.is_milestone)) {
          changes.push(
            payload.is_milestone
              ? 'Marked as milestone'
              : 'Removed from milestones'
          )
        }

        await logAudit(
          user,
          'UPDATE',
          'Schedule',
          task.id,
          changes.length > 0 ? changes.join(' | ') : `${task.name} updated`
        )
      } else {
        const payload = cleanCreatePayload()

        await create.mutateAsync({
          ...payload,
          rag: '',
          created_by: user?.id,
        } as any)

        await logAudit(user, 'CREATE', 'Schedule', 'new', `${payload.name}`)
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
            {task ? `Update Task #${task.task_number}` : 'New Task'}
          </div>

          {task && role === 'admin' && (
            <button
              onClick={remove}
              className="text-[#6e7d8c] hover:text-red-400 transition-colors p-1"
              title="Delete Task"
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
              { k: 'Phase', v: task.phase || '—' },
              { k: 'Planned Start', v: fdate(task.start_date) },
              { k: 'Planned Finish', v: fdate(task.finish_date) },
            ].map(item => (
              <div key={item.k} className="bg-[#1c2a36] rounded p-2">
                <div className="text-[8.5px] font-mono text-[#6e7d8c] uppercase tracking-widest mb-0.5">
                  {item.k}
                </div>

                <div className="text-[12px] text-[#ede8de]">{item.v}</div>
              </div>
            ))}
          </div>
        )}

        <div className="p-5 space-y-4">
          {!isEditMode && (
            <>
              <div>
                <label className="form-label">Task Number</label>
                <input
                  className="form-control"
                  type="number"
                  value={form.task_number}
                  onChange={e =>
                    updateField('task_number', Number(e.target.value))
                  }
                  placeholder="e.g. 1"
                />
              </div>

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
                  <label className="form-label">Responsible Person</label>
                  <input
                    className="form-control"
                    value={form.responsible}
                    onChange={e => updateField('responsible', e.target.value)}
                    placeholder="Name or company…"
                  />
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
                  <label className="form-label">Procurement Deadline</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.procurement_deadline}
                    onChange={e =>
                      updateField('procurement_deadline', e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="form-label">Approval Deadline</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.approval_deadline}
                    onChange={e =>
                      updateField('approval_deadline', e.target.value)
                    }
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Dependencies (#)</label>
                <input
                  className="form-control"
                  value={form.dependencies}
                  onChange={e => updateField('dependencies', e.target.value)}
                  placeholder="e.g. 1, 3"
                />
              </div>
            </>
          )}

          {isEditMode && (
            <div>
              <label className="form-label">Task</label>
              <div className="form-control bg-[#111820] border-white/[0.04] text-[#bfb9ae]">
                {task?.name}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/10 p-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_milestone}
                onChange={e => updateField('is_milestone', e.target.checked)}
                className="h-4 w-4 accent-[#c49e48]"
              />

              <div>
                <div className="font-medium text-[#ede8de]">
                  Mark as Milestone ⬦
                </div>

                <div className="text-xs text-[#6e7d8c]">
                  This task will automatically appear in the Milestone Tracker.
                </div>
              </div>
            </label>
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

          <div>
            <label className="form-label">Progress — {form.progress_pct}%</label>

            <input
              type="range"
              min={0}
              max={100}
              value={form.progress_pct}
              onChange={e => updateField('progress_pct', Number(e.target.value))}
              className="w-full accent-[#c49e48] bg-[#1c2a36] h-1.5 rounded-full"
            />
          </div>

          <div>
            <label className="form-label">Notes / Update</label>
            <textarea
              className="form-control"
              rows={4}
              value={form.notes}
              onChange={e => updateField('notes', e.target.value)}
              placeholder={
                isEditMode
                  ? 'Add progress update, site observation, delay reason, or action taken…'
                  : 'Notes…'
              }
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-white/[0.06]">
          <button className="btn-ghost btn-sm btn" onClick={onClose}>
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
              ? 'Save Update'
              : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
