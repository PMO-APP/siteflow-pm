import { useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { Upload, Plus, List, BarChart2, Flag, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { Fragment, useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { fdate, urgencyColor, computeRAG } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import type { Task } from '@/types'
import TaskModal from '@/components/modules/schedule/TaskModal'
import GanttView from '@/components/modules/schedule/GanttView'
import MilestoneTracker from '@/components/modules/schedule/MilestoneTracker'

type View = 'list' | 'gantt' | 'milestones'

export default function SchedulePage() {
  const { projectId, projectName } = useProjectStore()
  const queryClient = useQueryClient()
  const { data: allTasks = [], isLoading } = useTasks()

  const tasks: Task[] = allTasks.filter(
    (task: Task) => task.project_id === projectId
  )

  const PHASES: string[] = [
    'All',
    ...Array.from(
      new Set(tasks.map(task => task.phase).filter(Boolean))
    ) as string[],
  ]

  const [view, setView] = useState<View>('list')
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('All')
  const [ragFilter, setRagFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalTask, setModalTask] = useState<Task | null | 'new'>(null)

  const today = new Date()

  const excelDateToISO = (value: any) => {
    if (!value) return null

    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value)
      if (!date) return null
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toISOString().slice(0, 10)
  }

  const handlePdfUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file || !projectId) {
      alert('No project selected.')
      return
    }

    const fileName = `${projectId}/${Date.now()}-${file.name}`

    const { error } = await supabase.storage
      .from('project-files')
      .upload(fileName, file)

    if (error) {
      alert(error.message)
      return
    }

    alert('PDF uploaded successfully.')
    event.target.value = ''
  }

  const handleScheduleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]

    if (!file || !projectId) {
      alert('No project selected.')
      return
    }

    const reader = new FileReader()

    reader.onload = async e => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]

      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      const tasksToInsert = rows
        .filter(row => row['Task Name'] || row['Name'])
        .map((row, index) => ({
          project_id: projectId,
          task_number: Number(row['Task Number'] || index + 1),
          name: row['Task Name'] || row['Name'],
          phase: row['Phase'] || 'General',
          start_date: excelDateToISO(row['Start Date']),
          finish_date: excelDateToISO(row['Finish Date']),
          duration_days: row['Duration'] ? Number(row['Duration']) : null,
          dependencies: row['Dependencies'] || null,
          responsible: row['Responsible'] || null,
          status: row['Status'] || 'Not Started',
          rag: row['RAG'] || '',
          progress_pct: Number(row['Progress'] || 0),
          procurement_deadline: excelDateToISO(row['Procurement Deadline']),
          approval_deadline: excelDateToISO(row['Approval Deadline']),
          notes: row['Notes'] || null,
          is_milestone:
            row['Milestone'] === true ||
            row['Milestone'] === 'Yes' ||
            row['Milestone'] === 'YES',
        }))

      if (!tasksToInsert.length) {
        alert('No valid tasks found. Make sure your Excel has a Task Name column.')
        return
      }

      const { error } = await supabase.from('tasks').insert(tasksToInsert)

      if (error) {
        alert(error.message)
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      alert(`${tasksToInsert.length} tasks uploaded successfully.`)
      event.target.value = ''
    }

    reader.readAsArrayBuffer(file)
  }

  const getTaskProgress = (task: Task): number => {
    if (task.status === 'Completed') return 100
    if (task.status === 'Not Started') return 0
    return Number(task.progress_pct || 0)
  }

  const getRag = (task: Task): string => {
    if (task.status === 'Completed') return 'DONE'
    if (!task.finish_date) return 'GREEN'

    const finish = new Date(task.finish_date)
    if (Number.isNaN(finish.getTime())) return 'GREEN'

    const daysLeft = differenceInDays(finish, today)

    if (today > finish && getTaskProgress(task) < 100) return 'RED'
    if (daysLeft <= 3) return 'AMBER'
    return 'GREEN'
  }

  const filtered: Task[] = tasks
    .filter(task => {
      const taskName = task.name || ''
      const taskNumber = String(task.task_number || '')

      if (
        search &&
        !taskName.toLowerCase().includes(search.toLowerCase()) &&
        !taskNumber.includes(search)
      ) return false

      if (phaseFilter !== 'All' && task.phase !== phaseFilter) return false
      if (ragFilter && getRag(task) !== ragFilter) return false
      if (statusFilter && (task.status || 'Not Started') !== statusFilter) return false

      return true
    })
    .sort((a, b) => Number(a.task_number || 0) - Number(b.task_number || 0))

  const grouped: Record<string, Task[]> = PHASES.slice(1).reduce(
    (acc: Record<string, Task[]>, phase: string) => {
      const phaseTasks = filtered.filter(task => task.phase === phase)
      if (phaseTasks.length) acc[phase] = phaseTasks
      return acc
    },
    {}
  )

  const stats = {
    total: tasks.length,
    done: tasks.filter(task => task.status === 'Completed').length,
    inProg: tasks.filter(task => task.status === 'In Progress').length,
    red: tasks.filter(task => getRag(task) === 'RED').length,
    amber: tasks.filter(task => getRag(task) === 'AMBER').length,
  }

  return (
    <div className="space-y-4">
      {/* keep the rest of your existing JSX from <div> Master Schedule downward */}
    </div>
  )
}
