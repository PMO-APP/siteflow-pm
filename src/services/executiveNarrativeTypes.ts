
export type ExecutiveNarrativeFormat =
  | 'board_summary'
  | 'ceo_briefing'
  | 'weekly_pmo'
  | 'project_director'
  | 'risk_recovery'
  | 'dashboard_paragraph'
  | 'detailed_management'

export type NarrativeConfidence = 'high' | 'medium' | 'low'
export type NarrativeInsightStatus = 'proposed' | 'accepted' | 'rejected' | 'locked'

export type NarrativeEvidence = {
  id: string
  projectId: number | null
  projectName: string | null
  sourceModule: string
  recordId: string | null
  metric: string
  condition: string
  value: string
  timestamp: string
  confidence: NarrativeConfidence
  actionUrl: string | null
}

export type NarrativeInsight = {
  id: string
  category: string
  headline: string
  statement: string
  severity: 'positive' | 'neutral' | 'warning' | 'critical'
  confidence: NarrativeConfidence
  evidenceIds: string[]
  status: NarrativeInsightStatus
  suggestedAction: string | null
}

export type NarrativePeriodComparison = {
  improved: string[]
  deteriorated: string[]
  newIssues: string[]
  resolvedIssues: string[]
  metricChanges: Record<string, { previous: number | string | null; current: number | string | null }>
}

export type ExecutiveNarrativeDraft = {
  id?: string
  workspaceId: string
  reportId?: string | null
  format: ExecutiveNarrativeFormat
  title: string
  narrative: string
  managementCommentary: string
  insights: NarrativeInsight[]
  evidence: NarrativeEvidence[]
  comparison: NarrativePeriodComparison
  mode: 'deterministic' | 'ai_assisted'
  status: 'draft' | 'approved'
  generatedAt: string
  approvedAt?: string | null
  approvedBy?: string | null
}

export type NarrativeBuildInput = {
  workspaceId: string
  format: ExecutiveNarrativeFormat
  reportId?: string | null
  projectId?: number | string | null
  previousReportId?: string | null
  mode?: 'deterministic' | 'ai_assisted'
}
