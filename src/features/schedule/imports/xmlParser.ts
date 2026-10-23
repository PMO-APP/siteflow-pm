import type {
  ImportedScheduleTask,
  ScheduleDiscipline,
} from './types'

// Read direct children only: a Task's nested PredecessorLink also contains UID/Type.
function childText(node: Element, tag: string): string {
  return Array.from(node.children).find(child => child.localName === tag)?.textContent?.trim() || ''
}

function childElements(node: Element, tag: string): Element[] {
  return Array.from(node.children).filter(child => child.localName === tag)
}


export async function parseMsProjectXmlFile({
  file,
  projectId,
  discipline,
  deliveryPackageId,
  scheduleVersionId,
}: {
  file: File
  projectId: number | string
  discipline: ScheduleDiscipline
  deliveryPackageId: string
  scheduleVersionId?: string | null
}): Promise<ImportedScheduleTask[]> {
  const text = await file.text()
  const parser = new DOMParser()
  const xml = parser.parseFromString(text, 'text/xml')

  if (xml.getElementsByTagName('parsererror')[0]) {
    throw new Error(
      'Invalid XML file. Please export again from MS Project as XML.'
    )
  }

  const taskNodes = Array.from(xml.getElementsByTagName('Task'))
  // MS Project PredecessorLink.PredecessorUID refers to UID, not row ID.
  // Resolve within the same XML file to the imported task_number (MSP ID).
  const uidToNumber = new Map<string, number>()
  for (const [index, node] of taskNodes.entries()) {
    const uid = childText(node, 'UID')
    const number = Number(childText(node, 'ID') || uid || index + 1)
    if (uid && Number.isFinite(number) && number > 0) uidToNumber.set(uid, number)
  }

  return taskNodes
    .map((taskNode, index): ImportedScheduleTask | null => {
      const name = childText(taskNode, 'Name')
      const uid = childText(taskNode, 'UID')
      const id = childText(taskNode, 'ID')
      const outlineLevel = childText(taskNode, 'OutlineLevel')
      const start = childText(taskNode, 'Start')
      const finish = childText(taskNode, 'Finish')
      const milestone = childText(taskNode, 'Milestone')
      const percentComplete = Number(childText(taskNode, 'PercentComplete') || 0)
      if (!name) return null

      const predecessors: string[] = []
      for (const link of childElements(taskNode, 'PredecessorLink')) {
        const predecessorUid = childText(link, 'PredecessorUID')
        const predecessorNumber = uidToNumber.get(predecessorUid)
        if (!predecessorNumber) throw new Error(`Task "${name}" references missing predecessor UID ${predecessorUid || '?'}. Import cancelled.`)
        if (predecessorNumber === Number(id || uid || index + 1)) throw new Error(`Task "${name}" references itself. Import cancelled.`)
        // MS Project XML Type: 0=FF, 1=FS, 2=SF, 3=SS.
        const type = childText(link, 'Type') || '1'
        const relation = ({ '0': 'FF', '1': 'FS', '2': 'SF', '3': 'SS' } as Record<string, string>)[type]
        if (!relation) throw new Error(`Unknown relationship type ${type} in "${name}".`)
        // LinkLag is tenths of a minute: 4800 = one eight-hour working day.
        const lag = Number(childText(link, 'LinkLag') || '0')
        if (!Number.isFinite(lag)) throw new Error(`Invalid lag in "${name}".`)
        const lagDays = lag / 4800
        const lagLabel = lag === 0 ? '' : `${lag > 0 ? '+' : '-'}${Number(Math.abs(lagDays).toFixed(5))}d`
        predecessors.push(relation === 'FS' && lag === 0
          ? String(predecessorNumber)
          : `${predecessorNumber}${relation}${lagLabel}`)
      }

      return {
        project_id: projectId,
        discipline,
        delivery_package_id: deliveryPackageId,
        schedule_version_id: scheduleVersionId || null,
        schedule_source: 'Imported',
        task_number: Number(id || uid || index + 1),
        name,
        phase: outlineLevel === '1' ? name : `Imported ${discipline} MS Project Schedule`,
        start_date: start ? start.slice(0, 10) : null,
        finish_date: finish ? finish.slice(0, 10) : null,
        planned_start: start ? start.slice(0, 10) : null,
        planned_finish: finish ? finish.slice(0, 10) : null,
        dependencies: predecessors.length ? [...new Set(predecessors)].join(',') : null,
        responsible: null,
        status: percentComplete >= 100 ? 'Completed' : percentComplete > 0 ? 'In Progress' : 'Not Started',
        rag: '',
        progress_pct: Number.isFinite(percentComplete) ? percentComplete : 0,
        procurement_deadline: null,
        approval_deadline: null,
        notes: `Imported from MS Project XML. UID: ${uid || 'N/A'}`,
        is_milestone: milestone === '1' || milestone.toLowerCase() === 'true',
      }
    })
    .filter((task): task is ImportedScheduleTask => Boolean(task))
}
