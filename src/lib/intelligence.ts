import type { IntelligenceStatus, IntelligenceTrend } from '@/components/intelligence/IntelligencePanel'

export interface IntelligenceResult {
  status: IntelligenceStatus
  statusLabel: string
  trend: IntelligenceTrend
  summary: string
  primaryConstraint?: string
  recommendation: string
}

export function procurementIntelligence(total: number, overdue: number, urgent: number, delivered: number): IntelligenceResult {
  if (overdue > 0) return {
    status: overdue >= Math.max(3, Math.ceil(total * 0.2)) ? 'critical' : 'watch',
    statusLabel: overdue >= Math.max(3, Math.ceil(total * 0.2)) ? 'Critical exposure' : 'Needs attention',
    trend: 'declining',
    summary: `${overdue} procurement item${overdue === 1 ? ' is' : 's are'} overdue and may constrain planned site activities. ${urgent} additional item${urgent === 1 ? ' falls' : 's fall'} within the seven-day action window.`,
    primaryConstraint: 'Outstanding order commitments are now the main procurement exposure.',
    recommendation: 'Confirm purchase orders, supplier commitments and revised delivery dates for every overdue item today.',
  }
  if (urgent > 0) return {
    status: 'watch', statusLabel: 'Action window open', trend: 'stable',
    summary: `${urgent} item${urgent === 1 ? ' requires' : 's require'} action within seven days. Current delivery performance remains manageable if commitments are closed promptly.`,
    primaryConstraint: 'Upcoming order-by dates require timely commercial action.',
    recommendation: 'Prioritise approvals and supplier confirmation for all items entering the seven-day window.',
  }
  return {
    status: total ? 'healthy' : 'neutral', statusLabel: total ? 'On track' : 'No records yet', trend: total ? 'improving' : 'stable',
    summary: total ? `${delivered} of ${total} procurement items have been delivered, with no overdue order commitments currently recorded.` : 'No procurement items have been recorded for this project yet.',
    primaryConstraint: total ? undefined : 'Procurement readiness cannot be assessed until planned items are entered.',
    recommendation: total ? 'Continue monitoring long-lead items and validate required-on-site dates against the live schedule.' : 'Add long-lead and activity-critical items to establish the procurement control baseline.',
  }
}

export function approvalsIntelligence(total: number, pending: number, overdue: number, approved: number): IntelligenceResult {
  if (overdue > 0) return { status: overdue >= 3 ? 'critical' : 'watch', statusLabel: overdue >= 3 ? 'Approval bottleneck' : 'Overdue decisions', trend: 'declining', summary: `${overdue} approval${overdue === 1 ? ' has' : 's have'} passed the decision deadline. ${pending} item${pending === 1 ? ' remains' : 's remain'} unresolved across the approval workflow.`, primaryConstraint: 'Late technical decisions may hold dependent construction activities.', recommendation: 'Escalate overdue submissions to the responsible reviewer and agree a dated response commitment.' }
  if (pending > 0) return { status: 'watch', statusLabel: 'Pending decisions', trend: 'stable', summary: `${approved} of ${total} approvals are complete. ${pending} item${pending === 1 ? ' is' : 's are'} still moving through review, with no current deadline breach.`, primaryConstraint: 'Outstanding reviews remain the main approval workload.', recommendation: 'Review pending items by nearest deadline and verify that reviewers have all required supporting documents.' }
  return { status: total ? 'healthy' : 'neutral', statusLabel: total ? 'Clear' : 'No records yet', trend: 'improving', summary: total ? `All ${approved} recorded approvals are complete with no outstanding decisions.` : 'No approvals have been logged for this project.', recommendation: total ? 'Maintain the current response discipline and link new submissions to their schedule activities.' : 'Create approval records for drawings, materials and technical decisions that can constrain delivery.' }
}

