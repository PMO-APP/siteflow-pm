import { useQueryClient } from '@tanstack/react-query'
import { useProjectStore } from '@/store/project'
import { scheduleQueryKeys } from '../queryKeys'
import { parseExcelScheduleFile } from './excelParser'
import { parseMsProjectXmlFile } from './xmlParser'
import {
  insertImportedScheduleTasks,
  uploadScheduleBackup,
} from './service'
import type { ScheduleDiscipline } from './types'

export function useScheduleImport() {
  const queryClient = useQueryClient()
  const { projectId } = useProjectStore()

  async function importExcel(
    file: File,
    discipline: ScheduleDiscipline
  ) {
    if (!projectId) throw new Error('No project selected.')

    const tasks = await parseExcelScheduleFile({
      file,
      projectId,
      discipline,
    })

    if (!tasks.length) {
      throw new Error(
        'No valid tasks found. Make sure your Excel has a Task Name column.'
      )
    }

    const count = await insertImportedScheduleTasks(tasks)
    await queryClient.invalidateQueries({
      queryKey: scheduleQueryKeys.project(projectId),
    })

    return count
  }

  async function importXml(
    file: File,
    discipline: ScheduleDiscipline
  ) {
    if (!projectId) throw new Error('No project selected.')

    const tasks = await parseMsProjectXmlFile({
      file,
      projectId,
      discipline,
    })

    if (!tasks.length) {
      throw new Error('No valid tasks found in the XML file.')
    }

    const count = await insertImportedScheduleTasks(tasks)
    await queryClient.invalidateQueries({
      queryKey: scheduleQueryKeys.project(projectId),
    })

    return count
  }

  async function uploadBackup(
    file: File,
    discipline: ScheduleDiscipline
  ) {
    if (!projectId) throw new Error('No project selected.')

    return uploadScheduleBackup({
      projectId,
      discipline,
      file,
    })
  }

  return {
    importExcel,
    importXml,
    uploadBackup,
  }
}
