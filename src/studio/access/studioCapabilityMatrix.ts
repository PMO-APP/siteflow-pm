import type {
  StudioCapability,
  StudioRole,
} from './studioCapabilities'

const PMO_CAPABILITIES: StudioCapability[] = [
  'studio.access',
  'studio.intelligence',
  'studio.project-state',
  'studio.recovery-validator',
  'studio.project-twin',
  'studio.portfolio-simulator',
  'studio.scenario-builder',
  'studio.executive-preview',
  'studio.ai-preview',
  'studio.performance',
  'studio.permissions',
  'studio.design-system',
]

const ADMIN_CAPABILITIES: StudioCapability[] = [
  ...PMO_CAPABILITIES,
  'studio.events',
  'studio.feature-flags',
  'studio.database',
  'studio.migrations',
  'studio.system-config',
]

const DEVELOPER_CAPABILITIES: StudioCapability[] = [
  ...ADMIN_CAPABILITIES,
]

export const studioCapabilityMatrix: Record<string, StudioCapability[]> = {
  workspace_admin: ADMIN_CAPABILITIES,
  admin: ADMIN_CAPABILITIES,
  pmo: PMO_CAPABILITIES,
  developer: DEVELOPER_CAPABILITIES,
}

export function getStudioCapabilities(
  role?: StudioRole | null
): StudioCapability[] {
  if (!role) return []
  return studioCapabilityMatrix[role] || []
}

export function hasStudioCapability(
  role: StudioRole | null | undefined,
  capability: StudioCapability
) {
  return getStudioCapabilities(role).includes(capability)
}
