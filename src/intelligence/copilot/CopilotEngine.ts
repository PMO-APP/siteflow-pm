import type { IntelligenceSource } from '../models/IntelligenceEvent'
import type { CopilotContext } from './ContextAssembler'
import { routeCopilotQuestion } from './QuestionRouter'
import { joinStatements, sentence } from './ResponseFormatter'
import type { CopilotAction, CopilotAnswer, CopilotEvidence, CopilotQuestionId } from './types'

const sourceLabel: Record<string, string> = {
  schedule: 'Schedule', approval: 'Approvals', procurement: 'Procurement', risk: 'Risk register', quality: 'Quality',
  finance: 'Costing', site: 'Site progress', consultant: 'Consultants', contractor: 'Contractors', hse: 'HSE', snag: 'Snags', rfi: 'RFIs',
}

function safeSource(source: string | undefined): IntelligenceSource | undefined {
  return source && source in sourceLabel ? source as IntelligenceSource : undefined
}

function evidence(label: string, value: string | number, source?: string): CopilotEvidence {
  return { label, value: String(value), source: safeSource(source) }
}

function actions(items: Array<{ label?: string; action?: string; source?: string }>): CopilotAction[] {
  return items
    .map(item => ({ label: item.label || item.action || 'Open source', source: safeSource(item.source) }))
    .filter((item): item is CopilotAction => Boolean(item.source))
    .slice(0, 3)
}

function answerStatus(context: CopilotContext, question: string): Omit<CopilotAnswer, 'generatedAt'> {
  const { intelligence: i, projectName } = context
  const weakest = i.explainability.health?.[0]
  return {
    questionId: 'status', question,
    headline: `${projectName} is ${i.health.overallBand.toUpperCase()} at ${i.health.overallScore}% health`,
    answer: joinStatements([sentence(i.narrative.overallStatus), sentence(i.pulse.explanation), weakest ? `${weakest.label} is the largest health constraint.` : undefined], 'The project status is stable based on the available records.'),
    evidence: [
      evidence('Overall health', `${i.health.overallScore}%`),
      evidence('Project pulse', `${i.pulse.label} (${i.pulse.score}%)`),
      evidence('Forecast confidence', `${i.confidence.score}%`),
      evidence('Executive attention', i.attention.label),
    ],
    actions: actions(i.decisionQueue), confidence: i.confidence.score,
  }
}

function answerDelay(context: CopilotContext, question: string): Omit<CopilotAnswer, 'generatedAt'> {
  const { intelligence: i } = context
  const drivers = i.forecast.drivers || []
  const topDriver = drivers[0]
  return {
    questionId: 'delay', question,
    headline: i.forecast.forecastDelayDays > 0 ? `Completion is forecast ${i.forecast.forecastDelayDays} days late` : 'No forecast completion delay is currently detected',
    answer: joinStatements([
      i.forecast.forecastDelayDays > 0 ? `The current forecast is ${i.forecast.forecastDelayDays} days beyond the planned finish.` : 'The current forecast does not show a completion delay.',
      topDriver ? `The strongest identified driver is ${topDriver}.` : undefined,
      i.escalation.probability >= 50 ? `There is a ${i.escalation.probability}% probability of further escalation within 14 days.` : undefined,
    ], 'The current data does not identify a material completion delay.'),
    evidence: [
      evidence('Forecast delay', `${i.forecast.forecastDelayDays} days`, 'schedule'),
      evidence('Forecast finish', i.forecast.forecastFinish || 'Not available', 'schedule'),
      evidence('Escalation probability', `${i.escalation.probability}%`, 'risk'),
      ...drivers.slice(0, 2).map((driver: string, index: number) => evidence(`Driver ${index + 1}`, driver, 'schedule')),
    ],
    actions: actions(i.decisionQueue), confidence: i.forecast.confidence,
  }
}

function answerChanges(context: CopilotContext, question: string): Omit<CopilotAnswer, 'generatedAt'> {
  const { intelligence: i } = context
  const changed = i.trends.filter((item: any) => item.direction !== 'stable')
  return {
    questionId: 'changes', question,
    headline: changed.length ? `${changed.length} meaningful performance movements detected` : 'Performance is broadly stable this week',
    answer: sentence(i.weekly.narrative || i.narrative.overallStatus),
    evidence: changed.slice(0, 4).map((item: any) => evidence(item.label || item.dimension, `${item.direction} (${item.change > 0 ? '+' : ''}${item.change})`, item.source)),
    actions: actions(i.decisionQueue), confidence: i.confidence.score,
  }
}

