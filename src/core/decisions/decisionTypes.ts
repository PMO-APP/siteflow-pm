export type DecisionStatus =
  | 'open'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'closed'

export type DecisionPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'

export type DecisionItem = {
  id: string
  project_id: string
  title: string
  description?: string | null
  module: string
  priority: DecisionPriority
  status: DecisionStatus
  route?: string | null
  owner_id?: string | null
  owner_name?: string | null
  due_date?: string | null
  created_at: string
}
