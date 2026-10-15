import { supabase } from '@/lib/supabase'
import { estimateMeasuredRemainingDays } from './measuredDurationEvidence'
import type { MeasuredDurationResult, ProductionObservation } from './measuredDurationEvidence'

export type VerifiedActivityDuration = {
  activityId: string
  inputId: string
  result: MeasuredDurationResult
  verifiedAt: string
  workingDaysPerWeek: number
}
export type VerifiedEvidenceResult =
  | { ok: true; activities: VerifiedActivityDuration[]; excluded: { activityId: string; reason: string }[]; warning: string }
  | { ok: false; error: string }

/**
 * Review-gated, fail-closed evidence reader.
 * Only the newest assumption for an activity can be used, and only if verified.
 * Only verified production observations are included.
 * Does NOT publish forecast dates or override approved schedules.
 */
export async function loadVerifiedActivityDurations(
  projectId: number,
  packageId: string,
): Promise<VerifiedEvidenceResult> {
  if (!Number.isSafeInteger(projectId) || projectId < 1 || !packageId.trim()) {
    return { ok: false, error: 'Valid project and package IDs are required.' }
  }
  const { data: inputs, error: inputError } = await supabase.rpc(
    'get_current_verified_package_inputs',
    { p_project_id: projectId, p_package_id: packageId },
  )
  if (inputError) return { ok: false, error: inputError.message }
  const { data: rows, error: observationError } = await supabase
    .from('package_production_observations')
    .select('activity_id,delivery_package_id,observed_on,quantity_completed,quantity_unit,crew_count,working_hours')
    .eq('project_id', projectId)
    .eq('delivery_package_id', packageId)
    .eq('review_status', 'verified')
    .order('observed_on', { ascending: false })
    .limit(1001)
  if (observationError) return { ok: false, error: observationError.message }
  if ((rows?.length || 0) > 1000) return { ok: false, error: 'Verified observation limit exceeded. Paginated retrieval is required before calculating a duration.' }
  const observations = (rows || []) as ProductionObservation[]
  const activities: VerifiedActivityDuration[] = []
  const excluded: { activityId: string; reason: string }[] = []
  for (const row of inputs || []) {
    const activityId = String(row.activity_id)
    const result = estimateMeasuredRemainingDays(observations, {
      activityId,
      packageId,
      remainingQuantity: Number(row.remaining_quantity),
      quantityUnit: String(row.quantity_unit),
      plannedCrew: Number(row.planned_crew_count),
      hoursPerDay: Number(row.planned_hours_per_day),
    })
    if (result.available) {
      activities.push({
        activityId, inputId: String(row.assumption_id), result,
        verifiedAt: String(row.verified_at), workingDaysPerWeek: Number(row.working_days_per_week),
      })
    } else excluded.push({ activityId, reason: result.reason })
  }
  return {
    ok: true, activities, excluded,
    warning: 'Evidence-based working days are indicative. Latest pending or rejected assumptions are excluded. Project calendars, shared crews, procurement, and critical-path scheduling remain unverified.',
  }
}
