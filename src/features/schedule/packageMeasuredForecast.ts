import type { ProductionObservation, RemainingWorkInput, MeasuredDurationResult } from './measuredDurationEvidence'
import { estimateMeasuredRemainingDays } from './measuredDurationEvidence'

/**
 * Explicit, opt-in bridge from verified remaining-work inputs to the package engine.
 * No missing quantities, crew assignments or units are inferred from percent complete.
 * A caller must obtain/verify inputs and load authorised observations before using this.
 */
export function buildPackageMeasuredDurations(
  packageId: string,
  observations: readonly ProductionObservation[],
  inputs: readonly RemainingWorkInput[],
): { durations: ReadonlyMap<string, MeasuredDurationResult>; unavailable: ReadonlyMap<string, string> } {
  const durations = new Map<string, MeasuredDurationResult>()
  const unavailable = new Map<string, string>()
  const seen = new Set<string>()
  for (const input of inputs) {
    if (String(input.packageId) !== packageId) continue
    const key = String(input.activityId)
    if (seen.has(key)) {
      durations.delete(key)
      unavailable.set(key, 'Duplicate remaining-work input for activity; reconcile before forecasting.')
      continue
    }
    seen.add(key)
    if (unavailable.has(key)) continue
    const result = estimateMeasuredRemainingDays(observations, input)
    if (result.available) durations.set(key, result)
    else unavailable.set(key, result.reason)
  }
  return { durations, unavailable }
}
