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

export type CreateRFIInput = Pick<RFI, 'project_id'|'title'|'question'|'discipline'|'priority'> & {
  organization_id?: string | null
  assigned_to?: string | null
  due_date?: string | null
}
