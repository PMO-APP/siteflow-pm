/**
 * Phase 7: conservative conversion of site observations to remaining activity days.
 * This module is pure: it never changes approved schedules or persists forecasts.
 */
export type ProductionObservation = {
  activity_id: string | number
  delivery_package_id: string | number
  observed_on: string
  quantity_completed: number | string | null
  quantity_unit: string | null
  crew_count: number | string | null
  working_hours: number | string | null
}

export type RemainingWorkInput = {
  activityId: string | number
  packageId: string | number
  remainingQuantity: number
  quantityUnit: string
  plannedCrew: number
  hoursPerDay: number
}

export type MeasuredDurationResult =
  | { available: true; days: number; ratePerPersonHour: number; observationCount: number; evidenceStart: string; evidenceEnd: string; warnings: string[] }
  | { available: false; reason: string }

const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
const normalizedUnit = (value: string | null | undefined) => (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10)) && Number.isFinite(Date.parse(value))

/**
 * Uses observations for ONE activity in ONE package only. Never averages across
 * different activities, units or packages. Requires at least three observations
 * on distinct dates to avoid deriving a forecast from a single shift.
 *
 * Result is working days, not a calendar handover date. Dependency scheduling,
 * resource conflicts and approval remain the caller's responsibility.
 */
export function estimateMeasuredRemainingDays(
  observations: readonly ProductionObservation[],
  input: RemainingWorkInput,
): MeasuredDurationResult {
  if (!positive(input.remainingQuantity) || !positive(input.plannedCrew) || !positive(input.hoursPerDay) || input.hoursPerDay > 24 || !Number.isInteger(input.plannedCrew)) {
    return { available: false, reason: 'A positive remaining quantity, whole-number crew and valid working hours are required.' }
  }
  const unit = normalizedUnit(input.quantityUnit)
  if (!unit) return { available: false, reason: 'A verified remaining-work measurement unit is required.' }
  const rows = observations.filter(row => String(row.activity_id) === String(input.activityId) && String(row.delivery_package_id) === String(input.packageId))
  if (rows.length < 3 || new Set(rows.map(row => row.observed_on.slice(0, 10))).size < 3) {
    return { available: false, reason: 'At least three dated observations on separate days are required for this package activity.' }
  }
  if (rows.some(row => normalizedUnit(row.quantity_unit) !== unit)) {
    return { available: false, reason: 'Observation units do not match the verified remaining-work unit.' }
  }
  if (rows.some(row => !validDate(row.observed_on) || !positive(Number(row.quantity_completed)) || !positive(Number(row.crew_count)) || !Number.isInteger(Number(row.crew_count)) || !positive(Number(row.working_hours)) || Number(row.working_hours) > 24)) {
    return { available: false, reason: 'One or more observations have invalid dates, quantities, crew counts or working hours.' }
  }
  const totalQuantity = rows.reduce((sum, row) => sum + Number(row.quantity_completed), 0)
  const personHours = rows.reduce((sum, row) => sum + Number(row.crew_count) * Number(row.working_hours), 0)
  const rate = totalQuantity / personHours
  const days = Math.ceil(input.remainingQuantity / (rate * input.plannedCrew * input.hoursPerDay))
  if (!Number.isFinite(days) || days < 1) return { available: false, reason: 'Measured duration could not be calculated reliably.' }
  const dates = rows.map(row => row.observed_on.slice(0, 10)).sort()
  return {
    available: true, days, ratePerPersonHour: rate, observationCount: rows.length,
    evidenceStart: dates[0], evidenceEnd: dates[dates.length - 1],
    warnings: ['Indicative working-day duration only; not a validated handover forecast.', 'Crew availability, calendar, procurement and predecessor relationships must be verified before scheduling.'],
  }
}
