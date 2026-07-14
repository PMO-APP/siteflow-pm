import { useMemo } from 'react'
import { useProjectIntelligence } from '@/hooks/useProjectIntelligence'
import { calculateTodayFocus } from '@/core/focus/todayFocusEngine'

export function useTodayFocus({
  project,
}: {
  project?: any
} = {}) {
  const intelligence = useProjectIntelligence({
    project,
  })

  return useMemo(() => {
    return calculateTodayFocus({
      overdueTasks:
        intelligence.metrics.overdueTasks,
      overdueApprovals:
        intelligence.metrics.overdueApprovals,
      criticalSnags:
        intelligence.metrics.criticalSnags,
      highRisks:
        intelligence.metrics.highRisks,
      procurementRisks:
        intelligence.metrics.procurementRisks,
      governanceExceptions:
        intelligence.governance.exceptions,
      forecastDaysBehind:
        intelligence.forecast.daysBehind,
      scheduleProgress:
        intelligence.metrics.scheduleProgress,
      plannedProgress:
        intelligence.metrics.plannedProgress,
    })
  }, [intelligence])
}
