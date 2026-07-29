import type { ProjectHealth } from '../models/ProjectHealth'
import type { ForecastResult } from '../models/Forecast'
import type { ExecutiveSummaryOutput } from '../narrative/ExecutiveSummary'
import type { BoardSummaryOutput } from '../narrative/BoardSummary'
import type { ConfidenceAssessment } from '../confidence/ConfidenceEngine'
import type { HealthBreakdownItem } from '../explainability/HealthBreakdown'
import type { RecommendationExplanation } from '../explainability/RecommendationExplorer'

export interface ExecutiveBrief {
  status: ProjectHealth['overallBand']
  healthScore: number
  forecast: ForecastResult
  confidence: ConfidenceAssessment
  executive: ExecutiveSummaryOutput
  board: BoardSummaryOutput
  healthBreakdown: HealthBreakdownItem[]
  recommendations: RecommendationExplanation[]
}
