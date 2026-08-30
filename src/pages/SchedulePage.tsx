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
  Building2,
  Layers3,
  X,
  Pencil,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useScheduleImport } from '@/features/schedule/imports'
import { useArchiveDeliveryPackage, useCreateDeliveryPackage, useDeleteDeliveryPackage, useDeliveryPackages, useUpdateDeliveryPackage, type DeliveryPackage } from '@/features/schedule/deliveryPackages'
import { useQualityGates } from '@/hooks/useData'
import { fdate, urgencyColor, computeRAG } from '@/lib/utils'
import { differenceInDays } from 'date-fns'
import type { Task } from '@/types'
import TaskModal from '@/components/modules/schedule/TaskModal'
import GanttView from '@/components/modules/schedule/GanttView'
import MilestoneTracker from '@/components/modules/schedule/MilestoneTracker'
import { pmoConfirm, pmoPrompt, pmoToast } from '@/lib/notifications'

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
  const [selectedPackageId, setSelectedPackageId] = useState<string>('all')
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<DeliveryPackage | null>(null)
  const [showArchivedPackages, setShowArchivedPackages] = useState(false)
  const [packageError, setPackageError] = useState('')
  const [packageForm, setPackageForm] = useState({ name: '', code: '', discipline: 'Housebuild' as ScheduleDiscipline, package_type: 'Block' as 'Block' | 'Shared' | 'Other', contractor_name: '', weight_pct: 0 })

  const { importExcel, importXml, uploadBackup } = useScheduleImport()
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks()
  const { data: qualityGates = [], isLoading: qualityGatesLoading } = useQualityGates()
  const { data: allDeliveryPackages = [], isLoading: deliveryPackagesLoading } = useDeliveryPackages(true)
  const deliveryPackages = allDeliveryPackages.filter(pkg => !pkg.archived_at)
  const archivedDeliveryPackages = allDeliveryPackages.filter(pkg => Boolean(pkg.archived_at))
  const createDeliveryPackage = useCreateDeliveryPackage()
  const updateDeliveryPackage = useUpdateDeliveryPackage()
  const archiveDeliveryPackage = useArchiveDeliveryPackage()
  const deleteDeliveryPackage = useDeleteDeliveryPackage()

  const activeDiscipline = disciplineTab === 'Overall' ? undefined : (disciplineTab as ScheduleDiscipline)
  const canManageScheduleUpload =
    disciplineTab !== 'Overall' && selectedPackageId !== 'all' && ['workspace_admin', 'admin', 'pmo'].includes(role || '')
  const canConfigurePackages = ['workspace_admin', 'admin', 'pmo'].includes(role || '')
  const canAdministerPackages = ['workspace_admin', 'admin'].includes(role || '')

  const today = new Date()

  // The tasks query is already scoped to the selected project. Delivery-package
  // metadata must never decide whether a valid programme activity exists.
  // A user may be allowed to read project tasks while package metadata is
  // unavailable (or a legacy/imported task may reference an older package).
  // Only suppress a task when we can positively identify its package as archived.
  const deliveryPackageById = new Map(
    allDeliveryPackages.map(pkg => [String(pkg.id), pkg])
  )
  const projectTasks: Task[] = allTasks.filter((task: Task) => {
    if (projectId != null && task.project_id != null && String(task.project_id) !== String(projectId)) {
      return false
    }

    if (!task.delivery_package_id) return true

    const pkg = deliveryPackageById.get(String(task.delivery_package_id))
    return !pkg || !pkg.archived_at
  })
  const disciplinePackages = disciplineTab === 'Overall' ? deliveryPackages : deliveryPackages.filter(pkg => pkg.discipline === disciplineTab)
  const selectedPackage = deliveryPackages.find(pkg => pkg.id === selectedPackageId)

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

  const overallTasks = useMemo(() => {
    const normalise = (value?: string) => (value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')

    const packageWeight = new Map(deliveryPackages.map(pkg => [pkg.id, Number(pkg.weight_pct || 0)]))
    const groups = new Map<string, Task[]>()

    projectTasks.forEach(task => {
      // Same construction activity in separate block programmes becomes one master activity.
      // Phase is part of the key so an early drawing handover is not confused with final project handover.
      const key = `${normalise(task.phase)}::${normalise(task.name)}`
      const current = groups.get(key) || []
      current.push(task)
      groups.set(key, current)
    })

    const validDate = (value?: string) => value && !Number.isNaN(new Date(value).getTime())

    return Array.from(groups.values()).map((records, index) => {
      const weights = records.map(record => {
        if (!record.delivery_package_id) return 1
        return packageWeight.get(record.delivery_package_id) || 1
      })
      const totalWeight = weights.reduce((sum, value) => sum + value, 0) || records.length || 1
      const progress = Math.round(records.reduce((sum, record, recordIndex) => sum + getTaskProgress(record) * weights[recordIndex], 0) / totalWeight)
      const starts = records.map(record => record.start_date).filter(validDate) as string[]
      const finishes = records.map(record => record.finish_date).filter(validDate) as string[]
      const startDate = starts.length ? starts.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] : undefined
      const finishDate = finishes.length ? finishes.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] : undefined
      const completedCount = records.filter(record => getTaskProgress(record) >= 100).length
      const status: Task['status'] = completedCount === records.length
        ? 'Completed'
        : progress <= 0
          ? 'Not Started'
          : 'In Progress'
      const redCount = records.filter(record => getRag(record) === 'RED').length
      const amberCount = records.filter(record => getRag(record) === 'AMBER').length
      const packageIds = new Set(records.map(record => record.delivery_package_id).filter(Boolean))
      const disciplines = Array.from(new Set(records.map(record => record.discipline || 'Housebuild')))

      return {
        ...records[0],
        id: `overall-${index}-${normalise(records[0].phase)}-${normalise(records[0].name)}`,
        task_number: (() => {
          const taskNumbers = records
            .map(record => Number(record.task_number))
            .filter(value => Number.isFinite(value))
          return taskNumbers.length ? Math.min(...taskNumbers) : 0
        })(),
        start_date: startDate,
        finish_date: finishDate,
        duration_days: startDate && finishDate ? Math.max(1, differenceInDays(new Date(finishDate), new Date(startDate)) + 1) : records[0].duration_days,
        progress_pct: progress,
        status,
        rag: status === 'Completed' ? '' : redCount > 0 ? 'RED' : amberCount > 0 ? 'AMBER' : 'GREEN',
        dependencies: records.length > 1 ? 'Consolidated from package schedules' : records[0].dependencies,
        responsible: records.length > 1 ? 'Multiple delivery packages' : records[0].responsible,
        delivery_package_id: undefined,
        schedule_version_id: undefined,
        is_milestone: records.some(record => record.is_milestone),
        package_count: packageIds.size || records.length,
        completed_package_count: completedCount,
        discipline_summary: disciplines.join(', '),
      } as Task & { package_count: number; completed_package_count: number; discipline_summary: string }
    }).sort((a, b) => Number(a.task_number || 0) - Number(b.task_number || 0))
  }, [projectTasks, deliveryPackages])

  const disciplineTasks = disciplineTab === 'Overall'
    ? overallTasks
    : projectTasks.filter(task => ((task as any).discipline || 'Housebuild') === disciplineTab)
  const tasks: Task[] = selectedPackageId === 'all'
    ? disciplineTasks
    : disciplineTasks.filter(task => task.delivery_package_id === selectedPackageId)

  const PHASES: string[] = useMemo(() => [
    'All',
    ...Array.from(new Set(tasks.map(task => task.phase).filter((phase): phase is string => Boolean(phase)))),
  ], [tasks])

  useEffect(() => {
    setPhaseFilter('All')
    setRagFilter('')
    setStatusFilter('')
    setSearch('')
    setSelectedPackageId('all')
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
    try {
      await uploadBackup(file, activeDiscipline, selectedPackageId)
      pmoToast({ title: 'Schedule backup uploaded', message: `${activeDiscipline} schedule backup uploaded successfully.`, tone: 'success' })
    } catch (error) {
      pmoToast({ title: 'Backup upload failed', message: error instanceof Error ? error.message : 'Unable to upload backup.', tone: 'error' })
    }
    finally { event.target.value = '' }
  }
  const handleScheduleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManageScheduleUpload || !activeDiscipline) { event.target.value = ''; return }
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const count = await importExcel(file, activeDiscipline, selectedPackageId)
      pmoToast({ title: 'Excel schedule imported', message: `${count} ${activeDiscipline} Excel tasks imported successfully.`, tone: 'success' })
    } catch (error) {
      pmoToast({ title: 'Excel import failed', message: error instanceof Error ? error.message : 'Unable to import Excel schedule.', tone: 'error' })
    }
    finally { event.target.value = '' }
  }
  const handleXmlScheduleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManageScheduleUpload || !activeDiscipline) { event.target.value = ''; return }
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const count = await importXml(file, activeDiscipline, selectedPackageId)
      pmoToast({ title: 'MS Project schedule imported', message: `${count} ${activeDiscipline} MS Project XML tasks imported successfully.`, tone: 'success' })
    } catch (error) {
      pmoToast({ title: 'XML import failed', message: error instanceof Error ? error.message : 'Unable to import MS Project XML.', tone: 'error' })
    }
    finally { event.target.value = '' }
  }

  const packageSummaries = useMemo(() => deliveryPackages.map(pkg => {
    const packageTasks = projectTasks.filter(task => task.delivery_package_id === pkg.id)
    const total = packageTasks.length
    const progress = total ? Math.round(packageTasks.reduce((sum, task) => sum + getTaskProgress(task), 0) / total) : 0
    const delayed = packageTasks.filter(task => getRag(task) === 'RED').length
    const atRisk = packageTasks.filter(task => getRag(task) === 'AMBER').length
    const health = delayed > Math.max(3, total * 0.2) ? 'Critical' : delayed > 0 || atRisk > Math.max(2, total * 0.15) ? 'Watch' : 'Healthy'
    return { ...pkg, total, progress, delayed, atRisk, health }
  }), [deliveryPackages, projectTasks])

  const resetPackageForm = () => {
    setEditingPackage(null)
    setPackageError('')
    setPackageForm({ name: '', code: '', discipline: 'Housebuild', package_type: 'Block', contractor_name: '', weight_pct: 0 })
  }

  const openCreatePackage = (discipline?: ScheduleDiscipline) => {
    resetPackageForm()
    if (discipline) setPackageForm(prev => ({ ...prev, discipline, package_type: discipline === 'Housebuild' ? 'Block' : 'Shared' }))
    setShowPackageModal(true)
  }

  const openEditPackage = (pkg: DeliveryPackage) => {
    setEditingPackage(pkg)
    setPackageError('')
    setPackageForm({ name: pkg.name, code: pkg.code || '', discipline: pkg.discipline, package_type: pkg.package_type, contractor_name: pkg.contractor_name || '', weight_pct: Number(pkg.weight_pct || 0) })
    setShowPackageModal(true)
  }

  const saveDeliveryPackage = async () => {
    setPackageError('')
    if (!packageForm.name.trim()) { setPackageError('Package or block name is required.'); return }
    try {
      const payload = { ...packageForm, is_shared: packageForm.discipline !== 'Housebuild' || packageForm.package_type === 'Shared' }
      const wasEditing = Boolean(editingPackage)
      const saved = editingPackage
        ? await updateDeliveryPackage.mutateAsync({ id: editingPackage.id, input: payload })
        : await createDeliveryPackage.mutateAsync(payload)
      setShowPackageModal(false)
      resetPackageForm()
      setDisciplineTab(saved.discipline)
      setSelectedPackageId(saved.id)
      pmoToast({ title: wasEditing ? 'Delivery package updated' : 'Delivery package created', message: `${saved.name} is ready for schedule control.`, tone: 'success' })
    } catch (error) { setPackageError(error instanceof Error ? error.message : 'Unable to save delivery package.') }
  }

  const archivePackage = async (pkg: DeliveryPackage) => {
    const confirmed = await pmoConfirm({ title: `Archive ${pkg.name}?`, message: 'The package and its schedule will be removed from active project views, but all records will be preserved and can be restored by an administrator.', tone: 'warning', confirmLabel: 'Archive package', cancelLabel: 'Keep active' })
    if (!confirmed) return
    try {
      await archiveDeliveryPackage.mutateAsync({ id: pkg.id })
      if (selectedPackageId === pkg.id) setSelectedPackageId('all')
      pmoToast({ title: 'Package archived', message: `${pkg.name} has been moved to the archive.`, tone: 'success' })
    } catch (error) { pmoToast({ title: 'Archive failed', message: error instanceof Error ? error.message : 'Unable to archive package.', tone: 'error' }) }
  }

  const restorePackage = async (pkg: DeliveryPackage) => {
    try {
      await archiveDeliveryPackage.mutateAsync({ id: pkg.id, restore: true })
      pmoToast({ title: 'Package restored', message: `${pkg.name} is active again.`, tone: 'success' })
    } catch (error) { pmoToast({ title: 'Restore failed', message: error instanceof Error ? error.message : 'Unable to restore package.', tone: 'error' }) }
  }

  const permanentlyDeletePackage = async (pkg: DeliveryPackage) => {
    const typed = await pmoPrompt({ title: `Permanently delete ${pkg.name}?`, message: 'This permanently removes the delivery package, every schedule revision and every task attached to it. This action cannot be undone.', tone: 'error', inputLabel: `Type “${pkg.name}” to confirm`, placeholder: pkg.name, required: true, confirmLabel: 'Permanently delete', cancelLabel: 'Cancel' })
    if (typed !== pkg.name) {
      if (typed !== null) pmoToast({ title: 'Name did not match', message: 'The delivery package was not deleted.', tone: 'warning' })
      return
    }
    try {
      await deleteDeliveryPackage.mutateAsync(pkg.id)
      pmoToast({ title: 'Package permanently deleted', message: `${pkg.name} and all attached schedule records have been removed.`, tone: 'success' })
    } catch (error) { pmoToast({ title: 'Delete failed', message: error instanceof Error ? error.message : 'Unable to permanently delete package.', tone: 'error' }) }
  }

  const initialPageLoading = tasksLoading || deliveryPackagesLoading || qualityGatesLoading

  if (initialPageLoading) {
    return (
      <div className="min-h-screen bg-[#f6f5f1] -m-4 p-4 sm:-m-6 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px] space-y-5" aria-busy="true" aria-label="Loading schedule">
          <section className="overflow-hidden rounded-[24px] border border-[#dfe3e7] bg-white">
            <div className="grid lg:grid-cols-[1fr_320px]">
              <div className="animate-pulse p-6 sm:p-8 lg:p-10">
                <div className="h-3 w-48 rounded bg-[#e8edf0]" />
                <div className="mt-8 h-10 w-80 max-w-full rounded bg-[#e8edf0]" />
                <div className="mt-3 h-4 w-28 rounded bg-[#eef2f4]" />
                <div className="mt-10 h-4 w-full max-w-3xl rounded bg-[#eef2f4]" />
                <div className="mt-3 h-4 w-4/5 max-w-2xl rounded bg-[#eef2f4]" />
                <div className="mt-8 flex gap-2">
                  {[0, 1, 2, 3].map(item => <div key={item} className="h-9 w-24 rounded-full bg-[#eef2f4]" />)}
                </div>
              </div>
              <div className="min-h-[270px] animate-pulse bg-[#0B2A3C] p-7">
                <div className="h-3 w-32 rounded bg-white/20" />
                <div className="mt-6 h-16 w-28 rounded bg-white/15" />
                <div className="mt-8 h-2 w-full rounded-full bg-white/15" />
                <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
                  <div className="h-12 rounded bg-white/10" /><div className="h-12 rounded bg-white/10" />
                </div>
              </div>
            </div>
          </section>
          <section className="animate-pulse rounded-2xl border border-[#dfe3e7] bg-white p-6">
            <div className="h-4 w-52 rounded bg-[#e8edf0]" />
            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map(item => <div key={item} className="h-36 rounded-2xl bg-[#f0f3f5]" />)}
            </div>
          </section>
        </div>
      </div>
    )
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
              {disciplineTab !== 'Overall' && <div className="mt-5 flex flex-wrap items-center gap-2">
                <button onClick={() => setSelectedPackageId('all')} className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${selectedPackageId === 'all' ? 'bg-[#eaf1f7] text-[#123a60]' : 'border border-[#dfe3e7] text-[#536170]'}`}>All {disciplineTab}</button>
                {disciplinePackages.map(pkg => <button key={pkg.id} onClick={() => setSelectedPackageId(pkg.id)} className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${selectedPackageId === pkg.id ? 'bg-[#123a60] text-white' : 'border border-[#dfe3e7] bg-white text-[#536170]'}`}>{pkg.name}</button>)}
                {canConfigurePackages && <button onClick={() => openCreatePackage(disciplineTab)} className="rounded-xl border border-dashed border-[#ff9b83] px-3.5 py-2 text-xs font-semibold text-[#df5f41]"><Plus size={13} className="mr-1 inline" />Add package</button>}
              </div>}
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

        {disciplineTab === 'Overall' && <section className="rounded-2xl border border-[#dfe3e7] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6f7d89]">Delivery packages</div><h2 className="mt-2 text-xl font-semibold text-[#102943]">Blocks and shared workstreams</h2><p className="mt-1 text-sm text-[#6f7d89]">Each contractor programme remains separate while progress rolls up to the project.</p></div>{canConfigurePackages && <button onClick={() => openCreatePackage()} className="rounded-xl bg-[#123a60] px-4 py-2.5 text-xs font-semibold text-white"><Plus size={14} className="mr-1.5 inline" />Create package</button>}</div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {packageSummaries.map(pkg => <article key={pkg.id} onClick={() => { setDisciplineTab(pkg.discipline); setSelectedPackageId(pkg.id) }} className="group cursor-pointer rounded-2xl border border-[#dfe3e7] p-4 text-left transition hover:border-[#8fb0c7] hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#eaf1f7] p-2 text-[#1f668f]">{pkg.package_type === 'Block' ? <Building2 size={18}/> : <Layers3 size={18}/>}</div><div><div className="font-semibold text-[#102943]">{pkg.name}</div><div className="mt-0.5 text-xs text-[#7a8792]">{pkg.contractor_name || pkg.discipline}</div></div></div><div className="flex items-center gap-1.5"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${pkg.health === 'Critical' ? 'bg-red-50 text-red-700' : pkg.health === 'Watch' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{pkg.health}</span>{canAdministerPackages && <><button title="Edit package" onClick={event => { event.stopPropagation(); openEditPackage(pkg) }} className="rounded-lg p-2 text-[#31526d] hover:bg-[#eaf1f7]"><Pencil size={15}/></button><button title="Archive package" onClick={event => { event.stopPropagation(); void archivePackage(pkg) }} className="rounded-lg p-2 text-[#df5f41] hover:bg-[#fff2ec]"><Archive size={15}/></button></>}</div></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#edf0f2] pt-3 text-xs"><div><div className="font-semibold text-[#102943]">{pkg.progress}%</div><div className="text-[#8a96a0]">Progress</div></div><div><div className="font-semibold text-[#102943]">{pkg.total}</div><div className="text-[#8a96a0]">Activities</div></div><div><div className={pkg.delayed ? 'font-semibold text-red-600' : 'font-semibold text-[#102943]'}>{pkg.delayed}</div><div className="text-[#8a96a0]">Delayed</div></div></div></article>)}
            {!packageSummaries.length && <div className="col-span-full rounded-2xl border border-dashed border-[#cfdbe3] p-8 text-center text-sm text-[#788591]">No delivery packages yet. Create blocks for Housebuild and shared packages for Infrastructure and External MEP.</div>}
          </div>
        </section>}

        {canAdministerPackages && archivedDeliveryPackages.length > 0 && <section className="rounded-2xl border border-[#dfe3e7] bg-white p-5 sm:p-6"><button onClick={() => setShowArchivedPackages(value => !value)} className="flex w-full items-center justify-between text-left"><div><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6f7d89]">Admin archive</div><h2 className="mt-2 text-lg font-semibold text-[#102943]">Archived delivery packages ({archivedDeliveryPackages.length})</h2></div><Archive size={18} className="text-[#6f7d89]"/></button>{showArchivedPackages && <div className="mt-5 divide-y divide-[#edf0f2] rounded-2xl border border-[#e2e7eb]">{archivedDeliveryPackages.map(pkg => <div key={pkg.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="font-semibold text-[#102943]">{pkg.name}</div><div className="mt-1 text-xs text-[#7a8792]">{pkg.discipline} · {pkg.contractor_name || 'No contractor recorded'} · archived {pkg.archived_at ? fdate(pkg.archived_at) : ''}</div></div><div className="flex gap-2"><button onClick={() => void restorePackage(pkg)} className="inline-flex items-center gap-2 rounded-xl border border-[#cfdbe3] px-3 py-2 text-xs font-semibold text-[#123a60] hover:bg-[#eef4f7]"><RotateCcw size={14}/>Restore</button><button onClick={() => void permanentlyDeletePackage(pkg)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"><Trash2 size={14}/>Permanently delete</button></div></div>)}</div>}</section>}

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
                {disciplineTab === 'Overall' && <col className="w-[9%]" />}
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
              <thead className="sticky top-0 z-10 bg-[#f7f8f8] text-[8px] font-semibold uppercase tracking-[0.08em] text-[#74818d] xl:text-[9px]"><tr><th className="px-2 py-3">WBS</th><th className="px-2 py-3">Activity</th>{disciplineTab === 'Overall' && <th className="px-2 py-3">Coverage</th>}<th className="px-2 py-3">Dependencies</th><th className="px-2 py-3">Start</th><th className="px-2 py-3">Finish</th><th className="px-2 py-3">Duration</th><th className="px-2 py-3">Procurement</th><th className="px-2 py-3">Approval</th><th className="px-2 py-3">Health</th><th className="px-2 py-3">Status</th><th className="px-2 py-3">Progress</th><th className="px-2 py-3">Owner</th><th className="px-2 py-3"></th></tr></thead>
              <tbody>
                {tasksLoading ? <tr><td colSpan={disciplineTab === 'Overall' ? 14 : 13} className="px-2 py-12 text-center text-[#7c8892]">Loading schedule…</td></tr> : Object.entries(grouped).length === 0 ? <tr><td colSpan={disciplineTab === 'Overall' ? 14 : 13} className="px-2 py-12 text-center text-[#7c8892]">No activities match this view.</td></tr> : Object.entries(grouped).map(([phase, phaseTasks]) => <Fragment key={phase}>
                  <tr className="border-y border-[#e5e8eb] bg-[#eef3f6]"><td colSpan={disciplineTab === 'Overall' ? 14 : 13} className="px-2 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#123a60]">{phase}</td></tr>
                  {phaseTasks.map(task => {
                    const rag = task.status === 'Completed' ? 'DONE' : getRag(task) || computeRAG(task)
                    const procDays = task.procurement_deadline ? differenceInDays(new Date(task.procurement_deadline), today) : null
                    const apprDays = task.approval_deadline ? differenceInDays(new Date(task.approval_deadline), today) : null
                    const tone = rag === 'RED' ? 'bg-red-50 text-red-700 border-red-200' : rag === 'AMBER' ? 'bg-amber-50 text-amber-700 border-amber-200' : rag === 'DONE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                    return <tr key={task.id} className="border-b border-[#edf0f2] hover:bg-[#fafbfb]">
                      <td className="px-2 py-3 font-mono text-[9px] text-[#86919a]">{task.task_number}</td>
                      <td className="px-2 py-3"><div className="break-words font-medium leading-4 text-[#26384a]">{task.name}{task.is_milestone && <span className="ml-1.5 text-[#ff7657]">◆</span>}</div></td>
                      {disciplineTab === 'Overall' && <td className="px-2 py-3"><div className="font-semibold text-[#31526d]">{(task as any).package_count || 1} package{((task as any).package_count || 1) === 1 ? '' : 's'}</div><div className="mt-0.5 text-[9px] text-[#8a96a0]">{(task as any).completed_package_count || 0} complete</div></td>}
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

      {modalTask !== null && canManageScheduleUpload && <TaskModal task={modalTask === 'new' ? null : modalTask} onClose={() => setModalTask(null)} deliveryPackageId={selectedPackageId !== 'all' ? selectedPackageId : undefined} discipline={activeDiscipline} />}

      {showPackageModal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102943]/45 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) { setShowPackageModal(false); resetPackageForm() } }}><div className="w-full max-w-xl overflow-hidden rounded-[24px] bg-white shadow-2xl"><div className="h-1.5 bg-[#ff7657]"/><div className="flex items-start justify-between border-b border-[#e5e8eb] p-6"><div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#df5f41]">Schedule structure</div><h2 className="mt-2 text-2xl font-semibold text-[#102943]">{editingPackage ? 'Edit delivery package' : 'Create delivery package'}</h2><p className="mt-1 text-sm text-[#6f7d89]">{editingPackage ? 'Correct the package details without losing its schedule history.' : 'Create a block or a shared Infrastructure / External MEP workstream.'}</p></div><button onClick={() => { setShowPackageModal(false); resetPackageForm() }} className="rounded-lg p-2 text-[#6f7d89] hover:bg-[#f2f5f7]"><X size={18}/></button></div><div className="grid gap-4 p-6 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-xs font-semibold text-[#536170]">Package or block name</span><input value={packageForm.name} onChange={e => setPackageForm({...packageForm,name:e.target.value})} placeholder="e.g. Block A1" className="mt-2 w-full rounded-xl border border-[#dfe3e7] px-4 py-3 text-sm outline-none focus:border-[#123a60]"/></label><label><span className="text-xs font-semibold text-[#536170]">Discipline</span><select value={packageForm.discipline} onChange={e => setPackageForm({...packageForm,discipline:e.target.value as ScheduleDiscipline,package_type:e.target.value === 'Housebuild' ? 'Block' : 'Shared'})} className="mt-2 w-full rounded-xl border border-[#dfe3e7] px-4 py-3 text-sm"><option>Housebuild</option><option>Infrastructure</option><option>MEP</option></select></label><label><span className="text-xs font-semibold text-[#536170]">Package type</span><select value={packageForm.package_type} onChange={e => setPackageForm({...packageForm,package_type:e.target.value as any})} className="mt-2 w-full rounded-xl border border-[#dfe3e7] px-4 py-3 text-sm"><option>Block</option><option>Shared</option><option>Other</option></select></label><label><span className="text-xs font-semibold text-[#536170]">Code</span><input value={packageForm.code} onChange={e => setPackageForm({...packageForm,code:e.target.value})} placeholder="PV-A1" className="mt-2 w-full rounded-xl border border-[#dfe3e7] px-4 py-3 text-sm"/></label><label><span className="text-xs font-semibold text-[#536170]">Contractor</span><input value={packageForm.contractor_name} onChange={e => setPackageForm({...packageForm,contractor_name:e.target.value})} placeholder="Contractor name" className="mt-2 w-full rounded-xl border border-[#dfe3e7] px-4 py-3 text-sm"/></label><label className="sm:col-span-2"><span className="text-xs font-semibold text-[#536170]">Project weighting (%)</span><input type="number" min="0" max="100" value={packageForm.weight_pct} onChange={e => setPackageForm({...packageForm,weight_pct:Number(e.target.value)})} className="mt-2 w-full rounded-xl border border-[#dfe3e7] px-4 py-3 text-sm"/><span className="mt-1 block text-xs text-[#8a96a0]">Used later for weighted project progress. It can be adjusted as the package structure is confirmed.</span></label>{packageError && <div className="sm:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{packageError}</div>}</div><div className="flex justify-end gap-3 border-t border-[#e5e8eb] p-5"><button onClick={() => { setShowPackageModal(false); resetPackageForm() }} className="rounded-xl border border-[#dfe3e7] px-4 py-2.5 text-sm font-semibold text-[#536170]">Cancel</button><button onClick={saveDeliveryPackage} disabled={createDeliveryPackage.isPending || updateDeliveryPackage.isPending} className="rounded-xl bg-[#123a60] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{createDeliveryPackage.isPending || updateDeliveryPackage.isPending ? 'Saving…' : editingPackage ? 'Save changes' : 'Create package'}</button></div></div></div>}
    </div>
  )
}