export function riskIntelligence(total: number, open: number, high: number, mitigated: number): IntelligenceResult {
  if (high > 0) return { status: high >= 3 ? 'critical' : 'watch', statusLabel: `${high} high exposure`, trend: mitigated > high ? 'improving' : 'declining', summary: `${open} risk${open === 1 ? ' remains' : 's remain'} open, including ${high} high or critical exposure${high === 1 ? '' : 's'}. Mitigation progress should be reviewed against the next project decision points.`, primaryConstraint: 'High-scoring open risks carry the greatest threat to cost, time or quality outcomes.', recommendation: 'Confirm owners, dated mitigation actions and escalation triggers for every high or critical risk.' }
  if (open > 0) return { status: 'watch', statusLabel: 'Moderate exposure', trend: mitigated > 0 ? 'improving' : 'stable', summary: `${open} open risk${open === 1 ? ' is' : 's are'} being monitored, with no high or critical score currently recorded.`, primaryConstraint: 'Open risks still require evidence that mitigation actions are progressing.', recommendation: 'Review due dates and close risks whose mitigation evidence is complete.' }
  return { status: total ? 'healthy' : 'neutral', statusLabel: total ? 'Controlled' : 'No risks logged', trend: 'improving', summary: total ? 'No open risks remain in the register. Recorded exposures are mitigated, transferred or closed.' : 'The risk register has no entries, so project exposure cannot yet be assessed.', recommendation: total ? 'Continue periodic risk reviews and capture emerging threats before they affect delivery.' : 'Run an initial multidisciplinary risk workshop and establish owners and review dates.' }
}

export function snagIntelligence(total: number, open: number, critical: number, major: number, closed: number): IntelligenceResult {
  if (critical > 0) return { status: 'critical', statusLabel: 'Critical defects open', trend: 'declining', summary: `${open} snag${open === 1 ? ' remains' : 's remain'} open, including ${critical} critical and ${major} major defect${major === 1 ? '' : 's'}.`, primaryConstraint: 'Critical defects can prevent safe completion and handover.', recommendation: 'Assign immediate owners and closure dates to critical snags, then verify rectification evidence before sign-off.' }
  if (open > 0) return { status: major > 0 ? 'watch' : 'neutral', statusLabel: major > 0 ? 'Completion at risk' : 'Close-out active', trend: closed >= open ? 'improving' : 'stable', summary: `${closed} of ${total} snags are closed. ${open} item${open === 1 ? ' remains' : 's remain'} in the completion workflow.`, primaryConstraint: major > 0 ? `${major} major snag${major === 1 ? '' : 's'} require focused close-out.` : 'Outstanding minor defects remain before final closure.', recommendation: 'Prioritise snags by handover area, responsible contractor and promised completion date.' }
  return { status: total ? 'healthy' : 'neutral', statusLabel: total ? 'Ready for verification' : 'No snags recorded', trend: 'improving', summary: total ? `All ${closed} recorded snags are closed.` : 'No snags have been recorded for this project.', recommendation: total ? 'Complete final verification and retain closure evidence for handover.' : 'Continue structured inspections so defects are identified before handover.' }
}

export function qualityIntelligence(total: number, approved: number, rejected: number, review: number): IntelligenceResult {
  if (rejected > 0) return { status: 'critical', statusLabel: 'Rejected inspections', trend: 'declining', summary: `${rejected} quality gate${rejected === 1 ? ' is' : 's are'} rejected and ${review} inspection${review === 1 ? ' is' : 's are'} awaiting or undergoing review.`, primaryConstraint: 'Rejected work can block dependent activities until corrective action is verified.', recommendation: 'Record corrective actions, upload evidence and request reinspection before allowing dependent work to proceed.' }
  if (review > 0) return { status: 'watch', statusLabel: 'Reviews pending', trend: 'stable', summary: `${approved} of ${total} quality gates are approved. ${review} inspection${review === 1 ? ' requires' : 's require'} review or formal decision.`, primaryConstraint: 'Pending inspection decisions may delay release of follow-on activities.', recommendation: 'Prioritise gates linked to near-term or critical schedule activities.' }
  return { status: total ? 'healthy' : 'neutral', statusLabel: total ? 'Quality controlled' : 'No gates created', trend: 'improving', summary: total ? `All active quality gates are clear, with ${approved} approved inspection${approved === 1 ? '' : 's'} and no rejected work.` : 'No quality gates have been configured for this project.', recommendation: total ? 'Maintain evidence quality and create hold points before upcoming high-risk activities.' : 'Create hold points for critical structural, architectural and MEP activities.' }
}
