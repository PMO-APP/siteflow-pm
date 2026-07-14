export type CommandCenterSection =
  | 'forecast'
  | 'health'
  | 'deliveryPulse'
  | 'commercial'
  | 'quality'
  | 'risk'
  | 'approvals'
  | 'procurement'
  | 'governance'
  | 'liveActivity'
  | 'todaysFocus'

type RoleConfig = {
  title: string
  defaultSections: CommandCenterSection[]
  primaryRoute: string
}

const defaultConfig: RoleConfig = {
  title: 'Project Workspace',
  defaultSections: [
    'forecast',
    'health',
    'deliveryPulse',
    'todaysFocus',
    'liveActivity',
  ],
  primaryRoute: '/app',
}

export const commandCenterRoleConfig: Record<string, RoleConfig> = {
  workspace_admin: {
    title: 'Executive Command Center',
    defaultSections: [
      'forecast',
      'health',
      'deliveryPulse',
      'commercial',
      'governance',
      'liveActivity',
    ],
    primaryRoute: '/app/portfolio',
  },

  admin: {
    title: 'Executive Command Center',
    defaultSections: [
      'forecast',
      'health',
      'deliveryPulse',
      'commercial',
      'governance',
      'liveActivity',
    ],
    primaryRoute: '/app/portfolio',
  },

  pmo: {
    title: 'PMO Control Center',
    defaultSections: [
      'forecast',
      'health',
      'deliveryPulse',
      'governance',
      'approvals',
      'quality',
      'risk',
      'liveActivity',
    ],
    primaryRoute: '/app',
  },

  portfolio_manager: {
    title: 'Portfolio Command Center',
    defaultSections: [
      'health',
      'deliveryPulse',
      'commercial',
      'risk',
      'governance',
      'liveActivity',
    ],
    primaryRoute: '/app/portfolio',
  },

  project_owner: {
    title: 'Project Delivery Workspace',
    defaultSections: [
      'forecast',
      'health',
      'deliveryPulse',
      'todaysFocus',
      'approvals',
      'procurement',
      'liveActivity',
    ],
    primaryRoute: '/app',
  },

  design: {
    title: 'Design Review Workspace',
    defaultSections: [
      'approvals',
      'todaysFocus',
      'liveActivity',
    ],
    primaryRoute: '/app/approvals',
  },

  costing: {
    title: 'Commercial Control Workspace',
    defaultSections: [
      'commercial',
      'approvals',
      'todaysFocus',
      'liveActivity',
    ],
    primaryRoute: '/app/costing',
  },

  hse: {
    title: 'HSE Workspace',
    defaultSections: [
      'health',
      'todaysFocus',
      'liveActivity',
    ],
    primaryRoute: '/app/hse',
  },

  hse_lead: {
    title: 'HSE Control Center',
    defaultSections: [
      'health',
      'governance',
      'todaysFocus',
      'liveActivity',
    ],
    primaryRoute: '/app/hse',
  },

  hse_manager: {
    title: 'HSE Control Center',
    defaultSections: [
      'health',
      'governance',
      'todaysFocus',
      'liveActivity',
    ],
    primaryRoute: '/app/hse',
  },

  contractor: {
    title: 'Contractor Workspace',
    defaultSections: [
      'todaysFocus',
      'quality',
      'liveActivity',
    ],
    primaryRoute: '/app/external',
  },

  consultant: {
    title: 'Consultant Review Workspace',
    defaultSections: [
      'approvals',
      'todaysFocus',
      'liveActivity',
    ],
    primaryRoute: '/app/external',
  },
}

export function getCommandCenterRoleConfig(
  role?: string | null
): RoleConfig {
  return role && commandCenterRoleConfig[role]
    ? commandCenterRoleConfig[role]
    : defaultConfig
}
