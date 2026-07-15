export type ProjectSummary = {
  id: string
  name: string
  status: string | null
  scope: string | null
  startDate: string | null
  targetDate: string | null
  handoverDate: string | null
  organizationId: string | null
  portfolioId: string | null
}

export type ScheduleTaskState = {
  id: string
  projectId: string
  taskNumber: number
  name: string
  discipline: string | null
  phase: string | null
  status: string | null
  progress: number
  weight: number
  plannedStart: string | null
  plannedFinish: string | null
  actualStart: string | null
  actualFinish: string | null
  predecessorIds: string[]
  isCritical: boolean
  isBlocked: boolean
  updatedAt: string | null
}

export type ProjectState = {
  project: ProjectSummary
  schedule: ScheduleTaskState[]
  approvals: any[]
  procurement: any[]
  risks: any[]
  quality: any[]
  commercial: any[]
  hse: {
    incidents: number
    openActions: number
    overdueActions: number
  }
  documents: {
    awaitingReview: number
    approved: number
    uploadedThisWeek: number
  }
  reports: {
    latestWeeklyReport: unknown | null
    latestCostReport: unknown | null
    latestDesignReport: unknown | null
  }
  generatedAt: string
}
