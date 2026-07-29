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
import { buildDecisionCenter } from './decision/DecisionCenter'
import { assessGovernance } from './governance/GovernanceEngine'
import { buildDefaultImpactScenarios } from './decision/ImpactSimulator'
import { analyseTrends } from './pulse/TrendEngine'
import { calculateMomentum } from './pulse/MomentumCalculator'
import { calculateAttentionIndex } from './pulse/AttentionIndex'
import { calculateProjectPulse } from './pulse/PulseEngine'
import { predictEscalation } from './warning/EscalationPredictor'
import { generateEarlyWarnings } from './warning/EarlyWarningEngine'
import { prioritizeWarnings } from './warning/WarningPrioritizer'
import { buildTimelineStory } from './timeline/TimelineStory'
import { buildDailyDecisionQueue } from './decision/DailyDecisionQueue'
import { buildOrganizationalLearning } from './learning/OrganizationalLearning'
import { buildProjectReviewBrief } from './meeting/MeetingIntelligence'
import { buildActionIntelligence } from './action/ActionIntelligence'

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
  const decisions = buildDecisionCenter(input.events, recommendations, alerts, now)
  const governance = assessGovernance(input.events)
  const impactScenarios = buildDefaultImpactScenarios(input.events, forecast)
  const trends = analyseTrends(input.events, now)
  const momentum = calculateMomentum(health, trends)
  const attention = calculateAttentionIndex(forecast, alerts, decisions, governance)
  const pulse = calculateProjectPulse(health, forecast, governance, trends, momentum, attention)
  const escalation = predictEscalation(health, forecast, trends, governance)
  const warnings = prioritizeWarnings(generateEarlyWarnings(input.events, escalation))
  const timeline = buildTimelineStory(input.events, now)
  const decisionQueue = buildDailyDecisionQueue(decisions, warnings)
  const learning = buildOrganizationalLearning(input.events)
  const meeting = buildProjectReviewBrief(projectName, input.events, health, forecast, decisions, warnings, timeline, now)
  const actionIntelligence = buildActionIntelligence(input.events, decisions, warnings, meeting.followUpActions, now)
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
    decisions,
    governance,
    impactScenarios,
    trends,
    momentum,
    attention,
    pulse,
    escalation,
    warnings,
    timeline,
    decisionQueue,
    learning,
    meeting,
    actionIntelligence,
    confidence,
    rules,
    generatedAt: now.toISOString(),
  }
}
