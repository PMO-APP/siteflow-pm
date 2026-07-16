import * as XLSX from 'xlsx'

export function excelDateToISO(value: unknown): string | null {
  if (!value) return null

  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (!date) return null

    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(
      date.d
    ).padStart(2, '0')}`
  }

  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) return null

  return parsed.toISOString().slice(0, 10)
}
