import type { HealthContributorKey } from './types'

/**
 * Product Maturity Sprint 2A health model.
 * Governance remains explainable, but is not included in the weighted project
 * score because governance exceptions already influence the operational modules.
 */
export const PROJECT_HEALTH_WEIGHTS: Record<HealthContributorKey, number> = {
  schedule: 0.3,
  procurement: 0.15,
  approvals: 0.15,
  quality: 0.1,
  safety: 0.1,
  risk: 0.1,
  commercial: 0.1,
  governance: 0,
}

export const HEALTH_METHODOLOGY_VERSION = '2.0.0'
