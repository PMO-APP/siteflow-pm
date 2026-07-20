import { differenceInCalendarDays } from 'date-fns'
import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import { toDate } from '@/core/intelligence/normalizers/dateUtils'
import type { V7ActivityState } from './types'

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

function durationDays(start: Date | null, finish: Date | null) {
  if (!start || !finish) return 1
  return Math.max(1, differenceInCalendarDays(finish, start) + 1)
}

function likelySummary(name: string, activity: ProjectState['schedule']['activities'][number]) {
  const normalized = name.trim()
  const words = normalized.split(/\s+/).length
  const allCaps = normalized.length > 3 && normalized === normalized.toUpperCase() && /[A-Z]/.test(normalized)
  const generic = /^(main building|building works|construction works|project works|phase\s*\d+|section\s*\d+|superstructure|substructure|finishes|external works)$/i.test(normalized)
  const hasDatesButNoProgress = activity.progress === 0 && activity.predecessorIds.length === 0 && words <= 4 && allCaps
  return generic || hasDatesButNoProgress
}

export function analyseSchedule(state: ProjectState, today = new Date()): V7ActivityState[] {
  const activities = state.schedule.activities
  const successorMap = new Map<string, string[]>()
  activities.forEach(activity => {
    activity.predecessorIds.forEach(id => {
      successorMap.set(id, [...(successorMap.get(id) || []), activity.id])
    })
  })
  const byId = new Map(activities.map(activity => [activity.id, activity]))

  return activities.map(activity => {
    const start = toDate(activity.plannedStart)
    const finish = toDate(activity.plannedFinish)
    const duration = durationDays(start, finish)
    const isSummary = likelySummary(activity.name, activity)
    const isMilestone = Boolean(start && finish && differenceInCalendarDays(finish, start) === 0)

    let expectedProgress = 0
    if (start && finish) {
      if (today < start) expectedProgress = 0
      else if (today > finish) expectedProgress = 100
      else expectedProgress = clamp(((differenceInCalendarDays(today, start) + 1) / duration) * 100)
    }

    const actualProgress = clamp(activity.progress)
    const variancePercent = actualProgress - expectedProgress
    const varianceDays = expectedProgress > actualProgress
      ? Math.ceil(((expectedProgress - actualProgress) / 100) * duration)
      : 0

    const predecessorsComplete = activity.predecessorIds.every(id => {
      const predecessor = byId.get(id)
      return !predecessor || predecessor.progress >= 100
    })
    const isDue = Boolean(start && start <= today)
    const isOverdue = Boolean(finish && finish < today && actualProgress < 100)
    const isActive = actualProgress > 0 && actualProgress < 100
    const isReady = actualProgress < 100 && predecessorsComplete
    const isBlocking = activity.isBlocked || (!predecessorsComplete && isDue)
    const successors = successorMap.get(activity.id) || []
    const hasWaitingSuccessor = successors.some(id => {
      const successor = byId.get(id)
      const successorStart = successor ? toDate(successor.plannedStart) : null
      return Boolean(successor && successor.progress < 100 && successorStart && successorStart <= today)
    })
    const isCriticalImpact = !isSummary && actualProgress < 100 && (
      activity.isCritical || isBlocking || hasWaitingSuccessor
    )

    let health: V7ActivityState['health']
    if (actualProgress >= 100) health = 'completed'
    else if (!isDue) health = 'future'
    else if (isBlocking) health = 'blocked'
    else if (variancePercent >= 8) health = 'ahead'
    else if (variancePercent >= -5) health = 'on_track'
    else if (variancePercent >= -15) health = 'watch'
    else health = 'behind'

    return {
      activity,
      durationDays: duration,
      expectedProgress: Math.round(expectedProgress),
      actualProgress: Math.round(actualProgress),
      variancePercent: Math.round(variancePercent),
      varianceDays,
      isSummary,
      isMilestone,
      isDue,
      isOverdue,
      isActive,
      isReady,
      isBlocking,
      isCriticalImpact,
      successors,
      health,
    }
  })
}
