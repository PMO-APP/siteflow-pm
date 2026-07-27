export type ProjectState = {
  project: {
    id: string
    name: string
    organizationId: string | null
    portfolioId: string | null
    scope: string | null
    startDate: string | null
    targetDate: string | null
    handoverDate: string | null
    status: string | null
  }
  schedule: {
    activities: Array<{
      id: string
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
      deliveryPackageId: string | null
      deliveryPackageName: string | null
    }>
    totalActivities: number
    completedActivities: number
    overdueActivities: number
    weightedProgress: number
    plannedProgress: number
    variancePercent: number
    startDate: string | null
    finishDate: string | null
    lastUpdatedAt: string | null
    packages: Array<{
      id: string
      name: string
      discipline: string | null
      contractorName: string | null
      weight: number
      packageType: string | null
    }>
  }
  commercial: {
    contractSum: number
    approvedVariations: number
    pendingVariations: number
    paidToDate: number
    pendingPayments: number
    projectedFinalCost: number
  }
  quality: {
    openSnags: number
    criticalSnags: number
    closedSnags: number
    failedInspections: number
    overdueInspections: number
  }
  risk: {
    openRisks: number
    highRisks: number
    unmitigatedHighRisks: number
  }
  approvals: {
    pendingApprovals: number
    overdueApprovals: number
    approvedApprovals: number
  }
  procurement: {
    atRiskItems: number
    overdueItems: number
    completedItems: number
    totalItems: number
  }
  hse: {
    incidents: number
    openActions: number
    overdueActions: number
  }
  reports: {
    weeklyReportSubmitted: boolean
    costReportSubmitted: boolean
    designReportSubmitted: boolean
  }
  documents: {
    awaitingReview: number
    approved: number
    uploadedThisWeek: number
  }
  generatedAt: string
}
