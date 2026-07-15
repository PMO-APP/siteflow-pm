export type ProjectScopeTemplate =
  | 'carcass'
  | 'shell_and_core'
  | 'fully_finished'
  | 'fully_furnished'
  | 'infrastructure'
  | 'custom'

export type DeliveryStageTemplate = {
  id: string
  name: string
  aliases: string[]
  disciplines?: string[]
  defaultRoute: string
  order: number
  applicableTo: ProjectScopeTemplate[]
}

export const DELIVERY_STAGE_TEMPLATES: DeliveryStageTemplate[] = [
  {
    id: 'mobilisation',
    name: 'Mobilisation',
    aliases: ['mobilisation', 'mobilization', 'site establishment', 'preliminaries'],
    defaultRoute: '/app/schedule',
    order: 10,
    applicableTo: ['carcass', 'shell_and_core', 'fully_finished', 'fully_furnished', 'infrastructure', 'custom'],
  },
  {
    id: 'substructure',
    name: 'Substructure',
    aliases: ['substructure', 'foundation', 'foundations', 'ground beam', 'raft', 'pile', 'piling'],
    disciplines: ['Housebuild', 'Infrastructure'],
    defaultRoute: '/app/schedule',
    order: 20,
    applicableTo: ['carcass', 'shell_and_core', 'fully_finished', 'fully_furnished', 'custom'],
  },
  {
    id: 'superstructure',
    name: 'Superstructure',
    aliases: ['superstructure', 'frame', 'slab', 'blockwork', 'column', 'beam', 'upper floor'],
    disciplines: ['Housebuild'],
    defaultRoute: '/app/schedule',
    order: 30,
    applicableTo: ['carcass', 'shell_and_core', 'fully_finished', 'fully_furnished', 'custom'],
  },
  {
    id: 'roofing',
    name: 'Roofing',
    aliases: ['roofing', 'roof', 'truss', 'roof covering'],
    disciplines: ['Housebuild'],
    defaultRoute: '/app/schedule',
    order: 40,
    applicableTo: ['carcass', 'shell_and_core', 'fully_finished', 'fully_furnished', 'custom'],
  },
  {
    id: 'mep-first-fix',
    name: 'MEP First Fix',
    aliases: ['mep first fix', 'first fix', 'electrical first fix', 'mechanical first fix', 'plumbing first fix'],
    disciplines: ['MEP'],
    defaultRoute: '/app/schedule',
    order: 50,
    applicableTo: ['shell_and_core', 'fully_finished', 'fully_furnished', 'custom'],
  },
  {
    id: 'internal-finishes',
    name: 'Internal Finishes',
    aliases: ['internal finishes', 'finishes', 'ceiling', 'painting', 'tiling', 'joinery', 'floor finishes'],
    disciplines: ['Housebuild', 'MEP'],
    defaultRoute: '/app/schedule',
    order: 60,
    applicableTo: ['fully_finished', 'fully_furnished', 'custom'],
  },
  {
    id: 'furnishing',
    name: 'Furniture & Equipment',
    aliases: ['furniture', 'furnishing', 'fit-out', 'fitout', 'equipment installation', 'loose furniture'],
    defaultRoute: '/app/procurement',
    order: 70,
    applicableTo: ['fully_furnished', 'custom'],
  },
  {
    id: 'external-works',
    name: 'External Works',
    aliases: ['external works', 'landscaping', 'roads', 'roadworks', 'drainage', 'external drainage', 'paving'],
    disciplines: ['Infrastructure'],
    defaultRoute: '/app/schedule',
    order: 80,
    applicableTo: ['shell_and_core', 'fully_finished', 'fully_furnished', 'infrastructure', 'custom'],
  },
  {
    id: 'testing-commissioning',
    name: 'Testing & Commissioning',
    aliases: ['testing', 'commissioning', 'testing and commissioning', 't&c'],
    disciplines: ['MEP'],
    defaultRoute: '/app/quality',
    order: 90,
    applicableTo: ['fully_finished', 'fully_furnished', 'custom'],
  },
  {
    id: 'snagging',
    name: 'Snagging',
    aliases: ['snagging', 'snags', 'defects', 'defect rectification'],
    defaultRoute: '/app/snags',
    order: 100,
    applicableTo: ['shell_and_core', 'fully_finished', 'fully_furnished', 'custom'],
  },
  {
    id: 'handover',
    name: 'Handover',
    aliases: ['handover', 'practical completion', 'completion', 'closeout'],
    defaultRoute: '/app/handover',
    order: 110,
    applicableTo: ['carcass', 'shell_and_core', 'fully_finished', 'fully_furnished', 'infrastructure', 'custom'],
  },
]

export function resolveProjectScopeTemplate(scope?: string | null): ProjectScopeTemplate {
  const value = String(scope || '').trim().toLowerCase()

  if (!value) return 'custom'
  if (value.includes('furnished')) return 'fully_furnished'
  if (value.includes('fully finished') || value.includes('finished')) return 'fully_finished'
  if (value.includes('shell') || value.includes('core')) return 'shell_and_core'
  if (value.includes('carcass')) return 'carcass'
  if (value.includes('infrastructure')) return 'infrastructure'

  return 'custom'
}

export function getApplicableStageTemplates(scope?: string | null) {
  const template = resolveProjectScopeTemplate(scope)

  return DELIVERY_STAGE_TEMPLATES
    .filter(stage => stage.applicableTo.includes(template))
    .sort((a, b) => a.order - b.order)
}
