import { useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import {
  Upload,
  Plus,
  List,
  BarChart2,
  Flag,
  Search,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import { canEditSchedule } from '@/lib/permissions'
import { Fragment, useEffect, useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useQualityGates } from '@/hooks/useData'
import { fdate, urgencyColor, computeRAG } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import type { Task } from '@/types'
import TaskModal from '@/components/modules/schedule/TaskModal'
import GanttView from '@/components/modules/schedule/GanttView'
import MilestoneTracker from '@/components/modules/schedule/MilestoneTracker'
import { useAuthStore } from '@/store/auth'


type View = 'list' | 'gantt' | 'milestones'

type DisciplineTab =
  | 'Overall'
  | 'Housebuild'
  | 'MEP'
  | 'Infrastructure'

type ScheduleDiscipline = Exclude<DisciplineTab, 'Overall'>

const DISCIPLINE_TABS: DisciplineTab[] = [
  'Overall',
  'Housebuild',
  'MEP',
  'Infrastructure',
]

export default function SchedulePage() {
 const {
  projectId,
  projectName,
  projectOwnerEmail,
  housebuildOwnerEmail,
  mepOwnerEmail,
  infrastructureOwnerEmail,
} = useProjectStore()

 const role = useMembershipStore(state => state.role)
const assignedProjectIds = useMembershipStore(
  state => state.projectIds
)
  const { user } = useAuthStore()

  const [disciplineTab, setDisciplineTab] =
    useState<DisciplineTab>('Overall')

  const [view, setView] = useState<View>('list')
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('All')
  const [ragFilter, setRagFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalTask, setModalTask] = useState<Task | null | 'new'>(null)

  const queryClient = useQueryClient()
  const { data: allTasks = [], isLoading } = useTasks()
  const { data: qualityGates = [] } = useQualityGates()

  const currentEmail = user?.email?.toLowerCase().trim() || ''

  const permissionContext = {
  isOverallProjectOwner:
    !!currentEmail &&
    currentEmail === projectOwnerEmail?.toLowerCase().trim(),

  isHousebuildOwner:
    !!currentEmail &&
    currentEmail === housebuildOwnerEmail?.toLowerCase().trim(),

  isMEPOwner:
    !!currentEmail &&
    currentEmail === mepOwnerEmail?.toLowerCase().trim(),

  isInfrastructureOwner:
    !!currentEmail &&
    currentEmail === infrastructureOwnerEmail?.toLowerCase().trim(),
}

  const activeDiscipline =
    disciplineTab === 'Overall'
      ? undefined
      : (disciplineTab as ScheduleDiscipline)
const isAssignedProjectOwner =
  !!projectId &&
  assignedProjectIds.includes(projectId)

const canEditDisciplineSchedule =
  disciplineTab !== 'Overall' &&
  (
    ['workspace_admin', 'admin', 'pmo'].includes(role || '') ||
    (
      isAssignedProjectOwner &&
      canEditSchedule(
        role,
        activeDiscipline,
        permissionContext
      )
    )
  )
  const today = new Date()

  const projectTasks: Task[] = allTasks.filter(
    (task: Task) => task.project_id === projectId
  )

  const tasks: Task[] =
    disciplineTab === 'Overall'
      ? projectTasks
      : projectTasks.filter(
          task => ((task as any).discipline || 'Housebuild') === disciplineTab
        )

  const PHASES: string[] = [
    'All',
    ...(Array.from(
      new Set(
        tasks
          .map((task: Task) => task.phase)
          .filter((phase): phase is string => Boolean(phase))
      )
    ) as string[]),
  ]

  useEffect(() => {
    setPhaseFilter('All')
    setRagFilter('')
    setStatusFilter('')
    setSearch('')
  }, [disciplineTab])

  const excelDateToISO = (value: any) => {
    if (!value) return null

    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value)
      if (!date) return null

      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(
        date.d
      ).padStart(2, '0')}`
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null

    return parsed.toISOString().slice(0, 10)
  }

  const handleBackupUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!canEditDisciplineSchedule || !activeDiscipline) {
      event.target.value = ''
      return
    }

    const file = event.target.files?.[0]

    if (!file || !projectId) {
      alert('No project selected.')
      return
    }

    const fileName = `${projectId}/schedule-backups/${activeDiscipline}/${Date.now()}-${file.name}`

    const { error } = await supabase.storage
      .from('project-files')
      .upload(fileName, file)

    if (error) {
      alert(error.message)
      return
    }

    alert(`${activeDiscipline} schedule backup uploaded successfully.`)
    event.target.value = ''
  }

  const handleScheduleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!canEditDisciplineSchedule || !activeDiscipline) {
      event.target.value = ''
      return
    }

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

      const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
      })

      if (!rows.length) {
        alert('No rows found in the Excel file.')
        return
      }

      const tasksToInsert = rows
        .filter(row => row['Task Name'] || row['Name'])
        .map((row, index) => ({
          project_id: projectId,
          discipline: activeDiscipline,
          schedule_source: 'Imported',
          task_number: Number(row['Task Number'] || index + 1),
          name: row['Task Name'] || row['Name'],
          phase: row['Phase'] || `Imported ${activeDiscipline} Schedule`,
          start_date: excelDateToISO(row['Start Date']),
          finish_date: excelDateToISO(row['Finish Date']),
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
        alert(
          'No valid tasks found. Make sure your Excel has a Task Name column.'
        )
        return
      }

      const { error } = await supabase.from('tasks').insert(tasksToInsert)

      if (error) {
        alert(error.message)
        return
      }

      await queryClient.invalidateQueries({
        queryKey: ['tasks', projectId],
      })

      alert(
        `${tasksToInsert.length} ${activeDiscipline} Excel tasks imported successfully.`
      )

      event.target.value = ''
    }

    reader.readAsArrayBuffer(file)
  }

  const handleXmlScheduleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!canEditDisciplineSchedule || !activeDiscipline) {
      event.target.value = ''
      return
    }

    const file = event.target.files?.[0]

    if (!file || !projectId) {
      alert('No project selected.')
      return
    }

    const text = await file.text()
    const parser = new DOMParser()
    const xml = parser.parseFromString(text, 'text/xml')

    const parseError = xml.getElementsByTagName('parsererror')[0]

    if (parseError) {
      alert('Invalid XML file. Please export again from MS Project as XML.')
      event.target.value = ''
      return
    }

    const xmlTasks = Array.from(xml.getElementsByTagName('Task'))

    const tasksToInsert = xmlTasks
      .map((taskNode, index) => {
        const getText = (tag: string) =>
          taskNode.getElementsByTagName(tag)[0]?.textContent || ''

        const name = getText('Name')?.trim()
        const uid = getText('UID')
        const id = getText('ID')
        const outlineLevel = getText('OutlineLevel')
        const start = getText('Start')
        const finish = getText('Finish')
        const milestone = getText('Milestone')
        const percentComplete = Number(getText('PercentComplete') || 0)

        if (!name) return null

        return {
          project_id: projectId,
          discipline: activeDiscipline,
          schedule_source: 'Imported',
          task_number: Number(id || uid || index + 1),
          name,
          phase:
            outlineLevel === '1'
              ? name
              : `Imported ${activeDiscipline} MS Project Schedule`,
          start_date: start ? start.slice(0, 10) : null,
          finish_date: finish ? finish.slice(0, 10) : null,
          dependencies: null,
          responsible: null,
          status:
            percentComplete >= 100
              ? 'Completed'
              : percentComplete > 0
              ? 'In Progress'
              : 'Not Started',
          rag: '',
          progress_pct: percentComplete,
          procurement_deadline: null,
          approval_deadline: null,
          notes: `Imported from MS Project XML. UID: ${uid || 'N/A'}`,
          is_milestone:
            milestone === '1' || milestone?.toLowerCase() === 'true',
        }
      })
      .filter(Boolean)

    if (!tasksToInsert.length) {
      alert('No valid tasks found in the XML file.')
      event.target.value = ''
      return
    }

    const { error } = await supabase
      .from('tasks')
      .insert(tasksToInsert as any[])

    if (error) {
      alert(error.message)
      return
    }

    await queryClient.invalidateQueries({
      queryKey: ['tasks', projectId],
    })

    alert(
      `${tasksToInsert.length} ${activeDiscipline} MS Project XML tasks imported successfully.`
    )

    event.target.value = ''
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
    .filter((task: Task) => {
      const taskName = task.name || ''
      const taskNumber = String(task.task_number || '')

      if (
        search &&
        !taskName.toLowerCase().includes(search.toLowerCase()) &&
        !taskNumber.includes(search)
      ) {
        return false
      }

      if (phaseFilter !== 'All' && task.phase !== phaseFilter) return false
      if (ragFilter && getRag(task) !== ragFilter) return false

      if (statusFilter && (task.status || 'Not Started') !== statusFilter) {
        return false
      }

      return true
    })
    .sort(
      (a: Task, b: Task) =>
        Number(a.task_number || 0) - Number(b.task_number || 0)
    )

  const grouped: Record<string, Task[]> = PHASES.slice(1).reduce(
    (acc: Record<string, Task[]>, phase: string) => {
      const phaseTasks = filtered.filter((task: Task) => task.phase === phase)

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

  const isTaskLocked = (task: Task) => {
    return qualityGates.some(
      gate =>
        gate.blocks_task_id === task.id &&
        gate.status !== 'Approved' &&
        gate.status !== 'Reapproved'
    )
  }

  const getBlockingGate = (task: Task) => {
    return qualityGates.find(
      gate =>
        gate.blocks_task_id === task.id &&
        gate.status !== 'Approved' &&
        gate.status !== 'Reapproved'
    )
  }

  const openTaskModal = (task: Task | 'new') => {
    if (!canEditDisciplineSchedule) return
    setModalTask(task)
  }

  return (
    <div className="space-y-4">
      {!canEditDisciplineSchedule && (
        <div className="card p-3 text-[11px] text-amber-400 border border-amber-500/20">
          {disciplineTab === 'Overall'
            ? 'Overall schedule is auto-generated from Housebuild, MEP, and Infrastructure schedules. It cannot be edited directly.'
            : 'Schedule View Only — you can view this discipline schedule, but you cannot upload, add, or edit tasks.'}
        </div>
      )}

      <div>
        <div className="text-xl font-semibold text-[#ede8de]">
          {disciplineTab === 'Overall'
            ? 'Master Schedule'
            : `${disciplineTab} Schedule`}
        </div>

        <div className="text-[11px] text-[#6e7d8c] mt-1">{projectName}</div>

        <div className="flex gap-2 mt-3 flex-wrap">
          {DISCIPLINE_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setDisciplineTab(tab)}
              className={`btn-sm btn ${
                disciplineTab === tab ? 'btn-gold' : 'btn-ghost'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-[#c49e48]' },
          { label: 'Completed', value: stats.done, color: 'text-emerald-400' },
          { label: 'In Progress', value: stats.inProg, color: 'text-amber-400' },
          { label: 'RED', value: stats.red, color: 'text-red-400' },
          { label: 'AMBER', value: stats.amber, color: 'text-amber-400' },
        ].map(item => (
          <div key={item.label} className="card p-3">
            <div className={`font-display text-3xl font-bold ${item.color}`}>
              {item.value}
            </div>

            <div className="text-[9px] text-[#6e7d8c] uppercase tracking-widest mt-0.5">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-md overflow-hidden border border-white/[0.08]">
          {(
            [
              ['list', List, 'List'],
              ['gantt', BarChart2, 'Gantt'],
              ['milestones', Flag, 'Milestones'],
            ] as [View, React.ElementType, string][]
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors ${
                view === value
                  ? 'bg-[#c49e48] text-[#0c1014]'
                  : 'bg-[#1c2a36] text-[#6e7d8c] hover:text-[#bfb9ae]'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6e7d8c]"
          />

          <input
            className="form-control pl-7 text-[12px] py-1.5"
            placeholder="Search tasks…"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={phaseFilter}
          onChange={event => setPhaseFilter(event.target.value)}
        >
          {PHASES.map(phase => (
            <option key={phase}>{phase}</option>
          ))}
        </select>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={ragFilter}
          onChange={event => setRagFilter(event.target.value)}
        >
          <option value="">All RAG</option>
          <option value="RED">🔴 Red</option>
          <option value="AMBER">🟡 Amber</option>
          <option value="GREEN">🟢 Green</option>
        </select>

        <select
          className="form-control text-[12px] py-1.5 w-auto"
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
        >
          <option value="">All Status</option>

          {[
            'Not Started',
            'In Progress',
            'Completed',
            'On Hold',
            'Blocked',
          ].map(status => (
            <option key={status}>{status}</option>
          ))}
        </select>

        {canEditDisciplineSchedule && (
          <div className="flex gap-2 ml-auto">
            <label className="btn-ghost btn-sm btn cursor-pointer">
              <Upload size={13} />
              Import Excel
              <input
                type="file"
                hidden
                accept=".xlsx,.xls,.csv"
                onChange={handleScheduleUpload}
              />
            </label>

            <label className="btn-ghost btn-sm btn cursor-pointer">
              <Upload size={13} />
              Import MS Project XML
              <input
                type="file"
                hidden
                accept=".xml"
                onChange={handleXmlScheduleUpload}
              />
            </label>

            <label className="btn-ghost btn-sm btn cursor-pointer">
              <Upload size={13} />
              Upload PDF/MPP Backup
              <input
                type="file"
                hidden
                accept=".pdf,.mpp"
                onChange={handleBackupUpload}
              />
            </label>

            <button
              className="btn-gold btn-sm btn"
              onClick={() => openTaskModal('new')}
            >
              <Plus size={13} />
              Add Task
            </button>
          </div>
        )}
      </div>

      {view === 'gantt' && (
        <GanttView
          tasks={filtered}
          onTaskClick={(task: Task) => {
            if (canEditDisciplineSchedule) openTaskModal(task)
          }}
        />
      )}

      {view === 'milestones' && <MilestoneTracker tasks={tasks} />}

      {view === 'list' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Task Name</th>
                  {disciplineTab === 'Overall' && <th>Discipline</th>}
                  <th className="hide-mobile">Deps</th>
                  <th>Start</th>
                  <th>Finish</th>
                  <th className="hide-mobile">Dur</th>
                  <th className="hide-mobile">Proc Deadline</th>
                  <th className="hide-mobile">Appr Deadline</th>
                  <th>RAG</th>
                  <th>Status</th>
                  <th className="hide-mobile">Progress</th>
                  <th className="hide-mobile">Responsible</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={disciplineTab === 'Overall' ? 14 : 13}
                      className="text-center py-8 text-[#6e7d8c]"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : Object.entries(grouped).length === 0 ? (
                  <tr>
                    <td
                      colSpan={disciplineTab === 'Overall' ? 14 : 13}
                      className="text-center py-8 text-[#6e7d8c]"
                    >
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  Object.entries(grouped).map(([phase, phaseTasks]) => (
                    <Fragment key={phase}>
                      <tr className="bg-[#1c2a36]">
                        <td
                          colSpan={disciplineTab === 'Overall' ? 14 : 13}
                          className="font-display text-[12px] font-semibold text-[#ede8de] py-2"
                        >
                          {phase}
                        </td>
                      </tr>

                      {phaseTasks.map((task: Task) => {
                        const rag =
                          task.status === 'Completed'
                            ? ''
                            : getRag(task) || computeRAG(task)

                        const procDays = task.procurement_deadline
                          ? differenceInDays(
                              new Date(task.procurement_deadline),
                              today
                            )
                          : null

                        const apprDays = task.approval_deadline
                          ? differenceInDays(
                              new Date(task.approval_deadline),
                              today
                            )
                          : null

                        return (
                          <tr key={task.id}>
                            <td className="font-mono text-[#6e7d8c] text-[10px]">
                              #{task.task_number}
                            </td>

                            <td className="font-medium text-[#ede8de] max-w-[200px]">
                              {task.name}

                              {task.is_milestone && (
                                <span className="ml-1 text-[#c49e48]">⬦</span>
                              )}
                            </td>

                            {disciplineTab === 'Overall' && (
                              <td>
                                <span className="badge badge-gold">
                                  {(task as any).discipline || 'Housebuild'}
                                </span>
                              </td>
                            )}

                            <td className="hide-mobile font-mono text-[10px] text-[#6e7d8c]">
                              {task.dependencies || '—'}
                            </td>

                            <td>{fdate(task.start_date)}</td>
                            <td>{fdate(task.finish_date)}</td>

                            <td className="hide-mobile text-center">
                              {task.duration_days || '—'}
                            </td>

                            <td className="hide-mobile">
                              {task.procurement_deadline ? (
                                <span className={urgencyColor(procDays)}>
                                  {fdate(task.procurement_deadline)}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>

                            <td className="hide-mobile">
                              {task.approval_deadline ? (
                                <span className={urgencyColor(apprDays)}>
                                  {fdate(task.approval_deadline)}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>

                            <td>
                              {rag ? (
                                <span
                                  className={`badge ${
                                    rag === 'RED'
                                      ? 'badge-red'
                                      : rag === 'AMBER'
                                      ? 'badge-amber'
                                      : 'badge-green'
                                  }`}
                                >
                                  {rag}
                                </span>
                              ) : (
                                <span className="badge badge-green">DONE</span>
                              )}
                            </td>

                            <td>
                              <span
                                className={`badge ${
                                  task.status === 'Completed'
                                    ? 'badge-green'
                                    : task.status === 'In Progress'
                                    ? 'badge-amber'
                                    : task.status === 'Blocked'
                                    ? 'badge-red'
                                    : 'badge-muted'
                                }`}
                              >
                                {task.status}
                              </span>
                            </td>

                            <td className="hide-mobile">
                              <div className="flex items-center gap-2">
                                <div className="h-1 w-16 bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#c49e48] rounded-full"
                                    style={{
                                      width: `${getTaskProgress(task)}%`,
                                    }}
                                  />
                                </div>

                                <span className="text-[10px] text-[#6e7d8c]">
                                  {getTaskProgress(task)}%
                                </span>
                              </div>
                            </td>

                            <td className="hide-mobile text-[#6e7d8c] text-[11px]">
                              {task.responsible || '—'}
                            </td>

                            <td>
                              {isTaskLocked(task) ? (
                                <div className="flex flex-col gap-1">
                                  <span className="badge badge-red">
                                    LOCKED
                                  </span>

                                  <span className="text-[9px] text-[#6e7d8c] max-w-[120px]">
                                    Pending:{' '}
                                    {getBlockingGate(task)?.gate_name ||
                                      'Quality Gate'}
                                  </span>
                                </div>
                              ) : canEditDisciplineSchedule ? (
                                <button
                                  className="tbl-action"
                                  onClick={() => openTaskModal(task)}
                                >
                                  Edit
                                </button>
                              ) : (
                                <span className="text-[10px] text-[#6e7d8c]">
                                  View only
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalTask !== null && canEditDisciplineSchedule && (
        <TaskModal
          task={modalTask === 'new' ? null : modalTask}
          onClose={() => setModalTask(null)}
        />
      )}
    </div>
  )
}
