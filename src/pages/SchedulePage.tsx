import {
  Upload,
  Plus,
  List,
  BarChart2,
  Flag,
  Search,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Sparkles,
  SlidersHorizontal,
  TrendingUp,
  LockKeyhole,
} from 'lucide-react'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useScheduleImport } from '@/features/schedule/imports'
import { useQualityGates } from '@/hooks/useData'
import { fdate, urgencyColor, computeRAG } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import type { Task } from '@/types'
import TaskModal from '@/components/modules/schedule/TaskModal'
import GanttView from '@/components/modules/schedule/GanttView'
import MilestoneTracker from '@/components/modules/schedule/MilestoneTracker'

type View = 'list' | 'gantt' | 'milestones'
type DisciplineTab = 'Overall' | 'Housebuild' | 'MEP' | 'Infrastructure'
type ScheduleDiscipline = Exclude<DisciplineTab, 'Overall'>
type FocusMode = 'Executive' | 'Planner' | 'Site' | 'Recovery'

const DISCIPLINE_TABS: DisciplineTab[] = ['Overall', 'Housebuild', 'MEP', 'Infrastructure']
const FOCUS_MODES: FocusMode[] = ['Executive', 'Planner', 'Site', 'Recovery']

export default function SchedulePage() {
  const { projectId, projectName } = useProjectStore()
  const role = useMembershipStore(state => state.role)

  const [disciplineTab, setDisciplineTab] = useState<DisciplineTab>('Overall')
  const [focusMode, setFocusMode] = useState<FocusMode>('Executive')
  const [view, setView] = useState<View>('list')
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('All')
  const [ragFilter, setRagFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalTask, setModalTask] = useState<Task | null | 'new'>(null)

  const { importExcel, importXml, uploadBackup } = useScheduleImport()
  const { data: allTasks = [], isLoading } = useTasks()
  const { data: qualityGates = [] } = useQualityGates()

  const activeDiscipline = disciplineTab === 'Overall' ? undefined : (disciplineTab as ScheduleDiscipline)
  const canManageScheduleUpload =
    disciplineTab !== 'Overall' && ['workspace_admin', 'admin', 'pmo'].includes(role || '')

  const today = new Date()
  const projectTasks: Task[] = allTasks.filter((task: Task) => task.project_id === projectId)
  const tasks: Task[] = disciplineTab === 'Overall'
    ? projectTasks
    : projectTasks.filter(task => ((task as any).discipline || 'Housebuild') === disciplineTab)

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

  const PHASES: string[] = useMemo(() => [
    'All',
    ...Array.from(new Set(tasks.map(task => task.phase).filter((phase): phase is string => Boolean(phase)))),
  ], [tasks])

  useEffect(() => {
    setPhaseFilter('All')
    setRagFilter('')
    setStatusFilter('')
    setSearch('')
  }, [disciplineTab])

  useEffect(() => {
    if (focusMode === 'Recovery') {
      setRagFilter('RED')
      setView('list')
    } else if (focusMode === 'Site') {
      setStatusFilter('In Progress')
      setRagFilter('')
      setView('list')
    } else if (focusMode === 'Planner') {
      setRagFilter('')
      setStatusFilter('')
      setView('gantt')
    } else {
      setRagFilter('')
      setStatusFilter('')
      setView('list')
    }
  }, [focusMode])

  const filtered: Task[] = tasks
    .filter(task => {
      const taskName = task.name || ''
      const taskNumber = String(task.task_number || '')
      if (search && !taskName.toLowerCase().includes(search.toLowerCase()) && !taskNumber.includes(search)) return false
      if (phaseFilter !== 'All' && task.phase !== phaseFilter) return false
      if (ragFilter && getRag(task) !== ragFilter) return false
      if (statusFilter && (task.status || 'Not Started') !== statusFilter) return false
      return true
    })
    .sort((a, b) => Number(a.task_number || 0) - Number(b.task_number || 0))

  const grouped: Record<string, Task[]> = PHASES.slice(1).reduce((acc, phase) => {
    const phaseTasks = filtered.filter(task => task.phase === phase)
    if (phaseTasks.length) acc[phase] = phaseTasks
    return acc
  }, {} as Record<string, Task[]>)

  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(task => task.status === 'Completed').length
    const inProgress = tasks.filter(task => task.status === 'In Progress').length
    const delayed = tasks.filter(task => getRag(task) === 'RED').length
    const atRisk = tasks.filter(task => getRag(task) === 'AMBER').length
    const milestones = tasks.filter(task => task.is_milestone).length
    const avgProgress = total
      ? Math.round(tasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / total)
      : 0
    const completionRate = total ? Math.round((completed / total) * 100) : 0
    return { total, completed, inProgress, delayed, atRisk, milestones, avgProgress, completionRate }
  }, [tasks])

  const delayedTasks = tasks
    .filter(task => getRag(task) === 'RED')
    .sort((a, b) => {
      const aDate = a.finish_date ? new Date(a.finish_date).getTime() : Infinity
      const bDate = b.finish_date ? new Date(b.finish_date).getTime() : Infinity
      return aDate - bDate
    })
    .slice(0, 4)

  const upcomingMilestones = tasks
    .filter(task => task.is_milestone && task.status !== 'Completed' && task.finish_date)
    .sort((a, b) => new Date(a.finish_date!).getTime() - new Date(b.finish_date!).getTime())
    .slice(0, 5)

  const scheduleHealth = stats.delayed > 5 ? 'Critical' : stats.delayed > 0 || stats.atRisk > 3 ? 'Watch' : 'Healthy'
  const healthTone = scheduleHealth === 'Critical' ? 'text-red-600' : scheduleHealth === 'Watch' ? 'text-amber-600' : 'text-emerald-600'
  const healthBg = scheduleHealth === 'Critical' ? 'bg-red-50 border-red-200' : scheduleHealth === 'Watch' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'

  const scheduleBrief = stats.delayed > 0
    ? `${stats.delayed} ${stats.delayed === 1 ? 'activity is' : 'activities are'} overdue and ${stats.atRisk} are approaching their finish dates. The schedule remains recoverable, but the delayed sequence requires immediate ownership and resequencing.`
    : stats.atRisk > 0
      ? `Delivery remains broadly on plan. ${stats.atRisk} ${stats.atRisk === 1 ? 'activity is' : 'activities are'} entering the watch window and should be protected before available time is lost.`
      : `The approved schedule is stable. No overdue activities are currently recorded, and delivery is progressing at ${stats.avgProgress}% overall completion.`

  const recoveryText = delayedTasks.length
    ? `Start with “${delayedTasks[0].name}”. Confirm the blocker, assign a recovery owner and protect all downstream activities before the next reporting cycle.`
    : `No immediate recovery intervention is required. Focus on protecting upcoming milestones and closing approvals before they affect site execution.`

  const isTaskLocked = (task: Task) => qualityGates.some(
    gate => gate.blocks_task_id === task.id && gate.status !== 'Approved' && gate.status !== 'Reapproved'
  )
  const getBlockingGate = (task: Task) => qualityGates.find(
    gate => gate.blocks_task_id === task.id && gate.status !== 'Approved' && gate.status !== 'Reapproved'
  )
  const openTaskModal = (task: Task | 'new') => {
    if (!canManageScheduleUpload) return
    setModalTask(task)
  }

  const handleBackupUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManageScheduleUpload || !activeDiscipline) { event.target.value = ''; return }
    const file = event.target.files?.[0]
    if (!file) return
    try { await uploadBackup(file, activeDiscipline); alert(`${activeDiscipline} schedule backup uploaded successfully.`) }
    catch (error) { alert(error instanceof Error ? error.message : 'Unable to upload backup.') }
    finally { event.target.value = '' }
  }
  const handleScheduleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManageScheduleUpload || !activeDiscipline) { event.target.value = ''; return }
    const file = event.target.files?.[0]
    if (!file) return
    try { const count = await importExcel(file, activeDiscipline); alert(`${count} ${activeDiscipline} Excel tasks imported successfully.`) }
    catch (error) { alert(error instanceof Error ? error.message : 'Unable to import Excel schedule.') }
    finally { event.target.value = '' }
  }
  const handleXmlScheduleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManageScheduleUpload || !activeDiscipline) { event.target.value = ''; return }
    const file = event.target.files?.[0]
    if (!file) return
    try { const count = await importXml(file, activeDiscipline); alert(`${count} ${activeDiscipline} MS Project XML tasks imported successfully.`) }
    catch (error) { alert(error instanceof Error ? error.message : 'Unable to import MS Project XML.') }
    finally { event.target.value = '' }
  }

  return (
    <div className="min-h-screen bg-[#f6f5f1] text-[#18212b] -m-4 sm:-m-6 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <section className="overflow-hidden rounded-[24px] border border-[#dfe3e7] bg-white">
          <div className="grid lg:grid-cols-[1fr_320px]">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="mb-6 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e7b87]">
                <span>Project controls</span><span className="h-1 w-1 rounded-full bg-[#ff7657]" /><span>{disciplineTab} schedule</span>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#102943] sm:text-4xl">Schedule Control Centre</h1>
                  <p className="mt-2 text-sm text-[#65717c]">{projectName}</p>
                </div>
                <div className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${healthBg} ${healthTone}`}>{scheduleHealth}</div>
              </div>
              <p className="mt-8 max-w-4xl text-[17px] leading-8 text-[#324252]">{scheduleBrief}</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {DISCIPLINE_TABS.map(tab => (
                  <button key={tab} onClick={() => setDisciplineTab(tab)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${disciplineTab === tab ? 'bg-[#123a60] text-white' : 'border border-[#dfe3e7] bg-white text-[#536170] hover:border-[#9da9b3]'}`}>{tab}</button>
                ))}
              </div>
            </div>
            <div className="border-t border-[#e7eaed] bg-[#123a60] p-7 text-white lg:border-l lg:border-t-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Overall progress</div>
              <div className="mt-3 text-6xl font-semibold tracking-[-0.06em]">{stats.avgProgress}%</div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#ff7657]" style={{ width: `${stats.avgProgress}%` }} /></div>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 text-sm">
                <div><div className="text-white/55">Completed</div><div className="mt-1 text-xl font-semibold">{stats.completed}</div></div>
                <div><div className="text-white/55">In progress</div><div className="mt-1 text-xl font-semibold">{stats.inProgress}</div></div>
              </div>
            </div>
          </div>
        </section>

        {!canManageScheduleUpload && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
            <LockKeyhole size={16} className="mt-0.5 shrink-0" />
            <span>{disciplineTab === 'Overall' ? 'The master schedule is generated from approved discipline schedules and cannot be edited directly.' : 'View only. PMO and administrators can upload or edit approved schedules; project owners update delivery progress through Project Controls.'}</span>
          </div>
        )}

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#dfe3e7] bg-[#dfe3e7] sm:grid-cols-4 xl:grid-cols-7">
          {[
            { label: 'Activities', value: stats.total, icon: List },
            { label: 'Progress', value: `${stats.avgProgress}%`, icon: TrendingUp },
            { label: 'Completed', value: stats.completed, icon: CheckCircle2 },
            { label: 'In progress', value: stats.inProgress, icon: Clock3 },
            { label: 'Delayed', value: stats.delayed, icon: AlertTriangle, alert: stats.delayed > 0 },
            { label: 'At risk', value: stats.atRisk, icon: CalendarDays },
            { label: 'Milestones', value: stats.milestones, icon: Flag },
          ].map(({ label, value, icon: Icon, alert }) => (
            <div key={label} className="bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#788591]">{label}</span><Icon size={15} className={alert ? 'text-red-500' : 'text-[#8a98a5]'} /></div>
              <div className={`mt-3 text-2xl font-semibold tracking-[-0.03em] ${alert ? 'text-red-600' : 'text-[#102943]'}`}>{value}</div>
            </div>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-[#dfe3e7] bg-white p-5 sm:p-6">
            <div className="flex min-w-0 items-center gap-1.5"><Sparkles size={17} className="text-[#ff7657]" /><span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6f7d89]">Schedule intelligence</span></div>
            <h2 className="mt-4 text-xl font-semibold tracking-[-0.025em] text-[#102943]">Recovery opportunity</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-[#536170]">{recoveryText}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {FOCUS_MODES.map(mode => <button key={mode} onClick={() => setFocusMode(mode)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${focusMode === mode ? 'bg-[#eaf1f7] text-[#123a60]' : 'text-[#687684] hover:bg-[#f3f5f6]'}`}>{mode}</button>)}
            </div>
          </section>

          <section className="rounded-2xl border border-[#dfe3e7] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6f7d89]">Next milestones</div><div className="mt-1 text-sm text-[#9aa4ad]">Nearest planned outcomes</div></div><Flag size={18} className="text-[#ff7657]" /></div>
            <div className="mt-5 space-y-4">
              {upcomingMilestones.length ? upcomingMilestones.map(task => (
                <div key={task.id} className="flex items-start gap-3"><div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#ff7657]" /><div className="min-w-0"><div className="truncate text-sm font-medium text-[#243547]">{task.name}</div><div className="mt-1 text-xs text-[#7b8791]">{fdate(task.finish_date)}</div></div></div>
              )) : <div className="text-sm text-[#7b8791]">No upcoming milestones recorded.</div>}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-[#dfe3e7] bg-white">
          <div className="border-b border-[#e5e8eb] p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex overflow-hidden rounded-xl border border-[#dfe3e7] bg-[#f7f8f8] p-1">
                {([['list', List, 'Register'], ['gantt', BarChart2, 'Gantt'], ['milestones', Flag, 'Milestones']] as [View, React.ElementType, string][]).map(([value, Icon, label]) => (
                  <button key={value} onClick={() => setView(value)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${view === value ? 'bg-white text-[#123a60] shadow-sm' : 'text-[#73808c]'}`}><Icon size={13} />{label}</button>
                ))}
              </div>
              <div className="relative min-w-[210px] flex-1 max-w-sm"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87939d]" /><input className="w-full rounded-xl border border-[#dfe3e7] bg-white py-2.5 pl-9 pr-3 text-xs text-[#28394b] outline-none focus:border-[#123a60]" placeholder="Search activities or task number" value={search} onChange={event => setSearch(event.target.value)} /></div>
              <select className="rounded-xl border border-[#dfe3e7] bg-white px-3 py-2.5 text-xs text-[#536170]" value={phaseFilter} onChange={event => setPhaseFilter(event.target.value)}>{PHASES.map(phase => <option key={phase}>{phase}</option>)}</select>
              <select className="rounded-xl border border-[#dfe3e7] bg-white px-3 py-2.5 text-xs text-[#536170]" value={ragFilter} onChange={event => setRagFilter(event.target.value)}><option value="">All health</option><option value="RED">Delayed</option><option value="AMBER">At risk</option><option value="GREEN">Healthy</option></select>
              <select className="rounded-xl border border-[#dfe3e7] bg-white px-3 py-2.5 text-xs text-[#536170]" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All status</option>{['Not Started','In Progress','Completed','On Hold','Blocked'].map(status => <option key={status}>{status}</option>)}</select>
              <SlidersHorizontal size={16} className="text-[#8b97a1]" />
              {canManageScheduleUpload && <div className="ml-auto flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-xl border border-[#dfe3e7] px-3 py-2.5 text-xs font-semibold text-[#536170] hover:border-[#9da9b3]"><Upload size={13} className="mr-1.5 inline" />Excel<input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleScheduleUpload} /></label>
                <label className="cursor-pointer rounded-xl border border-[#dfe3e7] px-3 py-2.5 text-xs font-semibold text-[#536170] hover:border-[#9da9b3]"><Upload size={13} className="mr-1.5 inline" />XML<input type="file" hidden accept=".xml" onChange={handleXmlScheduleUpload} /></label>
                <label className="cursor-pointer rounded-xl border border-[#dfe3e7] px-3 py-2.5 text-xs font-semibold text-[#536170] hover:border-[#9da9b3]"><Upload size={13} className="mr-1.5 inline" />Backup<input type="file" hidden accept=".pdf,.mpp" onChange={handleBackupUpload} /></label>
                <button className="rounded-xl bg-[#123a60] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0d2e4d]" onClick={() => openTaskModal('new')}><Plus size={14} className="mr-1.5 inline" />Add task</button>
              </div>}
            </div>
          </div>

          {view === 'gantt' && <div className="p-4"><GanttView tasks={filtered} onTaskClick={(task: Task) => { if (canManageScheduleUpload) openTaskModal(task) }} /></div>}
          {view === 'milestones' && <div className="p-4"><MilestoneTracker tasks={tasks} /></div>}
          {view === 'list' && <div className="w-full overflow-hidden">
            <table className="w-full table-fixed border-collapse text-left text-[10px] xl:text-[11px]">
              <colgroup>
                <col className="w-[4%]" />
                <col className={disciplineTab === 'Overall' ? 'w-[16%]' : 'w-[19%]'} />
                {disciplineTab === 'Overall' && <col className="w-[7%]" />}
                <col className="w-[6%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[5%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[6%]" />
                <col className="w-[8%]" />
                <col className="w-[9%]" />
                <col className="w-[7%]" />
                <col className="w-[5%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-[#f7f8f8] text-[8px] font-semibold uppercase tracking-[0.08em] text-[#74818d] xl:text-[9px]"><tr><th className="px-2 py-3">WBS</th><th className="px-2 py-3">Activity</th>{disciplineTab === 'Overall' && <th className="px-2 py-3">Discipline</th>}<th className="px-2 py-3">Dependencies</th><th className="px-2 py-3">Start</th><th className="px-2 py-3">Finish</th><th className="px-2 py-3">Duration</th><th className="px-2 py-3">Procurement</th><th className="px-2 py-3">Approval</th><th className="px-2 py-3">Health</th><th className="px-2 py-3">Status</th><th className="px-2 py-3">Progress</th><th className="px-2 py-3">Owner</th><th className="px-2 py-3"></th></tr></thead>
              <tbody>
                {isLoading ? <tr><td colSpan={14} className="px-2 py-12 text-center text-[#7c8892]">Loading schedule…</td></tr> : Object.entries(grouped).length === 0 ? <tr><td colSpan={14} className="px-2 py-12 text-center text-[#7c8892]">No activities match this view.</td></tr> : Object.entries(grouped).map(([phase, phaseTasks]) => <Fragment key={phase}>
                  <tr className="border-y border-[#e5e8eb] bg-[#eef3f6]"><td colSpan={14} className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#123a60]">{phase}</td></tr>
                  {phaseTasks.map(task => {
                    const rag = task.status === 'Completed' ? 'DONE' : getRag(task) || computeRAG(task)
                    const procDays = task.procurement_deadline ? differenceInDays(new Date(task.procurement_deadline), today) : null
                    const apprDays = task.approval_deadline ? differenceInDays(new Date(task.approval_deadline), today) : null
                    const tone = rag === 'RED' ? 'bg-red-50 text-red-700 border-red-200' : rag === 'AMBER' ? 'bg-amber-50 text-amber-700 border-amber-200' : rag === 'DONE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    return <tr key={task.id} className="border-b border-[#edf0f2] hover:bg-[#fafbfb]">
                      <td className="px-2 py-3 font-mono text-[9px] text-[#86919a]">{task.task_number}</td>
                      <td className="px-2 py-3"><div className="break-words font-medium leading-4 text-[#26384a]">{task.name}{task.is_milestone && <span className="ml-1.5 text-[#ff7657]">◆</span>}</div></td>
                      {disciplineTab === 'Overall' && <td className="px-2 py-3"><span className="rounded-full bg-[#edf3f7] px-2.5 py-1 text-[10px] font-semibold text-[#31526d]">{(task as any).discipline || 'Housebuild'}</span></td>}
                      <td className="break-words px-2 py-3 font-mono text-[9px] leading-4 text-[#7d8993]">{task.dependencies || '—'}</td><td className="break-words px-2 py-3 leading-4 text-[#536170]">{fdate(task.start_date)}</td><td className="break-words px-2 py-3 leading-4 text-[#536170]">{fdate(task.finish_date)}</td><td className="px-2 py-3 text-center text-[#536170]">{task.duration_days || '—'}</td>
                      <td className="px-2 py-3">{task.procurement_deadline ? <span className={urgencyColor(procDays)}>{fdate(task.procurement_deadline)}</span> : '—'}</td><td className="px-2 py-3">{task.approval_deadline ? <span className={urgencyColor(apprDays)}>{fdate(task.approval_deadline)}</span> : '—'}</td>
                      <td className="px-2 py-3"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{rag}</span></td><td className="break-words px-2 py-3 leading-4 text-[#536170]">{task.status || 'Not Started'}</td>
                      <td className="px-2 py-3"><div className="flex min-w-0 items-center gap-1.5"><div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#e7ebee]"><div className="h-full rounded-full bg-[#123a60]" style={{ width: `${getTaskProgress(task)}%` }} /></div><span className="text-[10px] text-[#6f7c87]">{getTaskProgress(task)}%</span></div></td>
                      <td className="break-words px-2 py-3 leading-4 text-[#536170]">{task.responsible || '—'}</td><td className="px-2 py-3">{isTaskLocked(task) ? <div><span className="rounded-full bg-red-50 px-2 py-1 text-[9px] font-semibold text-red-700">LOCKED</span><div className="mt-1 break-words text-[8px] leading-3 text-[#87929b]">{getBlockingGate(task)?.gate_name || 'Quality gate'}</div></div> : canManageScheduleUpload ? <button className="text-[11px] font-semibold text-[#123a60] hover:underline" onClick={() => openTaskModal(task)}>Edit</button> : <span className="text-[10px] text-[#9aa3ab]">View</span>}</td>
                    </tr>
                  })}
                </Fragment>)}
              </tbody>
            </table>
          </div>}
        </section>
      </div>

      {modalTask !== null && canManageScheduleUpload && <TaskModal task={modalTask === 'new' ? null : modalTask} onClose={() => setModalTask(null)} />}
    </div>
  )
}
