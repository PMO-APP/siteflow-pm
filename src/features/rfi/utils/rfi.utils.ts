import type { RFI, RFIStatus } from '../types'

export function isRFIOverdue(rfi: RFI, now = new Date()) {
  if (!rfi.due_date || ['Answered', 'Closed', 'Rejected'].includes(rfi.status)) return false
  return new Date(`${rfi.due_date}T23:59:59`).getTime() < now.getTime()
}

export function formatRFIDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function getAllowedRFITransitions(status: RFIStatus): RFIStatus[] {
  switch (status) {
    case 'Draft':
      return ['Submitted']
    case 'Submitted':
      return ['Under Review', 'Answered', 'Rejected']
    case 'Under Review':
      return ['Answered', 'Rejected']
    case 'Answered':
      return ['Closed', 'Under Review']
    default:
      return []
  }
}
