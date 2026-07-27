import { useMemo } from 'react'
import { useTasks } from '@/hooks/useTasks'
import {
  useApprovals,
  useFinancial,
  useProcurement,
  useRisks,
  useSnags,
} from '@/hooks/useData'
import { normalizeProjectState } from '@/core/intelligence/normalizers/projectStateNormalizer'
import { useDeliveryPackages } from '@/features/schedule'

export function useProjectState({
  project,
  latestWeeklyReport,
  latestCostReport,
  latestDesignReport,
  documents,
  hse,
  inspections,
}: {
  project?: any
  latestWeeklyReport?: any
  latestCostReport?: any
  latestDesignReport?: any
  documents?: any
  hse?: any
  inspections?: any[]
} = {}) {
  const tasks = useTasks()
  const approvals = useApprovals()
  const procurement = useProcurement()
  const risks = useRisks()
  const snags = useSnags()
  const financial = useFinancial()
  const deliveryPackages = useDeliveryPackages()

  const state = useMemo(
    () =>
      normalizeProjectState({
        project,
        tasks: tasks.data || [],
        deliveryPackages: deliveryPackages.data || [],
        approvals: approvals.data || [],
        procurement: procurement.data || [],
        risks: risks.data || [],
        snags: snags.data || [],
        financial: financial.data || [],
        latestWeeklyReport,
        latestCostReport,
        latestDesignReport,
        documents,
        hse,
        inspections,
      }),
    [
      project,
      tasks.data,
      deliveryPackages.data,
      approvals.data,
      procurement.data,
      risks.data,
      snags.data,
      financial.data,
      latestWeeklyReport,
      latestCostReport,
      latestDesignReport,
      documents,
      hse,
      inspections,
    ]
  )

  return {
    state,
    isLoading:
      tasks.isLoading ||
      approvals.isLoading ||
      procurement.isLoading ||
      risks.isLoading ||
      snags.isLoading ||
      financial.isLoading ||
      deliveryPackages.isLoading,
    isError:
      tasks.isError ||
      approvals.isError ||
      procurement.isError ||
      risks.isError ||
      snags.isError ||
      financial.isError ||
      deliveryPackages.isError,
  }
}
