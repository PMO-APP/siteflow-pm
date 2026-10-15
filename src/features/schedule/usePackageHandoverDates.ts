import { useMemo } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useDeliveryPackages } from './deliveryPackages'

/** The handover is the last dated task in the package programme, not a separately entered target. */
export function usePackageHandoverDates() {
  const packagesQuery = useDeliveryPackages()
  const tasksQuery = useTasks()
  const handovers = useMemo(() => (packagesQuery.data || []).map(pkg => {
    const packageTasks = (tasksQuery.data || []).filter(task =>
      String(task.delivery_package_id || '') === String(pkg.id) &&
      task.finish_date && !Number.isNaN(Date.parse(task.finish_date)))
    // The package handover is a named schedule milestone, NOT whichever task
    // happens to have the greatest finish date. Late-dated unrelated tasks
    // must not move the scheduled handover target.
    const handoverTasks = packageTasks.filter(task =>
      /(?:handover|hand[- ]?over|handing over)/i.test(task.name || ''))
    const byProgrammeOrder = (a: (typeof packageTasks)[number], b: (typeof packageTasks)[number]) =>
      (Number(a.task_number) || 0) - (Number(b.task_number) || 0)
    const last = handoverTasks.length
      ? [...handoverTasks].sort(byProgrammeOrder).at(-1)!
      : packageTasks.some(task => Number(task.task_number) > 0)
        ? [...packageTasks].sort(byProgrammeOrder).at(-1)!
        : packageTasks.reduce<(typeof packageTasks)[number] | null>((latest, task) =>
            !latest || Date.parse(task.finish_date!) > Date.parse(latest.finish_date!) ? task : latest, null)
    const scheduleFinish = last?.finish_date || null
    return { id: pkg.id, name: pkg.name, status: pkg.status,
      planned_finish: scheduleFinish, programme_finish: scheduleFinish,
      source: scheduleFinish ? (handoverTasks.length ? 'Scheduled handover task' : 'Final scheduled task (handover not named)') : 'Missing schedule finish' }
  }).filter(pkg => pkg.planned_finish)
    .sort((a,b) => Date.parse(a.planned_finish!) - Date.parse(b.planned_finish!)),
    [packagesQuery.data, tasksQuery.data])
  return { data: handovers, isLoading: packagesQuery.isLoading || tasksQuery.isLoading,
    isError: packagesQuery.isError || tasksQuery.isError }
}
