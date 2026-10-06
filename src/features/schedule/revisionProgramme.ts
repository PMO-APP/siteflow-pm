import * as XLSX from 'xlsx'

export type RevisionProgrammeActivity = {
  task_number: number | null
  name: string
  phase: string | null
  start_date: string | null
  finish_date: string | null
  dependencies: string | null
  responsible: string | null
  is_milestone: boolean
}

function iso(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
  }
  const raw = String(value).trim()
  if (!raw) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function cell(row: Record<string, unknown>, names: string[]) {
  const entries = Object.entries(row)
  for (const wanted of names) {
    const found = entries.find(([key]) => key.trim().toLowerCase() === wanted.toLowerCase())
    if (found) return found[1]
  }
  return undefined
}

function parseExcel(buffer: ArrayBuffer): RevisionProgrammeActivity[] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  const activities: RevisionProgrammeActivity[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    for (const [index, row] of rows.entries()) {
      const name = String(cell(row, ['Task Name', 'Name', 'Activity', 'Activity Name', 'Task']) || '').trim()
      if (!name) continue
      const start = iso(cell(row, ['Start Date', 'Start', 'Planned Start']))
      const finish = iso(cell(row, ['Finish Date', 'Finish', 'Planned Finish', 'End Date']))
      if (!start && !finish) continue
      const numberValue = Number(cell(row, ['Task Number', 'ID', 'No.', 'No', 'Activity ID']) ?? index + 1)
      activities.push({
        task_number: Number.isFinite(numberValue) ? numberValue : null,
        name,
        phase: String(cell(row, ['Phase', 'WBS', 'Section']) || sheetName || '').trim() || null,
        start_date: start,
        finish_date: finish,
        dependencies: String(cell(row, ['Dependencies', 'Predecessors', 'Predecessor']) || '').trim() || null,
        responsible: String(cell(row, ['Responsible', 'Owner', 'Resource Names']) || '').trim() || null,
        is_milestone: String(cell(row, ['Milestone']) || '').toLowerCase() === 'yes',
      })
    }
  }
  return activities
}

function nodeText(node: Element, tag: string) {
  return node.getElementsByTagName(tag)[0]?.textContent || ''
}

function parseXml(text: string): RevisionProgrammeActivity[] {
  const xml = new DOMParser().parseFromString(text, 'text/xml')
  if (xml.getElementsByTagName('parsererror')[0]) throw new Error('The programme XML is invalid.')
  return Array.from(xml.getElementsByTagName('Task')).map((node, index) => {
    const name = nodeText(node, 'Name').trim()
    const id = Number(nodeText(node, 'ID') || nodeText(node, 'UID') || index + 1)
    return {
      task_number: Number.isFinite(id) ? id : null,
      name,
      phase: null,
      start_date: iso(nodeText(node, 'Start')),
      finish_date: iso(nodeText(node, 'Finish')),
      dependencies: null,
      responsible: null,
      is_milestone: ['1', 'true'].includes(nodeText(node, 'Milestone').toLowerCase()),
    }
  }).filter(item => item.name && (item.start_date || item.finish_date))
}

export async function parseRevisionProgrammeFile(file: File): Promise<RevisionProgrammeActivity[]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xml')) return parseXml(await file.text())
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return parseExcel(await file.arrayBuffer())
  throw new Error('To control schedule activities, upload the approved programme as Excel (.xlsx/.xls/.csv) or MS Project XML. PDF can remain an attachment but cannot drive activity dates.')
}

export async function parseRevisionProgrammeUrl(url: string, fileName = 'programme.xlsx') {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Could not read the approved programme file.')
  const blob = await response.blob()
  return parseRevisionProgrammeFile(new File([blob], fileName, { type: blob.type }))
}

export function normaliseActivityName(value?: string | null) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ')
}
