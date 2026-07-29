import { generateAlerts } from './engine/AlertEngine'
import { analyseDependencies } from './engine/DependencyEngine'
import { calculateForecast } from './engine/ForecastEngine'
import { calculateProjectHealth } from './engine/HealthEngine'
import { createExecutiveNarrative } from './engine/NarrativeEngine'
import { generateRecommendations } from './engine/RecommendationEngine'
import type { ProjectIntelligenceInput } from './models/IntelligenceEvent'
import { evaluateIntelligenceRules } from './rules/RuleEngine'

export function runProjectIntelligence(input: ProjectIntelligenceInput) {
  const now = input.now || new Date()
  const health = calculateProjectHealth(input.events, { now })
  const dependencies = analyseDependencies(input.events)
  const forecast = calculateForecast(input.plannedFinish, input.events, now)
  const recommendations = generateRecommendations(input.events)
  const alerts = generateAlerts(input.events, now)
  const rules = evaluateIntelligenceRules(input.events, now)
  const narrative = createExecutiveNarrative(
    input.projectName || `Project ${input.projectId}`,
    health,
    forecast,
    recommendations
  )

  return {
    projectId: input.projectId,
    health,
    dependencies,
    forecast,
    recommendations,
    alerts,
    narrative,
    rules,
    generatedAt: now.toISOString(),
  }
}
