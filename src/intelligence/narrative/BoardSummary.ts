import type { ExecutiveSummaryOutput } from './ExecutiveSummary'
import type { ForecastResult } from '../models/Forecast'
import type { RecommendationExplanation } from '../explainability/RecommendationExplorer'

export interface BoardSummaryOutput {
  decisionStatement: string
  managementAttention: 'low' | 'medium' | 'high' | 'immediate'
  decisions: string[]
  recoveryPosition: string
}

export function generateBoardSummary(executive: ExecutiveSummaryOutput, forecast: ForecastResult, recommendations: RecommendationExplanation[]): BoardSummaryOutput {
  const managementAttention = forecast.forecastDelayDays > 14 ? 'immediate' : forecast.forecastDelayDays > 5 ? 'high' : executive.keyIssues.length > 1 ? 'medium' : 'low'
  return {
    decisionStatement: executive.headline,
    managementAttention,
    decisions: recommendations.slice(0, 5).map(item => item.action),
    recoveryPosition: recommendations[0]?.expectedRecoveryDays
      ? `The strongest identified option could recover approximately ${recommendations[0].expectedRecoveryDays} day${recommendations[0].expectedRecoveryDays === 1 ? '' : 's'} at ${recommendations[0].confidence}% confidence.`
      : 'No quantified recovery opportunity is currently supported by the available evidence.',
  }
}
