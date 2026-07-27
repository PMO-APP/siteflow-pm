import * as XLSX from 'xlsx'
import { excelDateToISO } from './dateUtils'
import type {
  ImportedScheduleTask,
  ScheduleDiscipline,
} from './types'

export async function parseExcelScheduleFile({
  file,
  projectId,
  discipline,
  deliveryPackageId,
  scheduleVersionId,
}: {
  file: File
  projectId: number | string
  discipline: ScheduleDiscipline
  deliveryPackageId: string
  scheduleVersionId?: string | null
}): Promise<ImportedScheduleTask[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(buffer), {
    type: 'array',
  })

  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []

  const sheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  })

  return rows
    .filter(row => Boolean(row['Task Name'] || row.Name))
    .map((row, index) => ({
      project_id: projectId,
      discipline,
      delivery_package_id: deliveryPackageId,
      schedule_version_id: scheduleVersionId || null,
      schedule_source: 'Imported' as const,
      task_number: Number(row['Task Number'] || index + 1),
      name: String(row['Task Name'] || row.Name),
      phase:
        String(row.Phase || '').trim() ||
        `Imported ${discipline} Schedule`,
      start_date: excelDateToISO(row['Start Date']),
      finish_date: excelDateToISO(row['Finish Date']),
      planned_start: excelDateToISO(row['Start Date']),
      planned_finish: excelDateToISO(row['Finish Date']),
      dependencies: row.Dependencies
        ? String(row.Dependencies)
        : null,
      responsible: row.Responsible
        ? String(row.Responsible)
        : null,
      status: String(row.Status || 'Not Started'),
      rag: String(row.RAG || ''),
      progress_pct: Number(row.Progress || 0),
      procurement_deadline: excelDateToISO(
        row['Procurement Deadline']
      ),
      approval_deadline: excelDateToISO(
        row['Approval Deadline']
      ),
      notes: row.Notes ? String(row.Notes) : null,
      is_milestone:
        row.Milestone === true ||
        String(row.Milestone || '').toUpperCase() === 'YES',
    }))
}
