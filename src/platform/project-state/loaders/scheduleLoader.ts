import { supabase } from '@/lib/supabase'
import type { ScheduleTaskState } from '../types'
import { clamp, normalizePredecessors, toId, toISO } from '../utils'

function progress(task: any) {
  if (task.status === 'Completed') return 100
  if (task.status === 'Not Started') return 0
  return clamp(Number(task.progress_pct || 0))
}

export async function loadSchedule(projectId: string | number): Promise<ScheduleTaskState[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('task_number', { ascending: true })

  if (error) throw error

  return (data || []).map(task => ({
    id: toId(task.id),
    projectId: toId(task.project_id),
    taskNumber: Number(task.task_number || 0),
    name: task.name || task.task_name || 'Untitled activity',
    discipline: task.discipline || null,
    phase: task.phase || task.stage || null,
    status: task.status || null,
    progress: progress(task),
    weight: Number(task.weight_pct || 0),
    plannedStart: toISO(task.planned_start || task.start_date),
    plannedFinish: toISO(task.planned_finish || task.finish_date),
    actualStart: toISO(task.actual_start),
    actualFinish: toISO(task.actual_finish),
    predecessorIds: normalizePredecessors(
      task.predecessor_ids || task.predecessors || task.predecessor
    ),
    isCritical: Boolean(task.is_critical || task.critical_path || task.total_float === 0),
    isBlocked: Boolean(task.is_blocked || task.is_on_hold || task.status === 'Blocked'),
    updatedAt: toISO(task.updated_at),
  }))
}
