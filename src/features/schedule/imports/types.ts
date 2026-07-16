export type ScheduleDiscipline =
  | 'Housebuild'
  | 'MEP'
  | 'Infrastructure'

export type ImportedScheduleTask = {
  project_id: number | string
  discipline: ScheduleDiscipline
  schedule_source: 'Imported'
  task_number: number
  name: string
  phase: string
  start_date: string | null
  finish_date: string | null
  planned_start: string | null
  planned_finish: string | null
  dependencies: string | null
  responsible: string | null
  status: string
  rag: string
  progress_pct: number
  procurement_deadline: string | null
  approval_deadline: string | null
  notes: string | null
  is_milestone: boolean
}
