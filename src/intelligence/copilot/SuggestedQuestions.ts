import type { CopilotQuestion } from './types'

export const COPILOT_QUESTIONS: CopilotQuestion[] = [
  { id: 'status', label: 'Why is this project this status?', prompt: 'Explain the current project status.', category: 'status' },
  { id: 'delay', label: 'Why is completion delayed?', prompt: 'Explain the causes of forecast delay.', category: 'delivery' },
  { id: 'changes', label: 'What changed this week?', prompt: 'Summarise meaningful changes this week.', category: 'status' },
  { id: 'decisions', label: 'What needs management attention?', prompt: 'List the most important management decisions.', category: 'action' },
  { id: 'risks', label: 'What are the biggest risks?', prompt: 'Explain the highest project risks and warnings.', category: 'control' },
  { id: 'recovery', label: 'Show recovery options', prompt: 'Compare the strongest recovery options.', category: 'action' },
  { id: 'governance', label: 'How strong is project governance?', prompt: 'Explain the governance maturity assessment.', category: 'control' },
  { id: 'next', label: 'What should happen next?', prompt: 'Recommend the immediate next actions.', category: 'action' },
]
