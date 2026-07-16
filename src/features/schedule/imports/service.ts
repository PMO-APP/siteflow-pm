import { supabase } from '@/lib/supabase'
import type {
  ImportedScheduleTask,
  ScheduleDiscipline,
} from './types'

export async function insertImportedScheduleTasks(
  tasks: ImportedScheduleTask[]
) {
  if (!tasks.length) return 0

  const { error } = await supabase.from('tasks').insert(tasks)
  if (error) throw error

  return tasks.length
}

export async function uploadScheduleBackup({
  projectId,
  discipline,
  file,
}: {
  projectId: number | string
  discipline: ScheduleDiscipline
  file: File
}) {
  const fileName = `${projectId}/schedule-backups/${discipline}/${Date.now()}-${file.name}`

  const { error } = await supabase.storage
    .from('project-files')
    .upload(fileName, file)

  if (error) throw error
  return fileName
}
