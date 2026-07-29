import { useMemo } from 'react'
import { useTasks } from '@/hooks/useTasks'
import {
  useApprovals,
  useFinancial,
  useProcurement,
  useQualityGates,
  useRisks,
  useSiteReports,
  useSnags,
} from '@/hooks/useData'
import { adaptProjectData } from '../adapters/ProjectDataAdapter'
import { runProjectIntelligence } from '../PIF'

export interface UseProjectIntelligenceOptions {
  projectId: string | number | null
  projectName?: string
  plannedFinish?: string
  currentProgress?: number
}

export function useProjectIntelligence(options: UseProjectIntelligenceOptions) {
  const tasks = useTasks()
  const procurement = useProcurement()
  const approvals = useApprovals()
  const risks = useRisks()
  const snags = useSnags()
  const financial = useFinancial()
  const qualityGates = useQualityGates()
  const siteReports = useSiteReports()

  const isLoading = [tasks, procurement, approvals, risks, snags, financial, qualityGates, siteReports]
    .some(query => query.isLoading)
  const error = [tasks, procurement, approvals, risks, snags, financial, qualityGates, siteReports]
    .map(query => query.error)
    .find(Boolean)

  const intelligence = useMemo(() => {
    if (!options.projectId) return null
    return runProjectIntelligence(adaptProjectData({
      projectId: options.projectId,
      projectName: options.projectName,
      plannedFinish: options.plannedFinish,
      currentProgress: options.currentProgress,
      tasks: tasks.data || [],
      procurement: procurement.data || [],
      approvals: approvals.data || [],
      risks: risks.data || [],
      snags: snags.data || [],
      financial: financial.data || [],
      qualityGates: qualityGates.data || [],
      siteReports: siteReports.data || [],
    }))
  }, [
    options.projectId,
    options.projectName,
    options.plannedFinish,
    options.currentProgress,
    tasks.data,
    procurement.data,
    approvals.data,
    risks.data,
    snags.data,
    financial.data,
    qualityGates.data,
    siteReports.data,
  ])

  return { intelligence, isLoading, error }
}
