import { useEffect, useMemo, useState } from 'react'
import { Activity, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import { useAuthStore } from '@/store/auth'
import { fdate } from '@/lib/utils'

const TABS = ['Execution', 'Schedule', 'Progress', 'Delays', 'Forecast', 'Recovery', 'History']

type DisciplineTab = 'Overall' | 'Housebuild' | 'MEP' | 'Infrastructure'

const DISCIPLINE_TABS: DisciplineTab[] = [
  'Overall',
  'Housebuild',
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

function canManageSchedule(role?: string | null) {
  return ['workspace_admin', 'admin', 'pmo'].includes(role || '')
}

function canEditProjectControls(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'overall_project_owner',
  ].includes(role || '')
}

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

export default function ProjectControlsPage() {
  const { projectId, projectName } = useProjectStore()
  const role = useMembershipStore(state => state.role)
  const { user } = useAuthStore()

  const canEdit = canEditProjectControls(role)
  const canUploadSchedule = canManageSchedule(role)

  const [activeTab, setActiveTab] = useState('Execution')
  const [disciplineTab, setDisciplineTab] = useState<DisciplineTab>('Overall')

  const [allTasks, setAllTasks] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, any>>({})

  useEffect(() => {
    loadData()
  }, [projectId])

  const tasks =
    disciplineTab === 'Overall'
      ? allTasks
      : allTasks.filter(
          task => (task.discipline || 'Housebuild') === disciplineTab
        )

  async function loadData() {
    if (!projectId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setNotice('')

    const [taskResult, scheduleResult, logResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('task_number', { ascending: true }),

      supabase
        .from('schedule_revisions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),

      supabase
  .from('task_progress_logs')
  .select('*, profiles:updated_by(full_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }),
    ])

    if (taskResult.error) setNotice(taskResult.error.message)
    if (scheduleResult.error) setNotice(scheduleResult.error.message)
    if (logResult.error) setNotice(logResult.error.message)

    setAllTasks(taskResult.data || [])
    setSchedules(scheduleResult.data || [])
    setLogs(logResult.data || [])
    setLoading(false)
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
      setNotice('View only. Only Project Owners, PMO and Administrators can update project controls.')
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

    await supabase.from('task_progress_logs').insert({
      project_id: projectId,
      task_id: taskId,
      schedule_revision_id: task.schedule_revision_id || null,
      block_id: task.block_id || null,
      previous_progress: previousProgress,
      new_progress: newProgress,
      delay_reason: payload.delay_reason,
      recovery_action: payload.recovery_action,
      comments: payload.progress_comments,
      updated_by: user?.id || null,
      updated_by_role: role || null,
    })

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
      <section className="rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          Project Controls
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Project Controls
        </h1>

        <p className="text-slate-400 mt-3 max-w-3xl">
          PMO/Admin controls schedule uploads. Project Owners update progress,
          delay reason, recovery action and comments. Other roles are view only.
        </p>

        <div className="text-xs text-[#6e7d8c] mt-4">
          Project:{' '}
          <span className="text-[#c49e48]">
            {projectName || 'No project selected'}
          </span>
        </div>

        {!canEdit && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            View Only. Only Project Owners, PMO and Administrators can update project controls.
          </div>
        )}

        <div className="flex gap-2 mt-4 flex-wrap">
          {DISCIPLINE_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setDisciplineTab(tab)}
              className={`btn-sm btn ${
                disciplineTab === tab ? 'btn-gold' : 'btn-ghost'
              }`}
            >
              {tab === 'Overall' ? 'Master' : tab}
            </button>
          ))}
        </div>
      </section>

      {notice && (
        <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Metric title="Tasks" value={metrics.total} />
        <Metric
          title="Overall Progress"
          value={`${metrics.overallProgress.toFixed(1)}%`}
        />
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
            <HistoryTab logs={logs} tasks={allTasks} disciplineTab={disciplineTab} />
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
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          View Only. Only Project Owners, PMO and Administrators can update project controls.
        </div>
      )}

      <div className="card overflow-x-auto">
  <table className="tbl min-w-[1500px]">
          <thead>
            <tr>
              <th>Activity</th>
              <th>Package</th>
              <th>Updated By</th>
              <th>Planned Start</th>
              <th>Planned Finish</th>
              <th>Progress %</th>
              <th>Status</th>
              <th>Delay Reason</th>
              <th>Recovery Action</th>
              <th>Comments</th>
              <th></th>
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

              return (
                <tr key={taskId}>
                  <td className="font-medium text-[#ede8de] min-w-[220px]">
                    {getTaskName(task)}
                  </td>

                  <td>{task.package_name || 'Project Wide'}</td>
                  <td>{task.discipline || '—'}</td>

                  <td>
                    {getPlannedStart(task) ? fdate(getPlannedStart(task)) : '—'}
                  </td>

                  <td>
                    {getPlannedFinish(task)
                      ? fdate(getPlannedFinish(task))
                      : '—'}
                  </td>

                  <td>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="form-control w-24 disabled:opacity-60 disabled:cursor-not-allowed"
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
                  </td>

                  <td>
                    <span
                      className={`text-[10px] font-semibold ${statusColor(
                        status
                      )}`}
                    >
                      {status}
                    </span>
                  </td>

                  <td>
                    <select
                      className="form-control min-w-[150px] disabled:opacity-60 disabled:cursor-not-allowed"
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
                  </td>

                  <td>
                    <select
                      className="form-control min-w-[170px] disabled:opacity-60 disabled:cursor-not-allowed"
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
                  </td>

                  <td>
                    <input
                      className="form-control min-w-[180px] disabled:opacity-60 disabled:cursor-not-allowed"
                      value={
                        edit.progress_comments ?? task.progress_comments ?? ''
                      }
                      disabled={!canEdit}
                      onChange={e =>
                        updateEdit(
                          taskId,
                          'progress_comments',
                          e.target.value
                        )
                      }
                      placeholder="Comment"
                    />

                    <div className="flex gap-3 mt-2 text-[10px] text-slate-400">
                      <label className={!canEdit ? 'opacity-60' : ''}>
                        <input
                          type="checkbox"
                          checked={edit.is_on_hold ?? task.is_on_hold ?? false}
                          disabled={!canEdit}
                          onChange={e =>
                            updateEdit(taskId, 'is_on_hold', e.target.checked)
                          }
                        />{' '}
                        On Hold
                      </label>

                      <label className={!canEdit ? 'opacity-60' : ''}>
                        <input
                          type="checkbox"
                          checked={edit.is_blocked ?? task.is_blocked ?? false}
                          disabled={!canEdit}
                          onChange={e =>
                            updateEdit(taskId, 'is_blocked', e.target.checked)
                          }
                        />{' '}
                        Blocked
                      </label>
                    </div>
                  </td>

                  <td>
                    {canEdit ? (
                      <button
                        className="btn btn-gold btn-sm"
                        onClick={() => saveTaskProgress(task)}
                        disabled={savingId === taskId}
                      >
                        <Save size={13} />
                        {savingId === taskId ? 'Saving…' : 'Save'}
                      </button>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest text-slate-500">
                        View Only
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScheduleTab({ schedules, canUpload }: any) {
  return (
    <div className="space-y-4">
      {!canUpload && (
        <div className="card p-4 text-sm text-amber-400">
          You can view schedules, but only PMO/Admin can upload or activate
          schedules.
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="card p-8 text-center text-[#6e7d8c]">
          No schedule revisions found.
        </div>
      ) : (
        <div className="card overflow-x-auto">
  <table className="tbl min-w-[1500px]">
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
                  <td className="font-medium text-[#ede8de]">
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
      if (!acc[key]) acc[key] = { discipline: key, count: 0, progress: 0 }
      acc[key].count += 1
      acc[key].progress += getProgress(task)
      return acc
    }, {})
  ) as any[]

  return (
    <div className="space-y-4">
      <Metric
        title="Overall Progress"
        value={`${metrics.avgProgress.toFixed(1)}%`}
      />

      <div className="card overflow-x-auto">
  <table className="tbl min-w-[1500px]">
          <thead>
            <tr>
              <th>Discipline</th>
              <th>Tasks</th>
              <th>Average Progress</th>
            </tr>
          </thead>

          <tbody>
            {byDiscipline.map(item => (
              <tr key={item.discipline}>
                <td className="font-medium text-[#ede8de]">
                  {item.discipline}
                </td>
                <td>{item.count}</td>
                <td>{(item.progress / item.count).toFixed(1)}%</td>
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
  <table className="tbl min-w-[1500px]">
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
                <td className="font-medium text-[#ede8de]">
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
  <table className="tbl min-w-[1500px]">
        <thead>
          <tr>
            <th>Date</th>
            <th>Activity</th>
            <th>Discipline</th>
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
                <td className="font-medium text-[#ede8de]">
                  {task ? getTaskName(task) : `Task ${log.task_id}`}
                </td>
                <td>
  {log.profiles?.full_name ||
    log.updated_by_role ||
    '—'}
</td>
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
      <Activity size={18} className="text-[#c49e48]" />
      <div className="text-2xl font-black text-white mt-3">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-[#6e7d8c] mt-1">
        {title}
      </div>
    </div>
  )
}
