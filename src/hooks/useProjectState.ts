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

  const state = useMemo(
    () =>
      normalizeProjectState({
        project,
        tasks: tasks.data || [],
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
      financial.isLoading,
    isError:
      tasks.isError ||
      approvals.isError ||
      procurement.isError ||
      risks.isError ||
      snags.isError ||
      financial.isError,
  }
}
