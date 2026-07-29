import type { IntelligenceSource } from '../models/IntelligenceEvent'

export type CopilotQuestionId =
  | 'status'
  | 'delay'
  | 'changes'
  | 'decisions'
  | 'risks'
  | 'recovery'
  | 'governance'
  | 'next'

export interface CopilotQuestion {
  id: CopilotQuestionId
  label: string
  prompt: string
  category: 'status' | 'delivery' | 'control' | 'action'
}

export interface CopilotEvidence {
  label: string
  value: string
  source?: IntelligenceSource
}

export interface CopilotAction {
  label: string
  source: IntelligenceSource
}

export interface CopilotAnswer {
  questionId: CopilotQuestionId
  question: string
  headline: string
  answer: string
  evidence: CopilotEvidence[]
  actions: CopilotAction[]
  confidence: number
  generatedAt: string
}
