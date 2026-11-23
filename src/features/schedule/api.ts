import { supabase } from '@/lib/supabase'
import type { Task } from '@/types'
import { publishTaskMutationEvents } from '@/services/events/domainEventPublishers'
import { applyControlledProgramme } from './controlledProgramme'

export async function fetchProjectTasks(projectId: number | string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('task_number', { ascending: true })

  if (error) throw error
  const baseTasks = (data || []) as Task[]

  // A revision is not just a revised handover label. Resolve the activity dates
  // from the currently active controlled programme. The stored task rows retain
  // progress/actuals while the approved revision supplies planned dates.
  const { data: activeRevisions, error: revisionError } = await supabase
    .from('schedule_revisions')
    .select('id, block_id, revision_no, revision_name, programme_activities, activated_at, created_at')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('activated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (revisionError) {
    // Backward compatibility while the migration is being deployed: never make
    // the entire schedule unavailable because the new revision column is absent.
    if (/programme_activities/i.test(revisionError.message || '')) return baseTasks
    throw revisionError
  }

  return applyControlledProgramme(baseTasks, activeRevisions ?? [])
}

export async function createProjectTask(
  projectId: number | string,
  task: Partial<Task>
) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, project_id: projectId })
    .select()
    .single()

  if (error) throw error
  const saved = data as Task
  await publishTaskMutationEvents({ projectId, before: null, after: saved, source: 'ui' })
  return saved
}

export async function fetchProjectTask(
  projectId: number | string,
  taskId: string
) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('project_id', projectId)
    .single()

  if (error) throw error
  return data as Task
}

export async function updateProjectTask(
  projectId: number | string,
  taskId: string,
  updates: Partial<Task>
) {
  const before = await fetchProjectTask(projectId, taskId)
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('project_id', projectId)
    .select()
    .single()

  if (error) throw error
  const saved = data as Task
  await publishTaskMutationEvents({ projectId, before, after: saved, source: 'ui' })
  return saved
}

export async function deleteProjectTask(
  projectId: number | string,
  taskId: string
) {
  const { data, error } = await supabase.rpc('admin_delete_schedule_task', {
    p_project_id: Number(projectId), p_task_id: taskId,
  })
  if (error) throw new Error(error.message)
  return data === true
}

export async function clearProjectSchedule(projectId: string | number, packageId: string | null) {
  const { data, error } = await supabase.rpc('admin_clear_schedule', {
    p_project_id: Number(projectId), p_delivery_package_id: packageId, p_whole_project: packageId === null,
  })
  if (error) throw new Error(error.message)
  return Number(data)
}
