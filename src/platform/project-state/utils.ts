export function toId(value: unknown) {
  return value === null || value === undefined ? '' : String(value)
}

export function toISO(value?: string | Date | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function normalizePredecessors(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(toId).filter(Boolean)
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }
  return []
}
