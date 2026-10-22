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

      const predecessors: number[] = []
      const unsupported: string[] = []
      for (const link of childElements(taskNode, 'PredecessorLink')) {
        const predecessorUid = childText(link, 'PredecessorUID')
        const type = childText(link, 'Type')
        const lag = Number(childText(link, 'LinkLag') || 0)
        const predecessorNumber = uidToNumber.get(predecessorUid)
        // MS Project XML relationship Type=1 is Finish-to-Start.
        // The existing forecast supports FS without lag only. Never
        // silently convert SS/FF/SF or lagged links to plain FS.
        if (!predecessorNumber || (type && type !== '1') || lag !== 0) {
          unsupported.push(`UID ${predecessorUid || '?'} (type ${type || 'unspecified'}, lag ${lag})`)
          continue
        }
        if (predecessorNumber !== Number(id || uid || index + 1)) predecessors.push(predecessorNumber)
      }
      // Fail closed: partial dependency networks create misleading forecasts.
      // The caller must explicitly handle unsupported relationships instead
      // of importing an apparently valid but incomplete dependency graph.
      if (unsupported.length) {
        throw new Error(`MS Project task "${name}" has unsupported/unresolved predecessor links: ${unsupported.join('; ')}. Import cancelled to protect forecast accuracy.`)
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
