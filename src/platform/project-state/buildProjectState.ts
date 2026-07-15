import type { ProjectState } from './types'
import { loadProject } from './loaders/projectLoader'
import { loadSchedule } from './loaders/scheduleLoader'
import { loadApprovals } from './loaders/approvalsLoader'
import { loadProcurement } from './loaders/procurementLoader'
import { loadRisks } from './loaders/riskLoader'
import { loadQuality } from './loaders/qualityLoader'
import { loadCommercial } from './loaders/commercialLoader'

export async function buildProjectState(
  projectId: string | number
): Promise<ProjectState> {
  const [project, schedule, approvals, procurement, risks, quality, commercial] =
    await Promise.all([
      loadProject(projectId),
      loadSchedule(projectId),
      loadApprovals(projectId),
      loadProcurement(projectId),
      loadRisks(projectId),
      loadQuality(projectId),
      loadCommercial(projectId),
    ])

  return Object.freeze({
    project,
    schedule,
    approvals,
    procurement,
    risks,
    quality,
    commercial,
    hse: { incidents: 0, openActions: 0, overdueActions: 0 },
    documents: { awaitingReview: 0, approved: 0, uploadedThisWeek: 0 },
    reports: {
      latestWeeklyReport: null,
      latestCostReport: null,
      latestDesignReport: null,
    },
    generatedAt: new Date().toISOString(),
  })
}
