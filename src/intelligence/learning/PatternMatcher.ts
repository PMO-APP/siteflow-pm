import type { IntelligenceEvent } from '../models/IntelligenceEvent'

export interface DeliveryPattern {
  id: string
  title: string
  category: 'constraint' | 'quality' | 'governance' | 'recovery'
  confidence: number
  evidenceCount: number
  explanation: string
  relatedEventIds: string[]
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export function matchDeliveryPatterns(events: IntelligenceEvent[]): DeliveryPattern[] {
  const open = events.filter(event => event.status === 'open')
  const patterns: DeliveryPattern[] = []
  const approvalsBlocking = open.filter(event => event.source === 'approval' && event.links?.some(link => link.type === 'blocks'))
  const procurementBlocking = open.filter(event => event.source === 'procurement' && event.links?.some(link => link.type === 'blocks'))
  const severeRisks = open.filter(event => event.source === 'risk' && ['high', 'critical'].includes(event.severity))
  const qualityDefects = open.filter(event => ['quality', 'snag'].includes(event.source) && ['high', 'critical'].includes(event.severity))
  const overdueSchedule = open.filter(event => event.source === 'schedule' && ['high', 'critical'].includes(event.severity))
  const closedConstraints = events.filter(event => event.status === 'closed' && ['approval', 'procurement', 'risk'].includes(event.source))

  const add = (id: string, title: string, category: DeliveryPattern['category'], matches: IntelligenceEvent[], explanation: string, base = 55) => {
    if (!matches.length) return
    patterns.push({ id, title, category, confidence: clamp(base + matches.length * 8), evidenceCount: matches.length, explanation, relatedEventIds: matches.map(event => event.id) })
  }

  add('approval-bottleneck', 'Approval bottleneck', 'constraint', approvalsBlocking, `${approvalsBlocking.length} open approval${approvalsBlocking.length === 1 ? '' : 's'} directly block downstream work.`, 62)
  add('procurement-critical-path', 'Procurement-to-schedule exposure', 'constraint', procurementBlocking, `${procurementBlocking.length} procurement item${procurementBlocking.length === 1 ? '' : 's'} are linked to schedule activities.`, 64)
  add('risk-concentration', 'High-severity risk concentration', 'constraint', severeRisks, `${severeRisks.length} high or critical risks remain active.`, 58)
  add('quality-repeat', 'Quality close-out pressure', 'quality', qualityDefects, `${qualityDefects.length} major quality or snag item${qualityDefects.length === 1 ? '' : 's'} remain open.`, 56)
  add('schedule-slippage', 'Schedule slippage pattern', 'constraint', overdueSchedule, `${overdueSchedule.length} schedule activities show high or critical delivery pressure.`, 66)
  add('control-closure', 'Control closure capability', 'recovery', closedConstraints, `${closedConstraints.length} approval, procurement, or risk constraint${closedConstraints.length === 1 ? ' has' : 's have'} been closed.`, 50)

  return patterns.sort((a, b) => b.confidence - a.confidence || b.evidenceCount - a.evidenceCount)
}
