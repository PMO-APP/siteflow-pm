
export type BoardSessionStatus = 'draft' | 'live' | 'paused' | 'completed' | 'archived'
export type BoardDataMode = 'live' | 'frozen'
export type BoardSectionType =
  | 'cover' | 'executive_narrative' | 'portfolio_kpis' | 'rag_overview'
  | 'attention_queue' | 'financial_procurement' | 'risk_quality_hse'
  | 'decisions' | 'actions' | 'timeline'

export type BoardPackSection = {
  id: string
  type: BoardSectionType
  title: string
  visible: boolean
  presenterNotes: string
}

export type BoardSession = {
  id?: string
  workspaceId: string
  title: string
  meetingDate: string
  chairperson: string
  attendees: string[]
  reportId: string | null
  dataMode: BoardDataMode
  status: BoardSessionStatus
  sections: BoardPackSection[]
  meetingNotes: string
  sourceDataTimestamp: string | null
  startedAt: string | null
  closedAt: string | null
}

export type BoardDecision = {
  id?: string
  sessionId: string
  workspaceId: string
  projectId: string | null
  decision: string
  rationale: string
  ownerName: string
  dueDate: string | null
  priority: 'normal' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'completed'
  sectionType: string | null
}

export type BoardAction = {
  id?: string
  sessionId: string
  workspaceId: string
  projectId: string | null
  action: string
  ownerName: string
  ownerUserId: string | null
  dueDate: string | null
  escalationDate: string | null
  priority: 'normal' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'completed'
  completionEvidence: string
}
