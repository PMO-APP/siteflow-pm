import { differenceInDays } from 'date-fns'
import type { ProjectState } from '@/core/intelligence/models/ProjectState'
import {
  getApplicableStageTemplates,
  resolveProjectScopeTemplate,
  type DeliveryStageTemplate,
} from './deliveryStageConfig'
import type {
  DeliveryPackagePerformance,
  DeliveryStage,
  DeliveryStageBlocker,
  DeliveryStageStatus,
  DeliveryTwinResult,
  DeliveryDependencyIntelligence,
  DependencyHealth,
} from './deliveryTwinTypes'

type ScheduleActivity = ProjectState['schedule']['activities'][number]

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function normalize(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_–—-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function getStageMatchScore(stage: DeliveryStageTemplate, activity: ScheduleActivity) {
  const name = normalize(activity.name)
  const phase = normalize(activity.phase)
  let score = 0
  for (const rawAlias of stage.aliases) {
    const alias = normalize(rawAlias)
    if (!alias) continue
    if (name === alias) score = Math.max(score, 120)
    else if (name.startsWith(`${alias} `) || name.endsWith(` ${alias}`)) score = Math.max(score, 105)
    else if (name.includes(alias)) score = Math.max(score, 95)
    if (phase === alias) score = Math.max(score, 45)
    else if (phase.includes(alias)) score = Math.max(score, 30)
  }
  if (score > 0 && stage.disciplines?.some(d => normalize(d) === normalize(activity.discipline))) score += 3
  return score
}

function classifyActivities(templates: DeliveryStageTemplate[], activities: ScheduleActivity[]) {
  const result = new Map<string, ScheduleActivity[]>()
  templates.forEach(stage => result.set(stage.id, []))
  for (const activity of activities) {
    const best = templates
      .map(stage => ({ stage, score: getStageMatchScore(stage, activity) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.stage.order - b.stage.order)[0]
    if (best) result.get(best.stage.id)?.push(activity)
  }
  return result
}

function weightedProgress(activities: ScheduleActivity[]) {
  if (!activities.length) return 0
  const totalWeight = activities.reduce((sum, item) => sum + Math.max(0, Number(item.weight || 0)), 0)
  if (totalWeight > 0) {
    return Math.round(activities.reduce((sum, item) => sum + clamp(item.progress) * (Math.max(0, Number(item.weight || 0)) / totalWeight), 0))
  }
  return Math.round(activities.reduce((sum, item) => sum + clamp(item.progress), 0) / activities.length)
}

function buildGlobalBlockers(state: ProjectState, stage: DeliveryStageTemplate): DeliveryStageBlocker[] {
  const blockers: DeliveryStageBlocker[] = []
  if (state.approvals.overdueApprovals > 0) blockers.push({ id: `${stage.id}-approval`, title: `${state.approvals.overdueApprovals} overdue approval item(s)`, source: 'approval', ownerId: null, ownerName: 'Design / Approval Owner', route: '/app/approvals', severity: state.approvals.overdueApprovals >= 3 ? 'critical' : 'warning' })
  if (state.procurement.atRiskItems > 0) blockers.push({ id: `${stage.id}-procurement`, title: `${state.procurement.atRiskItems} procurement item(s) at risk`, source: 'procurement', ownerId: null, ownerName: 'Procurement Owner', route: '/app/procurement', severity: state.procurement.atRiskItems >= 3 ? 'critical' : 'warning' })
  if (state.quality.failedInspections > 0) blockers.push({ id: `${stage.id}-quality`, title: `${state.quality.failedInspections} failed inspection(s)`, source: 'quality', ownerId: null, ownerName: 'Quality Owner', route: '/app/quality', severity: 'critical' })
  if (state.risk.unmitigatedHighRisks > 0) blockers.push({ id: `${stage.id}-risk`, title: `${state.risk.unmitigatedHighRisks} high risk(s) without mitigation`, source: 'risk', ownerId: null, ownerName: 'Risk Owner', route: '/app/risk', severity: 'critical' })
  if (state.hse.overdueActions > 0) blockers.push({ id: `${stage.id}-hse`, title: `${state.hse.overdueActions} overdue HSE action(s)`, source: 'hse', ownerId: null, ownerName: 'HSE Owner', route: '/app/hse', severity: 'critical' })
  return blockers
}

function status(progress: number, blockerCount: number, hasStarted: boolean): DeliveryStageStatus {
  if (progress >= 100) return 'completed'
  if (blockerCount > 0 && hasStarted) return 'blocked'
  if (hasStarted) return 'in_progress'
  return 'not_started'
}

function packageHealth(overdue: ScheduleActivity[], total: number) {
  if (!total) return 100
  const now = new Date()
  const burden = overdue.reduce((sum, task) => {
    const finish = task.plannedFinish ? new Date(task.plannedFinish) : null
    const days = finish && !Number.isNaN(finish.getTime()) ? Math.max(1, differenceInDays(now, finish)) : 1
    const remaining = Math.max(0.1, (100 - task.progress) / 100)
    return sum + Math.min(4, 1 + days / 30) * remaining
  }, 0)
  return Math.round(clamp(100 - (burden / Math.max(1, total)) * 55))
}

function healthLabel(score: number): DeliveryPackagePerformance['healthLabel'] {
  if (score >= 85) return 'Healthy'
  if (score >= 70) return 'Watch'
  if (score >= 50) return 'At Risk'
  return 'Critical'
}

function calculatePackages(
  state: ProjectState,
  templates: DeliveryStageTemplate[],
): DeliveryPackagePerformance[] {
  const now = new Date()
  const packages = state.schedule.packages.length
    ? state.schedule.packages
    : [{ id: 'project', name: state.project.name, discipline: null, contractorName: null, weight: 100, packageType: 'Project' }]

  return packages.map(pkg => {
    const activities = state.schedule.activities.filter(item => state.schedule.packages.length ? item.deliveryPackageId === pkg.id : true)
    const overdue = activities.filter(item => item.progress < 100 && item.plannedFinish && new Date(item.plannedFinish) < now)
    const progress = weightedProgress(activities)
    const starts = activities.map(a => a.plannedStart ? new Date(a.plannedStart) : null).filter(Boolean) as Date[]
    const finishes = activities.map(a => a.plannedFinish ? new Date(a.plannedFinish) : null).filter(Boolean) as Date[]
    const start = starts.sort((a,b) => a.getTime()-b.getTime())[0]
    const finish = finishes.sort((a,b) => b.getTime()-a.getTime())[0]
    const durationDays = start && finish ? Math.max(1, differenceInDays(finish, start)) : 0
    const plannedProgress = start && finish
      ? Math.round(clamp((differenceInDays(now, start) / durationDays) * 100))
      : 0
    const variance = progress - plannedProgress
    const score = packageHealth(overdue, activities.length)
    const primaryDelay = [...overdue].sort((a,b) => {
      const ac = (a.isCritical ? 1000 : 0) + (100 - a.progress)
      const bc = (b.isCritical ? 1000 : 0) + (100 - b.progress)
      return bc - ac
    })[0]

    const packageClassified = classifyActivities(templates, activities)
    const stageProgress = templates.map(stage => ({
      stage,
      progress: weightedProgress(packageClassified.get(stage.id) || []),
      activities: packageClassified.get(stage.id) || [],
    }))
    const currentStage = stageProgress.find(item => item.progress > 0 && item.progress < 100)
      || stageProgress.find(item => item.progress < 100 && item.activities.length > 0)
      || null

    const share = state.schedule.activities.length > 0
      ? activities.length / state.schedule.activities.length
      : 1 / Math.max(1, packages.length)
    const allocate = (value: number) => Math.max(0, Math.round(value * share))

    const recentActivityNames = [...activities]
      .filter(item => item.updatedAt)
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 3)
      .map(item => item.name)

    const upcomingMilestones = [...activities]
      .filter(item => item.progress < 100 && item.plannedFinish)
      .sort((a, b) => new Date(a.plannedFinish || 0).getTime() - new Date(b.plannedFinish || 0).getTime())
      .slice(0, 3)
      .map(item => ({ id: item.id, name: item.name, plannedFinish: item.plannedFinish }))

    return {
      id: pkg.id,
      name: pkg.name,
      discipline: pkg.discipline,
      contractorName: pkg.contractorName,
      weight: pkg.weight,
      progress,
      plannedProgress,
      variance,
      overdueActivities: overdue.length,
      totalActivities: activities.length,
      healthScore: score,
      healthLabel: healthLabel(score),
      primaryDelayActivity: primaryDelay?.name || null,
      currentStageId: currentStage?.stage.id || null,
      currentStageName: currentStage?.stage.name || null,
      daysVariance: durationDays ? Math.round((variance / 100) * durationDays) : 0,
      issueSummary: {
        delayedActivities: overdue.length,
        openApprovals: allocate(state.approvals.pendingApprovals),
        procurementBlockers: allocate(state.procurement.atRiskItems + state.procurement.overdueItems),
        openRisks: allocate(state.risk.openRisks),
        openSnags: allocate(state.quality.openSnags),
        qualityFailures: allocate(state.quality.failedInspections),
        hseIncidents: allocate(state.hse.incidents),
      },
      recentActivityNames,
      upcomingMilestones,
    }
  })
}


function dependencyHealth(activity: ScheduleActivity, now: Date): DependencyHealth {
  if (activity.isBlocked) return 'blocked'
  const finish = activity.plannedFinish ? new Date(activity.plannedFinish) : null
  if (activity.progress < 100 && finish && !Number.isNaN(finish.getTime()) && finish < now) return 'at_risk'
  return 'healthy'
}

function buildDependencyIntelligence(state: ProjectState): DeliveryDependencyIntelligence {
  const activities = state.schedule.activities
  const now = new Date()
  const byId = new Map(activities.map(item => [item.id, item]))
  const packageById = new Map(state.schedule.packages.map(item => [item.id, item.name]))
  const successors = new Map<string, string[]>()

  activities.forEach(activity => {
    activity.predecessorIds.forEach(predecessorId => {
      successors.set(predecessorId, [...(successors.get(predecessorId) || []), activity.id])
    })
  })

  const nodes = activities.map(activity => ({
    id: activity.id,
    name: activity.name,
    packageId: activity.deliveryPackageId,
    packageName: activity.deliveryPackageName || (activity.deliveryPackageId ? packageById.get(activity.deliveryPackageId) || null : null),
    progress: activity.progress,
    isCritical: activity.isCritical,
    isMilestone: Boolean((activity as ScheduleActivity & { isMilestone?: boolean }).isMilestone),
    plannedFinish: activity.plannedFinish,
    health: dependencyHealth(activity, now),
    predecessorIds: activity.predecessorIds.filter(id => byId.has(id)),
    successorIds: successors.get(activity.id) || [],
  }))

  const edges = nodes.flatMap(node => node.predecessorIds.map(predecessorId => {
    const predecessor = byId.get(predecessorId)!
    const predecessorHealth = dependencyHealth(predecessor, now)
    const health: DependencyHealth = predecessor.progress < 100 && node.progress > 0
      ? 'blocked'
      : predecessorHealth === 'blocked'
      ? 'blocked'
      : predecessorHealth === 'at_risk' || (predecessor.isCritical && predecessor.progress < 100)
      ? 'at_risk'
      : 'healthy'
    return {
      id: `${predecessorId}-${node.id}`,
      from: predecessorId,
      to: node.id,
      health,
      reason: health === 'blocked'
        ? `${predecessor.name} is preventing ${node.name} from progressing.`
        : health === 'at_risk'
        ? `${predecessor.name} may delay ${node.name}.`
        : `${predecessor.name} is supporting ${node.name} as planned.`,
    }
  }))

  const downstream = (startId: string) => {
    const visited = new Set<string>()
    const stack = [...(successors.get(startId) || [])]
    while (stack.length) {
      const id = stack.pop()!
      if (visited.has(id)) continue
      visited.add(id)
      stack.push(...(successors.get(id) || []))
    }
    return [...visited]
  }

  const bottlenecks = nodes
    .map(node => {
      const affected = downstream(node.id)
      const packageCount = new Set(affected.map(id => byId.get(id)?.deliveryPackageId).filter(Boolean)).size
      return { activityId: node.id, activityName: node.name, downstreamCount: affected.length, packageCount, isCritical: node.isCritical, health: node.health }
    })
    .filter(item => item.downstreamCount > 0)
    .sort((a, b) => (b.isCritical ? 10 : 0) + b.downstreamCount - ((a.isCritical ? 10 : 0) + a.downstreamCount))
    .slice(0, 5)

  const crossPackageLinks = edges.filter(edge => {
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    return Boolean(from?.deliveryPackageId && to?.deliveryPackageId && from.deliveryPackageId !== to.deliveryPackageId)
  }).length

  return {
    nodes,
    edges,
    criticalPathIds: nodes.filter(node => node.isCritical).map(node => node.id),
    bottlenecks,
    crossPackageLinks,
    blockedLinks: edges.filter(edge => edge.health === 'blocked').length,
    atRiskLinks: edges.filter(edge => edge.health === 'at_risk').length,
  }
}

export function calculateDeliveryTwin(state: ProjectState): DeliveryTwinResult {
  const scopeTemplate = resolveProjectScopeTemplate(state.project.scope)
  const templates = getApplicableStageTemplates(state.project.scope)
  const classified = classifyActivities(templates, state.schedule.activities)
  const rawProgress = new Map(templates.map(stage => [stage.id, weightedProgress(classified.get(stage.id) || [])]))
  const allScheduleComplete = state.schedule.totalActivities > 0 && state.schedule.completedActivities === state.schedule.totalActivities

  // The Digital Twin represents physical delivery stages, not isolated words in a programme.
  // Later-stage percentages are suppressed until their physical prerequisites are substantially complete.
  const credibleProgress = new Map(rawProgress)
  const raw = (id: string) => rawProgress.get(id) || 0
  const set = (id: string, value: number) => credibleProgress.set(id, clamp(value))

  if (raw('substructure') > 0 || raw('superstructure') > 0 || raw('roofing') > 0) set('mobilisation', 100)
  set('substructure', raw('substructure'))
  set('superstructure', raw('substructure') >= 80 ? raw('superstructure') : 0)
  set('roofing', (credibleProgress.get('superstructure') || 0) >= 80 ? raw('roofing') : 0)
  set('mep-first-fix', raw('substructure') >= 80 ? raw('mep-first-fix') : 0)
  set('internal-finishes', (credibleProgress.get('roofing') || 0) >= 80 ? raw('internal-finishes') : 0)
  set('testing-commissioning', (credibleProgress.get('internal-finishes') || 0) >= 80 ? raw('testing-commissioning') : 0)
  set('snagging', (credibleProgress.get('internal-finishes') || 0) >= 90 ? raw('snagging') : 0)
  set('handover', allScheduleComplete ? 100 : 0)

  const stages: DeliveryStage[] = templates.map(stage => {
    const activities = classified.get(stage.id) || []
    const progress = credibleProgress.get(stage.id) || 0

    const scheduleBlockers: DeliveryStageBlocker[] = activities
      .filter(activity => activity.isBlocked && activity.progress < 100)
      .map(activity => ({ id: `schedule-${activity.id}`, title: `${activity.name} is blocked`, source: 'schedule', ownerId: null, ownerName: activity.deliveryPackageName || activity.discipline || 'Project Team', route: '/app/schedule', severity: activity.isCritical ? 'critical' : 'warning' }))
    const hasStarted = progress > 0 && progress < 100
    const blockers = [...scheduleBlockers, ...(hasStarted ? buildGlobalBlockers(state, stage) : [])]
    const criticalActivityCount = activities.filter(a => a.isCritical && a.progress < 100).length
    const readinessScore = stage.id === 'handover'
      ? (allScheduleComplete ? 100 : 0)
      : clamp(100 - blockers.filter(b => b.severity === 'critical').length * 20 - blockers.filter(b => b.severity === 'warning').length * 10 - criticalActivityCount * 5)

    return {
      id: stage.id,
      name: stage.name,
      progress,
      status: status(progress, blockers.length, hasStarted),
      activityIds: activities.map(a => a.id),
      blockerCount: blockers.length,
      criticalActivityCount,
      readinessScore,
      route: stage.defaultRoute,
      blockers,
      ownerLabel: activities.find(a => a.deliveryPackageName)?.deliveryPackageName || activities.find(a => a.discipline)?.discipline || null,
      applicable: true,
    }
  })

  const activeStage = stages.find(stage => stage.status === 'in_progress' || stage.status === 'blocked') || null
  const activeIndex = activeStage ? stages.findIndex(stage => stage.id === activeStage.id) : -1
  const nextStage = activeIndex >= 0 ? stages.slice(activeIndex + 1).find(stage => stage.status !== 'completed') || null : stages.find(stage => stage.status !== 'completed') || null
  const packages = calculatePackages(state, templates)

  return {
    projectId: state.project.id,
    scopeTemplate,
    stages,
    activeStage,
    nextStage,
    completedStages: stages.filter(stage => stage.status === 'completed').length,
    totalApplicableStages: stages.length,
    overallProgress: state.schedule.weightedProgress,
    packages,
    isMultiPackage: packages.length > 1,
    generatedAt: new Date().toISOString(),
    dependencyIntelligence: buildDependencyIntelligence(state),
  }
}
