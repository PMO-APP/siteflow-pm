import type { runProjectIntelligence } from '../PIF'

export type ProjectIntelligenceResult = ReturnType<typeof runProjectIntelligence>

export interface CopilotContext {
  projectName: string
  intelligence: ProjectIntelligenceResult
}

export function assembleCopilotContext(
  projectName: string | undefined,
  intelligence: ProjectIntelligenceResult,
): CopilotContext {
  return {
    projectName: projectName || `Project ${intelligence.projectId}`,
    intelligence,
  }
}
