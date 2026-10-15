/** Phase 13: fail-closed readiness assessment. Pure; no schedule writes. */
export type ForecastActivityEvidence = {
  activityId: string
  measuredDays: number
  evidenceEnd: string
  remainingQuantityAsOf: string | null
  workingDaysPerWeek: number
  crewId: string | null
  crewCount: number
  availableCrewCount: number | null
}
export type ForecastReadiness = {
  ready: boolean
  accepted: ReadonlyMap<string, number>
  issues: string[]
  warnings: string[]
}
const dateMs = (value: string | null): number | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const ms = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms : null
}
/**
 * Check freshness, quantity as-of dates and available crews. Does not infer
 * shared-resource sequencing, site calendars or a final completion date.
 */
export function assessPackageForecastReadiness(
  activities: readonly ForecastActivityEvidence[],
  expectedUnfinishedActivityIds: readonly string[],
  now: Date = new Date(),
  maxAgeDays = 14,
): ForecastReadiness {
  const issues: string[] = []
  const warnings: string[] = []
  const accepted = new Map<string, number>()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  if (!Number.isInteger(maxAgeDays) || maxAgeDays < 0) issues.push('Invalid evidence freshness threshold')
  const expected = new Set(expectedUnfinishedActivityIds.map(String))
  const seen = new Set<string>()
  const crews = new Map<string, string[]>()
  for (const item of activities) {
    const id = String(item.activityId)
    if (seen.has(id)) { issues.push(`${id}: duplicate evidence`); accepted.delete(id); continue }
    seen.add(id)
    if (!expected.has(id)) { issues.push(`${id}: activity is not an unfinished activity in this package`); continue }
    const end = dateMs(item.evidenceEnd)
    const asOf = dateMs(item.remainingQuantityAsOf)
    if (end === null || asOf === null) { issues.push(`${id}: evidence or remaining-quantity as-of date missing/invalid`); continue }
    if (end > today || asOf > today) { issues.push(`${id}: future-dated evidence`); continue }
    if (asOf < end) { issues.push(`${id}: remaining quantity predates the latest production record; reassess remaining work`); continue }
    if (today - end > maxAgeDays * 86400000 || today - asOf > maxAgeDays * 86400000) { issues.push(`${id}: stale production evidence or remaining-work assessment`); continue }
    if (!Number.isFinite(item.measuredDays) || item.measuredDays <= 0) { issues.push(`${id}: invalid measured duration`); continue }
    if (!Number.isInteger(item.workingDaysPerWeek) || item.workingDaysPerWeek < 1 || item.workingDaysPerWeek > 7) { issues.push(`${id}: invalid working calendar`); continue }
    if (!item.crewId?.trim() || !Number.isInteger(item.crewCount) || item.crewCount < 1 || item.availableCrewCount === null || !Number.isInteger(item.availableCrewCount) || item.availableCrewCount < item.crewCount) {
      issues.push(`${id}: named crew and independently confirmed capacity required`); continue
    }
    const crew = item.crewId.trim()
    crews.set(crew, [...(crews.get(crew) || []), id])
    accepted.set(id, Math.ceil(item.measuredDays))
  }
  for (const id of expected) if (!accepted.has(id)) issues.push(`${id}: no admissible measured duration`)
  for (const [crew, ids] of crews) if (ids.length > 1) {
    issues.push(`Crew ${crew} assigned to multiple unfinished activities (${ids.join(', ')}); resource sequencing required`)
    ids.forEach(id => accepted.delete(id))
  }
  if (new Set(activities.map(a => a.workingDaysPerWeek)).size > 1) warnings.push('Different working calendars require calendar-aware scheduling')
  warnings.push('This gate does not resolve public holidays, site shutdowns, procurement, resource overlaps or approval of a recovery programme.')
  return { ready: issues.length === 0 && expected.size > 0, accepted, issues, warnings }
}
