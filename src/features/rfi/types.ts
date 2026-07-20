export type RFIStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Answered' | 'Closed' | 'Rejected'
export type RFIPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type RFIDiscipline = 'Architectural' | 'Structural' | 'MEP' | 'Civil' | 'Commercial' | 'HSE' | 'General'

export interface RFI {
  id: string
  reference_no: string
  project_id: number
  organization_id: string | null
  title: string
  question: string
  response: string | null
  discipline: RFIDiscipline
  priority: RFIPriority
  status: RFIStatus
  assigned_to: string | null
  due_date: string | null
  created_by: string
  submitted_at: string | null
  answered_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface RFIComment {
  id: string
  rfi_id: string
  body: string
  author_id: string
  author_name: string | null
  created_at: string
  updated_at: string
}

export type RFIHistoryEventType =
  | 'created'
  | 'submitted'
  | 'status_changed'
  | 'answered'
  | 'closed'
  | 'comment_added'
  | 'updated'

export interface RFIHistoryEvent {
  id: string
  rfi_id: string
  event_type: RFIHistoryEventType
  from_status: RFIStatus | null
  to_status: RFIStatus | null
  description: string
  actor_id: string | null
  actor_name: string | null
  created_at: string
}

export type CreateRFIInput = Pick<RFI, 'project_id'|'title'|'question'|'discipline'|'priority'> & {
  organization_id?: string | null
  assigned_to?: string | null
  due_date?: string | null
}
