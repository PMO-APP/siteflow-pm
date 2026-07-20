import type { V7ActivityState, V7Workfront } from './types'

const stagePatterns: Array<[RegExp, string]> = [
  [/mobil|prelim|site establishment|setting out|material delivery/i, 'Mobilisation'],
  [/pile|foundation|excavat|blinding|ground beam|substructure/i, 'Substructure'],
  [/column|slab|beam|stair|superstructure|frame|structural/i, 'Superstructure'],
  [/roof/i, 'Roofing'],
  [/m&e|mep|electrical|mechanical|plumb|first fix|second fix/i, 'MEP'],
  [/plaster|render|screed|tile|ceiling|paint|joinery|finish/i, 'Finishes'],
  [/external|landscape|road|drain|fence|cladding/i, 'External Works'],
  [/test|commission/i, 'Testing & Commissioning'],
  [/snag/i, 'Snagging'],
  [/handover|closeout|close-out/i, 'Handover'],
]

function stageOf(item: V7ActivityState) {
  const text = `${item.activity.phase || ''} ${item.activity.name}`
  return stagePatterns.find(([pattern]) => pattern.test(text))?.[1]
    || item.activity.phase
    || item.activity.discipline
    || 'General'
}

function weightedAverage(items: V7ActivityState[], key: 'actualProgress' | 'expectedProgress') {
  if (!items.length) return 0
  const totalWeight = items.reduce((sum, item) => sum + Math.max(1, item.activity.weight || item.durationDays), 0)
  return Math.round(items.reduce((sum, item) => sum + item[key] * Math.max(1, item.activity.weight || item.durationDays), 0) / totalWeight)
}

export function detectWorkfronts(activities: V7ActivityState[]): V7Workfront[] {
  const relevant = activities.filter(item => !item.isSummary && (
    item.isActive || item.isReady || item.isBlocking || item.health === 'behind' || item.health === 'watch'
  ))
  const groups = new Map<string, V7ActivityState[]>()
  relevant.forEach(item => {
    const key = `${stageOf(item)}::${item.activity.discipline || 'Unassigned'}`
    groups.set(key, [...(groups.get(key) || []), item])
  })

  return [...groups.entries()].map(([id, items]) => {
    const actual = weightedAverage(items, 'actualProgress')
    const expected = weightedAverage(items, 'expectedProgress')
    const leadActivity = [...items].sort((a, b) => {
      const aRank = a.isBlocking ? 4 : a.isCriticalImpact ? 3 : a.isActive ? 2 : 1
      const bRank = b.isBlocking ? 4 : b.isCriticalImpact ? 3 : b.isActive ? 2 : 1
      return bRank - aRank || b.varianceDays - a.varianceDays
    })[0] || null
    let status: V7Workfront['status'] = 'on_track'
    if (items.every(item => item.actualProgress >= 100)) status = 'completed'
    else if (items.some(item => item.isBlocking)) status = 'blocked'
    else if (expected - actual > 15) status = 'behind'
    else if (expected - actual > 5) status = 'watch'
    else if (actual - expected > 8) status = 'ahead'

    return {
      id,
      label: id.split('::')[0],
      discipline: items[0]?.activity.discipline || null,
      activities: items,
      leadActivity,
      progress: actual,
      expectedProgress: expected,
      variancePercent: actual - expected,
      status,
      critical: items.some(item => item.isCriticalImpact),
    }
  }).sort((a, b) => Number(b.critical) - Number(a.critical) || b.expectedProgress - a.expectedProgress)
}
