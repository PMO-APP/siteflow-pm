import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ChevronDown, ChevronUp, Save } from 'lucide-react'
import { EnterprisePageHero, EnterpriseNotice } from '@/components/ui/enterprise'
import { supabase } from '@/lib/supabase'
import { taskVisibleInDiscipline } from '@/features/schedule/disciplineProjection'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import { useAuthStore } from '@/store/auth'
import { useAccessSession } from '@/access/AccessSessionProvider'
import { fdate } from '@/lib/utils'

const TABS = ['Execution', 'Schedule', 'Progress', 'Delays', 'Forecast', 'Recovery', 'History']

type DisciplineTab = 'Overall' | 'Housebuild' | 'Mechanical' | 'Electrical' | 'MEP' | 'Infrastructure'

const DISCIPLINE_TABS: DisciplineTab[] = [
  'Overall',
  'Housebuild',
  'Mechanical',
  'Electrical',
  'MEP',
  'Infrastructure',
]

const DELAY_REASONS = [
  '',
  'Material Delay',
  'Heavy Rain',
  'Variation',
  'Awaiting Drawing',
  'Awaiting Approval',
  'Cashflow',
  'Labour Shortage',
  'Equipment Issue',
  'Client Instruction',
  'Other',
]

const RECOVERY_ACTIONS = [
  '',
  'Additional Labour',
  'Weekend Work',
  'Night Shift',
  'Additional Equipment',
  'Resequencing',
  'Expedited Procurement',
  'Awaiting Approval',
  'No Recovery Plan',
]

function getTaskName(task: any) {
  return task.name || 'Untitled Activity'
}

function getProgress(task: any) {
  return Number(task.progress_pct || 0)
}

function getPlannedStart(task: any) {
  return task.planned_start || task.start_date
}

function getPlannedFinish(task: any) {
  return task.planned_finish || task.finish_date
}

function getStatus(task: any) {
  const progress = getProgress(task)
  const today = new Date().toISOString().slice(0, 10)
  const finish = getPlannedFinish(task)

  if (task.is_blocked) return 'Blocked'
  if (task.is_on_hold) return 'On Hold'
  if (progress >= 100 || task.status === 'Completed') return 'Completed'
  if (progress > 0 && finish && finish < today) return 'Behind'
  if (progress > 0 || task.status === 'In Progress') return 'In Progress'
  return 'Not Started'
}

function statusColor(status: string) {
  if (status === 'Completed') return 'text-emerald-400'
  if (status === 'Behind' || status === 'Blocked') return 'text-red-400'
  if (status === 'On Hold') return 'text-amber-400'
  if (status === 'In Progress') return 'text-blue-400'
  return 'text-slate-400'
}

function getLogActor(log: any) {
  return (
    log.updated_by_name ||
    log.updated_by_email ||
    log.updated_by_role ||
    log.updated_by ||
    '—'
  )
}

type ProjectControlsCache = {
  tasks: any[]
  schedules: any[]
  logs: any[]
}

function projectControlsCacheKey(projectId: number) {
  return `pmocorex:project-controls:${projectId}`
}

