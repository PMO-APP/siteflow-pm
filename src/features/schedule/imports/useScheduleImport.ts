import { useQueryClient } from '@tanstack/react-query'
import { useProjectStore } from '@/store/project'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'
import { scheduleQueryKeys } from '../queryKeys'
import { parseExcelScheduleFile } from './excelParser'
import { parseMsProjectXmlFile } from './xmlParser'
import { insertImportedScheduleTasks, uploadScheduleBackup } from './service'
import type { ScheduleDiscipline } from './types'

export function useScheduleImport() {
  const queryClient = useQueryClient()
  const { projectId } = useProjectStore()
  const { user } = useAuthStore()

  async function createVersion(file: File, discipline: ScheduleDiscipline, deliveryPackageId: string) {
    if (!projectId) throw new Error('No project selected.')
    const { data: previous } = await supabase
      .from('schedule_versions')
      .select('revision_number')
      .eq('project_id', projectId)
      .eq('delivery_package_id', deliveryPackageId)
      .order('revision_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    await supabase.from('schedule_versions').update({ is_current: false })
      .eq('project_id', projectId).eq('delivery_package_id', deliveryPackageId)

    const { data, error } = await supabase.from('schedule_versions').insert({
      project_id: projectId,
      delivery_package_id: deliveryPackageId,
      discipline,
      revision_number: Number(previous?.revision_number || 0) + 1,
      file_name: file.name,
      uploaded_by: user?.id || null,
      is_current: true,
    }).select('id').single()
    if (error) throw error
    return data.id as string
  }

  async function importExcel(file: File, discipline: ScheduleDiscipline, deliveryPackageId: string) {
    if (!projectId) throw new Error('No project selected.')
    if (!deliveryPackageId) throw new Error('Select a delivery package before uploading a schedule.')
    const versionId = await createVersion(file, discipline, deliveryPackageId)
    const tasks = await parseExcelScheduleFile({ file, projectId, discipline, deliveryPackageId, scheduleVersionId: versionId })
    if (!tasks.length) throw new Error('No valid tasks found. Make sure your Excel has a Task Name column.')
    const count = await insertImportedScheduleTasks(tasks)
    await queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.project(projectId) })
    return count
  }

  async function importXml(file: File, discipline: ScheduleDiscipline, deliveryPackageId: string) {
    if (!projectId) throw new Error('No project selected.')
    if (!deliveryPackageId) throw new Error('Select a delivery package before uploading a schedule.')
    const versionId = await createVersion(file, discipline, deliveryPackageId)
    const tasks = await parseMsProjectXmlFile({ file, projectId, discipline, deliveryPackageId, scheduleVersionId: versionId })
    if (!tasks.length) throw new Error('No valid tasks found in the XML file.')
    const count = await insertImportedScheduleTasks(tasks)
    await queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.project(projectId) })
    return count
  }

  async function uploadBackup(file: File, discipline: ScheduleDiscipline, deliveryPackageId: string) {
    if (!projectId) throw new Error('No project selected.')
    return uploadScheduleBackup({ projectId, discipline, deliveryPackageId, file })
  }

  return { importExcel, importXml, uploadBackup }
}