function answerDecisions(context: CopilotContext, question: string): Omit<CopilotAnswer, 'generatedAt'> {
  const { intelligence: i } = context
  const queue = i.decisionQueue.slice(0, 5)
  return {
    questionId: 'decisions', question,
    headline: queue.length ? `${queue.length} priority decisions require attention` : 'No high-impact management decision is currently open',
    answer: queue.length ? `The highest-impact action is ${queue[0].action}. It carries an impact score of ${queue[0].impactScore}% and ${queue[0].confidence}% confidence.` : 'Continue routine monitoring and maintain current controls.',
    evidence: queue.map((item: any) => evidence(item.action, `${item.urgency.replace('_', ' ')} · impact ${item.impactScore}%`, item.source)),
    actions: actions(queue), confidence: queue[0]?.confidence ?? i.confidence.score,
  }
}

function answerRisks(context: CopilotContext, question: string): Omit<CopilotAnswer, 'generatedAt'> {
  const { intelligence: i } = context
  const warnings = i.warnings.slice(0, 4)
  return {
    questionId: 'risks', question,
    headline: warnings.length ? `${warnings.length} priority early warnings are active` : 'No material early warning is currently active',
    answer: warnings.length ? `${warnings[0].description} Recommended control: ${warnings[0].recommendedAction}.` : sentence(i.narrative.keyIssues || 'Current risk exposure is within routine monitoring limits.'),
    evidence: warnings.map((warning: any) => evidence(warning.title, `${warning.probability}% probability`, warning.source)),
    actions: actions(warnings.map((warning: any) => ({ label: warning.recommendedAction, source: warning.source || 'risk' }))),
    confidence: Math.max(60, warnings[0]?.probability ?? i.confidence.score),
  }
}

function answerRecovery(context: CopilotContext, question: string): Omit<CopilotAnswer, 'generatedAt'> {
  const { intelligence: i } = context
  const options = i.impactScenarios.filter((scenario: any) => scenario.scheduleImpactDays < 0).sort((a: any, b: any) => a.scheduleImpactDays - b.scheduleImpactDays).slice(0, 4)
  return {
    questionId: 'recovery', question,
    headline: options.length ? `The strongest modelled option can recover ${Math.abs(options[0].scheduleImpactDays)} days` : 'No evidence-based recovery scenario is currently available',
    answer: options.length ? `${options[0].title} provides the greatest modelled recovery at ${options[0].confidence}% confidence, with ${String(options[0].costImpact).toLowerCase()} cost impact. ${options[0].operationalImpact}` : 'Create or update a recovery plan after resolving the current schedule constraints.',
    evidence: options.map((option: any) => evidence(option.title, `${Math.abs(option.scheduleImpactDays)} days · ${option.confidence}% confidence`, option.source || 'schedule')),
    actions: actions(options.map((option: any) => ({ label: option.recommendation || option.title, source: option.source || 'schedule' }))),
    confidence: options[0]?.confidence ?? i.confidence.score,
  }
}

function answerGovernance(context: CopilotContext, question: string): Omit<CopilotAnswer, 'generatedAt'> {
  const { intelligence: i } = context
  const weakest = [...i.governance.checks].sort((a: any, b: any) => a.score - b.score).slice(0, 3)
  return {
    questionId: 'governance', question,
    headline: `Governance maturity is ${i.governance.level} at ${i.governance.score}%`,
    answer: `The project is assessed at ${i.governance.level} maturity. The lowest-scoring control area is ${weakest[0]?.label || 'not available'}.`,
    evidence: weakest.map((item: any) => evidence(item.label, `${item.score}% · ${item.evidence}`, item.source)),
    actions: actions(i.decisionQueue), confidence: i.confidence.score,
  }
}

function answerNext(context: CopilotContext, question: string): Omit<CopilotAnswer, 'generatedAt'> {
  const { intelligence: i } = context
  const queue = i.decisionQueue.slice(0, 3)
  return {
    questionId: 'next', question,
    headline: queue[0]?.action || 'Maintain current controls and update live project records',
    answer: sentence(i.narrative.immediateActions || queue.map((item: any) => item.action).join('; ') || 'No urgent next action has been identified.'),
    evidence: queue.map((item: any, index: number) => evidence(`Priority ${index + 1}`, `${item.action} · impact ${item.impactScore}%`, item.source)),
    actions: actions(queue), confidence: queue[0]?.confidence ?? i.confidence.score,
  }
}

const handlers: Record<CopilotQuestionId, (context: CopilotContext, question: string) => Omit<CopilotAnswer, 'generatedAt'>> = {
  status: answerStatus, delay: answerDelay, changes: answerChanges, decisions: answerDecisions,
  risks: answerRisks, recovery: answerRecovery, governance: answerGovernance, next: answerNext,
}

export function askProjectCopilot(context: CopilotContext, question: string, questionId?: CopilotQuestionId): CopilotAnswer {
  const resolvedId = questionId || routeCopilotQuestion(question)
  return { ...handlers[resolvedId](context, question), generatedAt: new Date().toISOString() }
}
