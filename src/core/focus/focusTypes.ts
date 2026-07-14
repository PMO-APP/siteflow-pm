export type FocusSeverity =
  | 'info'
  | 'warning'
  | 'critical'

export type FocusCategory =
  | 'schedule'
  | 'approval'
  | 'quality'
  | 'risk'
  | 'procurement'
  | 'governance'
  | 'commercial'
  | 'hse'

export type FocusItem = {
  id: string
  title: string
  description: string
  category: FocusCategory
  severity: FocusSeverity
  priority: number
  route?: string
  dueLabel?: string
  ownerLabel?: string
  metadata?: Record<string, unknown>
}

export type TodayFocusResult = {
  items: FocusItem[]
  criticalCount: number
  warningCount: number
  generatedAt: string
}
