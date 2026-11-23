import { normaliseActivityName, type RevisionProgrammeActivity } from './revisionProgramme'

export type ControlledRevision = {
  id: string | number
  block_id?: string | number | null
  delivery_package_id?: string | number | null
  revision_no?: number | string | null
  revision_name?: string | null
  programme_activities?: unknown
  activated_at?: string | null
  created_at?: string | null
}

type RevisableActivity = {
  name?: string | null
  task_number?: number | null
  compacted_revision_id?: string | null
  compacted_revision_task_number?: number | null
  delivery_package_id?: string | number | null
  start_date?: string | null
  finish_date?: string | null
  planned_start?: string | null
  planned_finish?: string | null
  dependencies?: string | null
  responsible?: string | null
  is_milestone?: boolean | null
}

export function usesCompactedNumbers(task: RevisableActivity, revisionId: ControlledRevision['id']) {
  return task.compacted_revision_id === String(revisionId)
}

export function revisionTaskNumber(task: RevisableActivity, revisionId: ControlledRevision['id']) {
  return usesCompactedNumbers(task, revisionId) ? task.compacted_revision_task_number : task.task_number
}

export function latestControlledRevisions<T extends ControlledRevision>(revisions: T[]) {
  return [...revisions].sort((a, b) =>
    (b.activated_at ?? '').localeCompare(a.activated_at ?? '') ||
    (b.created_at ?? '').localeCompare(a.created_at ?? ''))
}

export function applyControlledProgramme<T extends RevisableActivity>(tasks: T[], revisions: ControlledRevision[]): T[] {
  if (!revisions.length) return tasks
  return tasks.map(task => {
    // Package revisions control only their own contractor/package programme.
    // A project-wide revision is applied to the consolidated master in SchedulePage,
    // never sprayed across underlying contractor programmes where task numbers can repeat.
    const revision = task.delivery_package_id
      ? revisions.find(item => (item.delivery_package_id ?? item.block_id) && String(item.delivery_package_id ?? item.block_id) === String(task.delivery_package_id))
      : revisions.find(item => !item.block_id && !item.delivery_package_id)
    const activities = Array.isArray(revision?.programme_activities) ? revision.programme_activities as RevisionProgrammeActivity[] : []
    if (!revision || !activities.length) return task

    const taskName = normaliseActivityName(task.name)
    const number = revisionTaskNumber(task, revision.id)
    const taskNumber = number == null ? NaN : Number(number)
    const numbered = Number.isFinite(taskNumber)
      ? activities.filter(activity => Number(activity.task_number) === taskNumber)
      : []
    const named = activities.filter(activity => normaliseActivityName(activity.name) === taskName)
    // Within one package, task number is the strongest identity. Name is the
    // fallback for legacy imports. Ambiguous matches are deliberately ignored.
    const activity = numbered.length === 1 ? numbered[0] : named.length === 1 ? named[0] : undefined
    if (!activity) return task

    return {
      ...task,
      start_date: activity.start_date || task.start_date,
      finish_date: activity.finish_date || task.finish_date,
      planned_start: activity.start_date || task.planned_start || task.start_date,
      planned_finish: activity.finish_date || task.planned_finish || task.finish_date,
      dependencies: usesCompactedNumbers(task, revision.id) ? task.dependencies : activity.dependencies ?? task.dependencies,
      responsible: activity.responsible ?? task.responsible,
      is_milestone: activity.is_milestone || task.is_milestone,
      controlled_revision_id: revision.id,
      controlled_revision_no: revision.revision_no,
      controlled_revision_name: revision.revision_name,
    }
  })
}
