import { useQueryClient } from '@tanstack/react-query'
import { useProjectStore } from '@/store/project'
import { supabase } from '@/lib/supabase'
import { scheduleQueryKeys } from '../queryKeys'
import { parseExcelScheduleFile } from './excelParser'
import { parseMsProjectXmlFile } from './xmlParser'
import { uploadScheduleBackup } from './service'
import type { ImportedScheduleTask, ScheduleDiscipline } from './types'

async function sha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

export function useScheduleImport() {
  const queryClient = useQueryClient()
  const { projectId } = useProjectStore()

  async function importSchedule(file: File, discipline: ScheduleDiscipline, deliveryPackageId: string, kind: 'xml' | 'excel') {
    if (!projectId) throw new Error('No project selected.')
    if (!deliveryPackageId || deliveryPackageId === 'all') throw new Error('Select a delivery package first.')
    const [fingerprint, tasks] = await Promise.all([
      sha256(file),
      kind === 'xml'
        ? parseMsProjectXmlFile({ file, projectId, discipline, deliveryPackageId })
        : parseExcelScheduleFile({ file, projectId, discipline, deliveryPackageId }),
    ])
    if (!tasks.length) throw new Error('No valid activities found in the uploaded programme.')
    if (tasks.length > 5000) throw new Error('This programme exceeds the 5,000 activity import limit.')
    const payload = tasks.map((task: ImportedScheduleTask) => ({
      task_number: task.task_number, name: task.name, phase: task.phase,
      start_date: task.start_date, finish_date: task.finish_date,
      planned_start: task.planned_start, planned_finish: task.planned_finish,
      dependencies: task.dependencies, responsible: task.responsible,
      status: task.status, rag: task.rag, progress_pct: task.progress_pct,
      procurement_deadline: task.procurement_deadline,
      approval_deadline: task.approval_deadline, notes: task.notes,
      is_milestone: task.is_milestone,
    }))
    const { data, error } = await supabase.rpc('import_schedule_atomic', {
      p_project_id: Number(projectId), p_delivery_package_id: deliveryPackageId,
      p_discipline: discipline, p_file_name: file.name,
      p_file_sha256: fingerprint, p_tasks: payload,
    })
    if (error) throw new Error(error.message)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: scheduleQueryKeys.project(projectId) }),
      queryClient.invalidateQueries({ queryKey: ['schedule_versions'] }),
    ])
    await queryClient.refetchQueries({ queryKey: scheduleQueryKeys.project(projectId), type: 'active' })
    return Number(data?.activity_count ?? tasks.length)
  }

  const importXml = (file: File, discipline: ScheduleDiscipline, deliveryPackageId: string) => importSchedule(file, discipline, deliveryPackageId, 'xml')
  const importExcel = (file: File, discipline: ScheduleDiscipline, deliveryPackageId: string) => importSchedule(file, discipline, deliveryPackageId, 'excel')
  const uploadBackup = (file: File, discipline: ScheduleDiscipline, deliveryPackageId: string) => {
    if (!projectId) throw new Error('No project selected.')
    return uploadScheduleBackup({ projectId, discipline, deliveryPackageId, file })
  }
  return { importXml, importExcel, uploadBackup }
}
