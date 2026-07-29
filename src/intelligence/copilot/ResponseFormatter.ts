export function joinStatements(values: Array<string | undefined>, fallback: string) {
  const cleaned = values.map(value => value?.trim()).filter(Boolean) as string[]
  return cleaned.length ? cleaned.join(' ') : fallback
}

export function sentence(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}
