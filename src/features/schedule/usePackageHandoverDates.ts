import { useMemo } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useDeliveryPackages } from './deliveryPackages'

/** Derive each package’s programme finish from its latest activity finish. */
export function usePackageHandoverDates() {
  const packagesQuery = useDeliveryPackages()
  const tasksQuery = useTasks()
  const allPackageDates = useMemo(() => (packagesQuery.data || []).map(pkg => {
    const scheduleFinish = (tasksQuery.data ?? []).reduce<string | null>((latest, task) => {
      if (String(task.delivery_package_id ?? '') !== String(pkg.id)) return latest
      const finish = task.finish_date
      if (!finish || !Number.isFinite(Date.parse(finish))) return latest
      return latest === null || Date.parse(finish) > Date.parse(latest) ? finish : latest
    }, null)
    return { id: pkg.id, name: pkg.name, status: pkg.status,
      planned_finish: scheduleFinish, programme_finish: scheduleFinish,
      source: scheduleFinish ? 'Latest scheduled activity finish' : 'Missing schedule finish' }
  }).sort((a,b) => {
      if (!a.planned_finish) return 1
      if (!b.planned_finish) return -1
      return Date.parse(a.planned_finish) - Date.parse(b.planned_finish)
    }),
    [packagesQuery.data, tasksQuery.data])
  const handovers = allPackageDates.filter(pkg => Boolean(pkg.planned_finish))
  const missingProgrammePackages = allPackageDates.filter(pkg => !pkg.planned_finish)
  return { data: handovers, missingProgrammePackages, totalPackages: allPackageDates.length, isLoading: packagesQuery.isLoading || tasksQuery.isLoading,
    isError: packagesQuery.isError || tasksQuery.isError }
}
