import { useMemo } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useDeliveryPackages } from './deliveryPackages'

/** Resolve each package's handover from its own target or linked programme. */
export function usePackageHandoverDates() {
  const packagesQuery = useDeliveryPackages()
  const tasksQuery = useTasks()
  const handovers = useMemo(() => (packagesQuery.data || []).map(pkg => {
    const packageTasks = (tasksQuery.data || []).filter(task =>
      String(task.delivery_package_id || '') === String(pkg.id) &&
      task.finish_date && !Number.isNaN(Date.parse(task.finish_date)))
    const milestones = packageTasks.filter(task => /handover|demobili[sz]ation|practical completion/i.test(task.name))
    const candidates = milestones.length ? milestones : packageTasks
    const scheduleFinish = candidates.reduce<string | null>((latest, task) =>
      !latest || Date.parse(task.finish_date!) > Date.parse(latest) ? task.finish_date! : latest, null)
    const target = pkg.planned_finish && !Number.isNaN(Date.parse(pkg.planned_finish)) ? pkg.planned_finish : null
    const finish = target || scheduleFinish
    return { id: pkg.id, name: pkg.name, status: pkg.status, planned_finish: finish,
      source: target ? 'Package target' : scheduleFinish ? 'Package schedule' : 'Missing date' }
  }).filter(pkg => pkg.planned_finish)
    .sort((a, b) => Date.parse(a.planned_finish!) - Date.parse(b.planned_finish!)), [packagesQuery.data, tasksQuery.data])
  return { data: handovers, isLoading: packagesQuery.isLoading || tasksQuery.isLoading,
    isError: packagesQuery.isError || tasksQuery.isError }
}
