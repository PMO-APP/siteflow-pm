export type UserRole = 'admin' | 'pm' | 'engineer' | 'contractor' | 'client' | 'viewer'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  company?: string
  phone?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Blocked'
export type RAG = 'RED' | 'AMBER' | 'GREEN' | ''

export interface Task {
  project_id?: number
  id: string
  task_number?: number
  name: string
  phase: string
  category?: string
  start_date?: string
  finish_date?: string
  duration_days?: number
  dependencies?: string
  responsible?: string
  status: TaskStatus
  rag: RAG
  progress_pct: number
  procurement_deadline?: string
  approval_deadline?: string
  notes?: string
  is_milestone: boolean
  actual_start?: string
  actual_finish?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export type ProcurementStatus = 'Pending' | 'RFQ Sent' | 'PO Raised' | 'Ordered' | 'In Transit' | 'Customs' | 'Delivered' | 'Rejected'

export interface ProcurementItem {
  id: string
  name: string
  specification?: string
  category?: string
  quantity?: number
  unit?: string
  unit_cost?: number
  total_cost?: number
  currency: string
  vendor?: string
  vendor_contact?: string
  vendor_email?: string
  order_by_date?: string
  required_on_site?: string
  lead_time_days?: number
  is_imported: boolean
  customs_clearance_days?: number
  status: ProcurementStatus
  po_number?: string
  po_date?: string
  delivery_date?: string
  notes?: string
  task_id?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export type ApprovalStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Resubmit'
export type ApprovalType = 'Material' | 'Shop Drawing' | 'Design' | 'Sample' | 'RFI Response' | 'Client Signoff' | 'Other'

export interface Approval {
  id: string
  title: string
  type: ApprovalType
  description?: string
  submitted_by?: string
  submitted_date?: string
  deadline?: string
  reviewer_id?: string
  status: ApprovalStatus
  approved_by?: string
  approved_date?: string
  rejection_reason?: string
  revision_number: number
  task_id?: string
  procurement_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface SiteReport {
  id: string
  report_date: string
  report_type: 'Daily' | 'Weekly'
  weather?: string
  temperature_c?: number
  works_carried_out?: string
  planned_vs_actual?: string
  overall_progress_pct?: number
  total_labour: number
  skilled_labour: number
  unskilled_labour: number
  equipment_on_site?: string
  safety_incidents: number
  safety_notes?: string
  near_misses: number
  issues_encountered?: string
  actions_required?: string
  materials_received?: string
  visitors?: string
  next_day_plan?: string
  submitted_by?: string
  created_at: string
  updated_at: string
}

export interface Photo {
  id: string
  storage_path: string
  public_url?: string
  caption?: string
  location?: string
  photo_date: string
  report_id?: string
  task_id?: string
  snag_id?: string
  approval_id?: string
  uploaded_by?: string
  created_at: string
}

export type SnagSeverity = 'Critical' | 'Major' | 'Minor'
export type SnagStatus = 'Open' | 'In Progress' | 'Pending Verification' | 'Closed'

export interface Snag {
  id: string
  snag_number?: number
  title: string
  description?: string
  location?: string
  room?: string
  severity: SnagSeverity
  status: SnagStatus
  assigned_to?: string
  assigned_contractor?: string
  raised_by?: string
  raised_date: string
  target_close_date?: string
  closed_date?: string
  verified_by?: string
  task_id?: string
  notes?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

export type DocumentType = 'Drawing' | 'Specification' | 'BOQ' | 'Contract' | 'RFI' | 'Method Statement' | 'Submittal' | 'Report' | 'Other'

export interface Document {
  id: string
  title: string
  document_number?: string
  type: DocumentType
  discipline?: string
  revision: string
  revision_date?: string
  status: 'Draft' | 'For Review' | 'Current' | 'Superseded' | 'Void'
  storage_path?: string
  public_url?: string
  file_size_kb?: number
  file_type?: string
  description?: string
  issued_by?: string
  approved_by?: string
  task_id?: string
  uploaded_by?: string
  created_at: string
  updated_at: string
}

export interface FinancialItem {
  id: string
  type: 'Contract Sum' | 'Variation' | 'Provisional Sum' | 'Contingency' | 'PC Sum' | 'Payment' | 'Retention'
  reference?: string
  description: string
  amount: number
  currency: string
  direction: 'Addition' | 'Omission' | 'N/A'
  status: 'Pending' | 'Submitted' | 'Approved' | 'Rejected' | 'Certified' | 'Paid'
  submitted_date?: string
  approved_date?: string
  certified_date?: string
  payment_date?: string
  submitted_by?: string
  approved_by?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Risk {
  id: string
  risk_number?: number
  title: string
  description?: string
  category?: 'Procurement' | 'Programme' | 'Design' | 'Financial' | 'Safety' | 'External' | 'Contractor'
  likelihood: number
  impact: number
  risk_score?: number
  status: 'Open' | 'Mitigated' | 'Closed' | 'Transferred'
  mitigation_action?: string
  contingency_action?: string
  owner?: string
  review_date?: string
  closed_date?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  content: string
  author_id: string
  task_id?: string
  snag_id?: string
  procurement_id?: string
  approval_id?: string
  document_id?: string
  risk_id?: string
  created_at: string
  updated_at: string
  profiles?: Pick<Profile, 'full_name' | 'avatar_url' | 'role'>
}

export interface Meeting {
  id: string
  title: string
  meeting_date: string
  meeting_type?: string
  location?: string
  chair_id?: string
  attendees?: string
  agenda?: string
  minutes?: string
  action_points?: string
  next_meeting_date?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ContractorScore {
  id: string
  contractor_name: string
  period_month?: number
  period_year?: number
  quality_score?: number
  programme_score?: number
  safety_score?: number
  communication_score?: number
  overall_score?: number
  notes?: string
  scored_by?: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message?: string
  type: 'alert' | 'info' | 'success' | 'warning'
  is_read: boolean
  link?: string
  created_at: string
}

// Dashboard types
export interface DashboardStats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  progressPct: number
  daysRemaining: number
  openSnags: number
  criticalSnags: number
  openRisks: number
  highRisks: number
  pendingApprovals: number
  overdueApprovals: number
  procurementRisks: number
  contractValue: number
  variationsTotal: number
  certifiedTotal: number
  retentionTotal: number
}
