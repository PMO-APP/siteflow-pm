import { supabase } from '@/lib/supabase'
import type { ProductionObservation, RemainingWorkInput, MeasuredDurationResult } from './measuredDurationEvidence'
import { buildPackageMeasuredDurations } from './packageMeasuredForecast'

export type EvidenceLoadResult =
  | { ok: true; observations: ProductionObservation[]; activityCount: number; warning: string }
  | { ok: false; observations: []; activityCount: 0; error: string }

/**
 * Reads only the currently authenticated user's RLS-authorised observations.
 * A successful empty response does NOT mean that the whole project has no observations.
 * No service-role key, RLS bypass, or cross-project aggregation is used.
 */
export async function loadPackageProductionEvidence(
  projectId: string | number,
  packageId: string | number,
): Promise<EvidenceLoadResult> {
  if (!String(projectId).trim() || !String(packageId).trim()) {
    return { ok: false, observations: [], activityCount: 0, error: 'A project and package are required.' }
  }
  const { data, error } = await supabase
    .from('package_production_observations')
    .select('activity_id,delivery_package_id,observed_on,quantity_completed,quantity_unit,crew_count,working_hours')
    .eq('project_id', projectId)
    .eq('delivery_package_id', String(packageId))
    .order('observed_on', { ascending: false })
    .limit(1000)
  if (error) return { ok: false, observations: [], activityCount: 0, error: error.message }
  const observations = (data ?? []) as ProductionObservation[]
  return {
    ok: true,
    observations,
    activityCount: new Set(observations.map(row => String(row.activity_id))).size,
    warning: observations.length === 1000
      ? 'Only the latest 1,000 authorised observations were loaded; evidence may be incomplete.'
      : 'Author-visible records only. Other users’ observations may be hidden by row-level security.',
  }
}

/**
 * Strictly opt-in conversion: callers must supply independently verified remaining
 * quantities, measurement units and future crew allocations. The loader never infers
 * these from percentage completion or treats observation data as approval.
 */
export async function loadMeasuredPackageDurations(
  projectId: string | number,
  packageId: string | number,
  verifiedInputs: readonly RemainingWorkInput[],
): Promise<
  | { ok: true; durations: ReadonlyMap<string, MeasuredDurationResult>; unavailable: ReadonlyMap<string, string>; warning: string }
  | { ok: false; error: string }
> {
  const result = await loadPackageProductionEvidence(projectId, packageId)
  if (!result.ok) return { ok: false, error: result.error }
  const { durations, unavailable } = buildPackageMeasuredDurations(String(packageId), result.observations, verifiedInputs)
  return { ok: true, durations, unavailable, warning: result.warning }
}
