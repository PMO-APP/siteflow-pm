import { generateAlerts } from './engine/AlertEngine'
import { analyseDependencies } from './engine/DependencyEngine'
import { calculateForecast } from './engine/ForecastEngine'
import { calculateProjectHealth } from './engine/HealthEngine'
import { createExecutiveNarrative } from './engine/NarrativeEngine'
import { generateRecommendations } from './engine/RecommendationEngine'
import type { ProjectIntelligenceInput } from './models/IntelligenceEvent'
import { evaluateIntelligenceRules } from './rules/RuleEngine'
import { assessForecastConfidence } from './confidence/ConfidenceEngine'
import { buildHealthBreakdown } from './explainability/HealthBreakdown'
import { buildForecastBreakdown } from './explainability/ForecastBreakdown'
import { buildRecommendationExplorer } from './explainability/RecommendationExplorer'
import { generateExecutiveSummary } from './narrative/ExecutiveSummary'
import { generateWeeklySummary } from './narrative/WeeklySummary'
import { generateBoardSummary } from './narrative/BoardSummary'

export function runProjectIntelligence(input: ProjectIntelligenceInput) {
  const now = input.now || new Date()
  const health = calculateProjectHealth(input.events, { now })
  const dependencies = analyseDependencies(input.events)
  const forecast = calculateForecast(input.plannedFinish, input.events, now)
  const recommendations = generateRecommendations(input.events)
  const alerts = generateAlerts(input.events, now)
  const rules = evaluateIntelligenceRules(input.events, now)
  const projectName = input.projectName || `Project ${input.projectId}`
  const narrative = createExecutiveNarrative(projectName, health, forecast, recommendations)
  const recommendationExplorer = buildRecommendationExplorer(recommendations)
  const executive = generateExecutiveSummary(projectName, health, forecast, recommendations)
  const confidence = assessForecastConfidence(forecast, health)
  const healthBreakdown = buildHealthBreakdown(health)
  const forecastBreakdown = buildForecastBreakdown(forecast)
  const weekly = generateWeeklySummary(input.events, health, recommendations)
  const board = generateBoardSummary(executive, forecast, recommendationExplorer)
  const executiveBrief = {
    status: health.overallBand,
    healthScore: health.overallScore,
    forecast,
    confidence,
    executive,
    board,
    healthBreakdown,
    recommendations: recommendationExplorer,
  }

  return {
    projectId: input.projectId,
    health,
    dependencies,
    forecast,
    recommendations,
    alerts,
    narrative,
    executiveBrief,
    explainability: { health: healthBreakdown, forecast: forecastBreakdown, recommendations: recommendationExplorer },
    weekly,
    board,
    confidence,
    rules,
    generatedAt: now.toISOString(),
  }
}
