import { supabase } from '@/lib/supabase'
import type { Task } from '@/types'
import { publishTaskMutationEvents } from '@/services/events/domainEventPublishers'
import { normaliseActivityName, type RevisionProgrammeActivity } from './features/schedule/revisionProgramme'

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

  const revisions = activeRevisions || []
  if (!revisions.length) return baseTasks

  return baseTasks.map(task => {
    const scoped = revisions.find(revision => revision.block_id && String(revision.block_id) === String(task.delivery_package_id))
    const projectWide = revisions.find(revision => !revision.block_id)
    const revision = scoped || projectWide
    const activities = (revision?.programme_activities || []) as RevisionProgrammeActivity[]
    if (!revision || !activities.length) return task

    const taskName = normaliseActivityName(task.name)
    const byName = activities.filter(activity => normaliseActivityName(activity.name) === taskName)
    const activity = byName.length === 1
      ? byName[0]
      : byName.find(activity => Number(activity.task_number) === Number(task.task_number))
        || activities.find(activity => Number(activity.task_number) === Number(task.task_number) && normaliseActivityName(activity.name) === taskName)
    if (!activity) return task

    return {
      ...task,
      start_date: activity.start_date || task.start_date,
      finish_date: activity.finish_date || task.finish_date,
      planned_start: activity.start_date || (task as any).planned_start || task.start_date,
      planned_finish: activity.finish_date || (task as any).planned_finish || task.finish_date,
      dependencies: activity.dependencies ?? task.dependencies,
      responsible: activity.responsible ?? task.responsible,
      is_milestone: activity.is_milestone || task.is_milestone,
      controlled_revision_id: revision.id,
      controlled_revision_no: revision.revision_no,
      controlled_revision_name: revision.revision_name,
    } as Task
  })
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
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('project_id', projectId)

  if (error) throw error
}
