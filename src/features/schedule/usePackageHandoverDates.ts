import { useMemo } from 'react'
import { useTasks } from '@/hooks/useTasks'
import { useDeliveryPackages } from './deliveryPackages'

export function usePackageHandoverDates() {
  const packagesQuery = useDeliveryPackages()
  const tasksQuery = useTasks()

  const allPackageDates = useMemo(() => {
    const tasks = tasksQuery.data ?? []

    return (packagesQuery.data ?? []).map(pkg => {
      const finish = tasks.reduce<string | null>((latest, task) => {
        if (String(task.delivery_package_id ?? '') !== String(pkg.id)) {
          return latest
        }

        const date = task.finish_date
        if (!date || !Number.isFinite(Date.parse(date))) return latest

        return latest === null || Date.parse(date) > Date.parse(latest)
          ? date
          : latest
      }, null)

      return {
        id: pkg.id,
        name: pkg.name,
        status: pkg.status,
        planned_finish: finish,
        programme_finish: finish,
        source: finish ? 'Latest scheduled activity finish' : 'Missing schedule finish',
      }
    }).sort((a, b) => {
      if (!a.planned_finish) return b.planned_finish ? 1 : 0
      if (!b.planned_finish) return -1
      return Date.parse(a.planned_finish) - Date.parse(b.planned_finish)
    })
  }, [packagesQuery.data, tasksQuery.data])

  return {
    data: allPackageDates.filter(pkg => pkg.planned_finish !== null),
    missingProgrammePackages: allPackageDates.filter(pkg => pkg.planned_finish === null),
    totalPackages: allPackageDates.length,
    isLoading: packagesQuery.isLoading || tasksQuery.isLoading,
    isError: packagesQuery.isError || tasksQuery.isError,
  }
}
