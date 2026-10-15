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
    const last = packageTasks.reduce<(typeof packageTasks)[number] | null>((latest, task) =>
      !latest || Date.parse(task.finish_date!) > Date.parse(latest.finish_date!) ? task : latest, null)
    const scheduleFinish = last?.finish_date || null
    return { id: pkg.id, name: pkg.name, status: pkg.status,
      planned_finish: scheduleFinish, programme_finish: scheduleFinish,
      source: scheduleFinish ? 'Final scheduled task' : 'Missing schedule finish' }
  }).filter(pkg => pkg.planned_finish)
    .sort((a,b) => Date.parse(a.planned_finish!) - Date.parse(b.planned_finish!)),
    [packagesQuery.data, tasksQuery.data])
  return { data: handovers, isLoading: packagesQuery.isLoading || tasksQuery.isLoading,
    isError: packagesQuery.isError || tasksQuery.isError }
}