function readProjectControlsCache(projectId: number): ProjectControlsCache | null {
  try {
    const raw = sessionStorage.getItem(projectControlsCacheKey(projectId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    }
  } catch {
    return null
  }
}

function writeProjectControlsCache(projectId: number, value: ProjectControlsCache) {
  try {
    sessionStorage.setItem(projectControlsCacheKey(projectId), JSON.stringify(value))
  } catch {
    // Cache is an optimisation only; Supabase remains the source of truth.
  }
}

export default function ProjectControlsPage() {
  const { projectId, projectName } = useProjectStore()
  const role = useMembershipStore(state => state.role)
  const { user } = useAuthStore()
  const { can } = useAccessSession()

  const [activeTab, setActiveTab] = useState('Execution')
  const [disciplineTab, setDisciplineTab] = useState<DisciplineTab>('Overall')
  const disciplinePermission = ['Mechanical', 'Electrical'].includes(disciplineTab) ? 'mep' : disciplineTab === 'Overall' ? 'overall' : disciplineTab.toLowerCase()
  const canEdit = Boolean(projectId) && can('project.edit', { scopeType: 'project', scopeId: projectId, discipline: disciplinePermission })
  const canUploadSchedule = Boolean(projectId) && can('schedule.import', { scopeType: 'project', scopeId: projectId, discipline: 'overall' })

  const [allTasks, setAllTasks] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, any>>({})
  const loadRequestRef = useRef(0)

  useEffect(() => {
    const requestId = ++loadRequestRef.current

    if (!projectId) {
      setAllTasks([])
      setSchedules([])
      setLogs([])
      setLoading(false)
      return
    }

    // Rehydrate the last successful project-control payload immediately.
    // A background fetch below then refreshes it from Supabase.
    const cached = readProjectControlsCache(projectId)
    if (cached) {
      setAllTasks(cached.tasks)
      setSchedules(cached.schedules)
      setLogs(cached.logs)
      setLoading(false)
    } else {
      setAllTasks([])
      setSchedules([])
      setLogs([])
      setLoading(true)
    }

    void loadData(projectId, requestId, !!cached)
  }, [projectId])

  const tasks = allTasks.filter(task => taskVisibleInDiscipline(task as any, disciplineTab))

  async function loadData(
    targetProjectId = projectId,
    requestId = ++loadRequestRef.current,
    hasCachedData = allTasks.length > 0
  ) {
    if (!targetProjectId) {
      setLoading(false)
      return
    }

    if (!hasCachedData) setLoading(true)
    setNotice('')

    let freshTasks: any[] | null = null

    try {
      // Tasks are the primary Project Controls dataset. Do not make the page
      // wait for Schedule or History before showing execution data.
      const taskResult = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', targetProjectId)
        .order('task_number', { ascending: true })

      if (requestId !== loadRequestRef.current) return

      if (taskResult.error) {
        setNotice(taskResult.error.message)
      } else {
        freshTasks = taskResult.data || []
        setAllTasks(freshTasks)
      }

      // The execution table can render as soon as tasks arrive. Secondary
      // datasets continue loading without blocking the whole page.
      setLoading(false)

      try {
        const [scheduleResult, logResult] = await Promise.all([
          supabase
            .from('schedule_revisions')
            .select('*')
            .eq('project_id', targetProjectId)
            .order('created_at', { ascending: false }),

          // No join here. Supabase threw a relationship error because
          // task_progress_logs.updated_by has no FK relationship to profiles.
          supabase
            .from('task_progress_logs')
            .select('*')
            .eq('project_id', targetProjectId)
            .order('created_at', { ascending: false }),
        ])

        if (requestId !== loadRequestRef.current) return

        if (scheduleResult.error) setNotice(scheduleResult.error.message)
        if (logResult.error) setNotice(logResult.error.message)

        const nextSchedules = scheduleResult.data || []
        const nextLogs = logResult.data || []
        setSchedules(nextSchedules)
        setLogs(nextLogs)

        writeProjectControlsCache(targetProjectId, {
          tasks: freshTasks ?? allTasks,
          schedules: nextSchedules,
          logs: nextLogs,
        })
      } catch (secondaryError: any) {
        if (requestId === loadRequestRef.current) {
          setNotice(secondaryError?.message || 'Some project-control details could not be refreshed.')
          if (freshTasks) {
            writeProjectControlsCache(targetProjectId, {
              tasks: freshTasks,
              schedules,
              logs,
            })
          }
        }
      }
    } catch (error: any) {
      if (requestId === loadRequestRef.current) {
        setNotice(error?.message || 'Project controls could not be refreshed. Showing the latest available data.')
      }
    } finally {
      // Never leave the page trapped on a loading screen after a rejected
      // request. Cached/previous data remains visible if refresh fails.
      if (requestId === loadRequestRef.current) setLoading(false)
    }
  }

  function updateEdit(taskId: string, key: string, value: any) {
    if (!canEdit) return

    setEdits(current => ({
      ...current,
      [taskId]: {
        ...(current[taskId] || {}),
        [key]: value,
      },
    }))
  }

  async function saveTaskProgress(task: any) {
    if (!canEdit) {
      setNotice(
        'View only. You can see this project, but only its assigned owner or an active delegate can update this discipline.'
      )
      return
    }

    const taskId = task.id
    const edit = edits[taskId] || {}
    const previousProgress = getProgress(task)
    const newProgress = Number(edit.progress_pct ?? previousProgress)

    if (newProgress < 0 || newProgress > 100) {
      setNotice('Progress must be between 0 and 100.')
      return
    }

    setSavingId(taskId)
    setNotice('')

    const today = new Date().toISOString().slice(0, 10)

    const payload: any = {
      progress_pct: newProgress,
      delay_reason: edit.delay_reason ?? task.delay_reason ?? null,
      recovery_action: edit.recovery_action ?? task.recovery_action ?? null,
      progress_comments: edit.progress_comments ?? task.progress_comments ?? null,
      is_on_hold: edit.is_on_hold ?? task.is_on_hold ?? false,
      is_blocked: edit.is_blocked ?? task.is_blocked ?? false,
      status:
        newProgress >= 100
          ? 'Completed'
          : newProgress > 0
          ? 'In Progress'
          : 'Not Started',
      updated_at: new Date().toISOString(),
    }

    if (previousProgress <= 0 && newProgress > 0 && !task.actual_start) {
      payload.actual_start = today
    }

    if (previousProgress < 100 && newProgress >= 100 && !task.actual_finish) {
      payload.actual_finish = today
    }

    const { error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', taskId)

    if (error) {
      setNotice(error.message)
      setSavingId(null)
      return
    }

    // task_progress_logs is written automatically by the database trigger whenever progress_pct changes.

    setEdits(current => {
      const copy = { ...current }
      delete copy[taskId]
      return copy
    })

    setSavingId(null)
    await loadData()
  }

  const metrics = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(task => getProgress(task) >= 100).length
    const delayed = tasks.filter(task => getStatus(task) === 'Behind').length
    const blocked = tasks.filter(task => task.is_blocked).length
    const onHold = tasks.filter(task => task.is_on_hold).length

    const overallProgress =
      total === 0 ? 0 : Math.round((completed / total) * 100)

    return { total, completed, delayed, blocked, onHold, overallProgress }
  }, [tasks])

  const delayedTasks = tasks.filter(task =>
    ['Behind', 'Blocked', 'On Hold'].includes(getStatus(task))
  )

  const activeSchedule = schedules.find(schedule => schedule.is_active)

  return (
    <div className="space-y-6">
      <EnterprisePageHero
        eyebrow="Project governance"
        title="Project Control Centre"
        description="Control schedule performance, progress, delay ownership, recovery actions and delivery history from one operational workspace."
        projectName={projectName || 'No project selected'}
      >
        {!canEdit && <div className="mt-5"><EnterpriseNotice tone="warning">View only. You can see this project, but only its assigned owner or an active delegate can update this discipline.</EnterpriseNotice></div>}
        <div className="mt-5 flex flex-wrap gap-2">
          {DISCIPLINE_TABS.map(tab => <button key={tab} onClick={() => setDisciplineTab(tab)} className={`rounded-xl px-4 py-2.5 text-xs font-semibold transition ${disciplineTab === tab ? 'bg-[#123a60] text-white' : 'border border-[#dfe3e7] bg-white text-[#536170] hover:border-[#9da9b3]'}`}>{tab === 'Overall' ? 'Master' : tab}</button>)}
        </div>
      </EnterprisePageHero>

      {notice && <EnterpriseNotice>{notice}</EnterpriseNotice>}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Metric title="Tasks" value={metrics.total} />
        <Metric title="Overall Progress" value={`${metrics.overallProgress}%`} />
        <Metric title="Completed" value={metrics.completed} />
        <Metric title="Delayed" value={metrics.delayed} />
        <Metric title="Blocked" value={metrics.blocked} />
        <Metric title="On Hold" value={metrics.onHold} />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`btn btn-sm ${
              activeTab === tab ? 'btn-gold' : 'btn-ghost'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-6 text-slate-400">
          Loading project controls…
        </div>
      ) : (
        <>
          {activeTab === 'Execution' && (
            <ExecutionTab
              tasks={tasks}
              edits={edits}
              updateEdit={updateEdit}
              saveTaskProgress={saveTaskProgress}
              savingId={savingId}
              canEdit={canEdit}
            />
          )}

          {activeTab === 'Schedule' && (
            <ScheduleTab
              schedules={schedules}
              canUpload={canUploadSchedule}
            />
          )}

          {activeTab === 'Progress' && (
            <ProgressTab tasks={tasks} metrics={metrics} />
          )}

          {activeTab === 'Delays' && <DelaysTab tasks={delayedTasks} />}

          {activeTab === 'Forecast' && (
            <ForecastTab activeSchedule={activeSchedule} tasks={tasks} />
          )}

          {activeTab === 'Recovery' && <RecoveryTab tasks={delayedTasks} />}

          {activeTab === 'History' && (
            <HistoryTab
              logs={logs}
              tasks={allTasks}
              disciplineTab={disciplineTab}
            />
          )}
        </>
      )}
    </div>
  )
}

function ExecutionTab({
  tasks,
  edits,
  updateEdit,
  saveTaskProgress,
  savingId,
  canEdit,
}: any) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleExpanded = (taskId: string) => {
    setExpandedRows(current => ({
      ...current,
      [taskId]: !current[taskId],
    }))
  }

  if (!tasks.length) {
    return (
      <div className="card p-8 text-center text-[#6e7d8c]">
        No schedule tasks found for this discipline.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
          View Only. Only Project Owners, PMO and Administrators can update project controls.
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="w-full overflow-hidden">
          <table className="tbl w-full table-fixed">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[17%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead>
              <tr>
                <th>Activity</th>
                <th>Package</th>
                <th>Discipline</th>
                <th>Planned Dates</th>
                <th>Progress</th>
                <th>Status</th>
                <th className="text-right">Details</th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task: any) => {
                const taskId = task.id
                const edit = edits[taskId] || {}
                const progress = edit.progress_pct ?? getProgress(task)
                const status = getStatus({
                  ...task,
                  ...edit,
                  progress_pct: progress,
                })
                const isExpanded = !!expandedRows[taskId]

                return (
                  <Fragment key={taskId}>
                    <tr className={isExpanded ? 'bg-[#f8fafc]' : ''}>
                      <td className="align-top font-medium text-[#102943]">
                        <div className="break-words pr-2 leading-5">
                          {getTaskName(task)}
                        </div>
                      </td>

                      <td className="align-top">
                        <span className="break-words text-sm">
                          {task.package_name || 'Project Wide'}
                        </span>
                      </td>

                      <td className="align-top">
                        <span className="break-words text-sm">
                          {task.discipline || '—'}
                        </span>
                      </td>

                      <td className="align-top">
                        <div className="space-y-1 text-xs leading-5 text-[#536170]">
                          <div>
                            <span className="font-semibold text-[#102943]">Start:</span>{' '}
                            {getPlannedStart(task) ? fdate(getPlannedStart(task)) : '—'}
                          </div>
                          <div>
                            <span className="font-semibold text-[#102943]">Finish:</span>{' '}
                            {getPlannedFinish(task) ? fdate(getPlannedFinish(task)) : '—'}
                          </div>
                        </div>
                      </td>

                      <td className="align-top">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className="form-control w-[72px] px-2 disabled:cursor-not-allowed disabled:opacity-60"
                            value={progress}
                            disabled={!canEdit}
                            onChange={e =>
                              updateEdit(
                                taskId,
                                'progress_pct',
                                Number(e.target.value)
                              )
                            }
                          />
                          <span className="text-xs text-[#82909c]">%</span>
                        </div>
                      </td>

                      <td className="align-top">
                        <span
                          className={`inline-block break-words text-[10px] font-semibold leading-4 ${statusColor(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="align-top text-right">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(taskId)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#dfe3e7] bg-white text-[#123a60] transition hover:bg-[#f3f6f8]"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'Hide task details' : 'Show task details'}
                          title={isExpanded ? 'Hide details' : 'Show details'}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-[#f8fafc]">
                        <td colSpan={7} className="!p-0">
                          <div className="border-t border-[#e8edf1] px-5 py-5">
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                              <label className="space-y-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#82909c]">
                                  Delay Reason
                                </span>
                                <select
                                  className="form-control w-full disabled:cursor-not-allowed disabled:opacity-60"
                                  value={edit.delay_reason ?? task.delay_reason ?? ''}
                                  disabled={!canEdit}
                                  onChange={e =>
                                    updateEdit(taskId, 'delay_reason', e.target.value)
                                  }
                                >
                                  {DELAY_REASONS.map(reason => (
                                    <option key={reason} value={reason}>
                                      {reason || 'None'}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="space-y-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#82909c]">
                                  Recovery Action
                                </span>
                                <select
                                  className="form-control w-full disabled:cursor-not-allowed disabled:opacity-60"
                                  value={edit.recovery_action ?? task.recovery_action ?? ''}
                                  disabled={!canEdit}
                                  onChange={e =>
                                    updateEdit(taskId, 'recovery_action', e.target.value)
                                  }
                                >
                                  {RECOVERY_ACTIONS.map(action => (
                                    <option key={action} value={action}>
                                      {action || 'None'}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="space-y-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#82909c]">
                                  Progress Comment
                                </span>
                                <input
                                  className="form-control w-full disabled:cursor-not-allowed disabled:opacity-60"
                                  value={edit.progress_comments ?? task.progress_comments ?? ''}
                                  disabled={!canEdit}
                                  onChange={e =>
                                    updateEdit(taskId, 'progress_comments', e.target.value)
                                  }
                                  placeholder={canEdit ? 'Add progress comment' : 'No comment'}
                                />
                              </label>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#e8edf1] pt-4">
                              <div className="flex flex-wrap items-center gap-5 text-xs text-[#536170]">
                                <label className={`inline-flex items-center gap-2 ${!canEdit ? 'opacity-60' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={edit.is_on_hold ?? task.is_on_hold ?? false}
                                    disabled={!canEdit}
                                    onChange={e =>
                                      updateEdit(taskId, 'is_on_hold', e.target.checked)
                                    }
                                  />
                                  On Hold
                                </label>

                                <label className={`inline-flex items-center gap-2 ${!canEdit ? 'opacity-60' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={edit.is_blocked ?? task.is_blocked ?? false}
                                    disabled={!canEdit}
                                    onChange={e =>
                                      updateEdit(taskId, 'is_blocked', e.target.checked)
                                    }
                                  />
                                  Blocked
                                </label>
                              </div>

                              {canEdit ? (
                                <button
                                  className="btn btn-gold btn-sm"
                                  onClick={() => saveTaskProgress(task)}
                                  disabled={savingId === taskId}
                                >
                                  <Save size={13} />
                                  {savingId === taskId ? 'Saving…' : 'Save Update'}
                                </button>
                              ) : (
                                <span className="text-[10px] uppercase tracking-widest text-slate-500">
                                  View Only
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ScheduleTab({ schedules, canUpload }: any) {
  return (
    <div className="space-y-4">
      {!canUpload && (
        <div className="card p-4 text-sm text-amber-400">
          You can view schedules, but only PMO/Admin can upload or activate schedules.
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="card p-8 text-center text-[#6e7d8c]">
          No schedule revisions found.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="tbl min-w-[1200px]">
            <thead>
              <tr>
                <th>Revision</th>
                <th>Type</th>
                <th>Status</th>
                <th>Active</th>
                <th>Package</th>
                <th>Planned Finish</th>
                <th>Forecast Finish</th>
                <th>Reason</th>
              </tr>
            </thead>

            <tbody>
              {schedules.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-medium text-[#102943]">
                    {item.revision_name}
                  </td>
                  <td>{item.revision_type || '—'}</td>
                  <td>{item.status || 'Draft'}</td>
                  <td>{item.is_active ? 'Yes' : 'No'}</td>
                  <td>{item.package_name || 'Project Wide'}</td>
                  <td>
                    {item.planned_finish ? fdate(item.planned_finish) : '—'}
                  </td>
                  <td>
                    {item.forecast_finish ? fdate(item.forecast_finish) : '—'}
                  </td>
                  <td>{item.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ProgressTab({ tasks, metrics }: any) {
  const byDiscipline = Object.values(
    tasks.reduce((acc: any, task: any) => {
      const key = task.discipline || 'Unassigned'
      if (!acc[key]) {
        acc[key] = { discipline: key, count: 0, completed: 0 }
      }

      acc[key].count += 1

      if (getProgress(task) >= 100) {
        acc[key].completed += 1
      }

      return acc
    }, {})
  ) as any[]

  return (
    <div className="space-y-4">
      <Metric
        title="Overall Progress"
        value={`${metrics.overallProgress}%`}
      />

      <div className="card overflow-x-auto">
        <table className="tbl min-w-[900px]">
          <thead>
            <tr>
              <th>Discipline</th>
              <th>Tasks</th>
              <th>Completed</th>
              <th>Overall Progress</th>
            </tr>
          </thead>

          <tbody>
            {byDiscipline.map(item => (
              <tr key={item.discipline}>
                <td className="font-medium text-[#102943]">
                  {item.discipline}
                </td>
                <td>{item.count}</td>
                <td>{item.completed}</td>
                <td>
                  {item.count > 0
                    ? `${Math.round((item.completed / item.count) * 100)}%`
                    : '0%'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DelaysTab({ tasks }: { tasks: any[] }) {
  if (!tasks.length) {
    return (
      <div className="card p-8 text-center text-[#6e7d8c]">
        No delayed, blocked or on-hold tasks.
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto">
      <table className="tbl min-w-[1200px]">
        <thead>
          <tr>
            <th>Activity</th>
            <th>Package</th>
            <th>Discipline</th>
            <th>Planned Finish</th>
            <th>Status</th>
            <th>Delay Reason</th>
            <th>Recovery Action</th>
          </tr>
        </thead>

        <tbody>
          {tasks.map(task => {
            const status = getStatus(task)

            return (
              <tr key={task.id}>
                <td className="font-medium text-[#102943]">
                  {getTaskName(task)}
                </td>
                <td>{task.package_name || 'Project Wide'}</td>
                <td>{task.discipline || '—'}</td>
                <td>
                  {getPlannedFinish(task)
                    ? fdate(getPlannedFinish(task))
                    : '—'}
                </td>
                <td className={statusColor(status)}>{status}</td>
                <td>{task.delay_reason || '—'}</td>
                <td>{task.recovery_action || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ForecastTab({ activeSchedule, tasks }: any) {
  const incomplete = tasks.filter((task: any) => getProgress(task) < 100)
  const delayed = incomplete.filter(
    (task: any) => getStatus(task) === 'Behind'
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Metric
        title="Active Schedule"
        value={activeSchedule?.revision_name || 'None'}
      />
      <Metric title="Incomplete Tasks" value={incomplete.length} />
      <Metric title="Delayed Incomplete Tasks" value={delayed.length} />
    </div>
  )
}

function RecoveryTab({ tasks }: { tasks: any[] }) {
  const withRecovery = tasks.filter(
    task => task.recovery_action && task.recovery_action !== 'No Recovery Plan'
  )
  const noRecovery = tasks.filter(
    task => !task.recovery_action || task.recovery_action === 'No Recovery Plan'
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Metric title="Delayed / Blocked" value={tasks.length} />
      <Metric title="With Recovery Plan" value={withRecovery.length} />
      <Metric title="No Recovery Plan" value={noRecovery.length} />
    </div>
  )
}

function HistoryTab({ logs, tasks, disciplineTab }: any) {
  const filteredLogs =
    disciplineTab === 'Overall'
      ? logs
      : logs.filter((log: any) => {
          const task = tasks.find((item: any) => item.id === log.task_id)
          return (task?.discipline || 'Housebuild') === disciplineTab
        })

  if (!filteredLogs.length) {
    return (
      <div className="card p-8 text-center text-[#6e7d8c]">
        No progress history yet.
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto">
      <table className="tbl min-w-[1200px]">
        <thead>
          <tr>
            <th>Date</th>
            <th>Activity</th>
            <th>Updated By</th>
            <th>Progress Change</th>
            <th>Delay Reason</th>
            <th>Recovery Action</th>
            <th>Comments</th>
          </tr>
        </thead>

        <tbody>
          {filteredLogs.map((log: any) => {
            const task = tasks.find((item: any) => item.id === log.task_id)

            return (
              <tr key={log.id}>
                <td>{fdate(log.created_at)}</td>
                <td className="font-medium text-[#102943]">
                  {task ? getTaskName(task) : `Task ${log.task_id}`}
                </td>
                <td>{getLogActor(log)}</td>
                <td>
                  {Number(log.previous_progress || 0)}% →{' '}
                  {Number(log.new_progress || 0)}%
                </td>
                <td>{log.delay_reason || '—'}</td>
                <td>{log.recovery_action || '—'}</td>
                <td>{log.comments || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="card p-4">
      <Activity size={18} className="text-[#df5f41]" />
      <div className="text-2xl font-black text-[#0B2A3C] dark:text-white mt-3">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-[#6e7d8c] mt-1">
        {title}
      </div>
    </div>
  )
}
