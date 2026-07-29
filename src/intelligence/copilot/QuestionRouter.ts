import type { CopilotQuestionId } from './types'

const includesAny = (value: string, terms: string[]) => terms.some(term => value.includes(term))

export function routeCopilotQuestion(question: string): CopilotQuestionId {
  const normalized = question.toLowerCase().trim()
  if (includesAny(normalized, ['delay', 'late', 'finish', 'completion', 'handover'])) return 'delay'
  if (includesAny(normalized, ['changed', 'change this week', 'since last', 'this week'])) return 'changes'
  if (includesAny(normalized, ['decision', 'management attention', 'executive attention', 'approve'])) return 'decisions'
  if (includesAny(normalized, ['risk', 'warning', 'threat', 'red'])) return 'risks'
  if (includesAny(normalized, ['recover', 'recovery', 'accelerate', 'crew', 'weekend'])) return 'recovery'
  if (includesAny(normalized, ['governance', 'maturity', 'control', 'compliance'])) return 'governance'
  if (includesAny(normalized, ['next', 'action', 'priority', 'should happen'])) return 'next'
  return 'status'
}
