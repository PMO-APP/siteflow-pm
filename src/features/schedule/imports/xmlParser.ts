import type {
  ImportedScheduleTask,
  ScheduleDiscipline,
} from './types'

function getNodeText(node: Element, tag: string) {
  return node.getElementsByTagName(tag)[0]?.textContent || ''
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

  return Array.from(xml.getElementsByTagName('Task'))
    .map((taskNode, index): ImportedScheduleTask | null => {
      const name = getNodeText(taskNode, 'Name').trim()
      const uid = getNodeText(taskNode, 'UID')
      const id = getNodeText(taskNode, 'ID')
      const outlineLevel = getNodeText(taskNode, 'OutlineLevel')
      const start = getNodeText(taskNode, 'Start')
      const finish = getNodeText(taskNode, 'Finish')
      const milestone = getNodeText(taskNode, 'Milestone')
      const percentComplete = Number(
        getNodeText(taskNode, 'PercentComplete') || 0
      )

      if (!name) return null

      return {
        project_id: projectId,
        discipline,
        delivery_package_id: deliveryPackageId,
        schedule_version_id: scheduleVersionId || null,
        schedule_source: 'Imported',
        task_number: Number(id || uid || index + 1),
        name,
        phase:
          outlineLevel === '1'
            ? name
            : `Imported ${discipline} MS Project Schedule`,
        start_date: start ? start.slice(0, 10) : null,
        finish_date: finish ? finish.slice(0, 10) : null,
        planned_start: start ? start.slice(0, 10) : null,
        planned_finish: finish ? finish.slice(0, 10) : null,
        dependencies: null,
        responsible: null,
        status:
          percentComplete >= 100
            ? 'Completed'
            : percentComplete > 0
            ? 'In Progress'
            : 'Not Started',
        rag: '',
        progress_pct: percentComplete,
        procurement_deadline: null,
        approval_deadline: null,
        notes: `Imported from MS Project XML. UID: ${
          uid || 'N/A'
        }`,
        is_milestone:
          milestone === '1' ||
          milestone.toLowerCase() === 'true',
      }
    })
    .filter((task): task is ImportedScheduleTask => Boolean(task))
}
