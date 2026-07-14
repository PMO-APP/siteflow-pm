export function toDate(value?: string | Date | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toISO(value?: string | Date | null) {
  return toDate(value)?.toISOString() || null
}

export function isPast(value?: string | Date | null, today = new Date()) {
  const date = toDate(value)
  return Boolean(date && date < today)
}
