import { supabase } from '@/lib/supabase'
import { publishTaskMutationEvents } from '@/services/events/domainEventPublishers'
import type { Task } from '@/types'
import type {
  ImportedScheduleTask,
  ScheduleDiscipline,
} from './types'

export async function insertImportedScheduleTasks(
  tasks: ImportedScheduleTask[]
) {
  if (!tasks.length) return 0

  const { data, error } = await supabase.from('tasks').insert(tasks).select()
  if (error) throw error

  const inserted = (data || []) as Task[]
  for (const task of inserted) {
    if (!task.project_id) continue
    await publishTaskMutationEvents({
      projectId: task.project_id,
      before: null,
      after: task,
      source: 'integration',
      metadata: { import: true, batchSize: inserted.length },
    })
  }

  return inserted.length
}

export async function uploadScheduleBackup({
  projectId,
  discipline,
  deliveryPackageId,
  file,
}: {
  projectId: number | string
  discipline: ScheduleDiscipline
  deliveryPackageId: string
  file: File
}) {
  const fileName = `${projectId}/schedule-backups/${discipline}/${deliveryPackageId}/${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('project-files')
    .upload(fileName, file)

  if (error) throw error
  return fileName
}
