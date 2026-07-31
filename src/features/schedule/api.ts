import { supabase } from '@/lib/supabase'
import type { Task } from '@/types'
import { publishTaskMutationEvents } from '@/services/events/domainEventPublishers'

export async function fetchProjectTasks(projectId: number | string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('task_number', { ascending: true })

  if (error) throw error
  return (data || []) as Task[]
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
