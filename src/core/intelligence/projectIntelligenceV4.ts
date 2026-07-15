import type { ProjectState } from './models/ProjectState'
import { buildProjectIntelligenceV3 } from './projectIntelligenceV3'
import { calculateDeliveryTwin } from './delivery-twin/deliveryTwinEngine'

export function buildProjectIntelligenceV4(
  state: ProjectState
) {
  const base =
    buildProjectIntelligenceV3(state)

  return {
    ...base,
    deliveryTwin:
      calculateDeliveryTwin(state),
  }
}

export type ProjectIntelligenceV4 =
  ReturnType<
    typeof buildProjectIntelligenceV4
  >
