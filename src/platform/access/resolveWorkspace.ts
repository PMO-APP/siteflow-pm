import type { WorkspaceType } from './workspaceTypes'

const CONSULTANT_ROLES = new Set([
  'consultant',
  'architect',
  'architectural_consultant',
  'structural_consultant',
  'mep_consultant',
  'quantity_surveyor',
  'external_project_manager',
])

const CONTRACTOR_ROLES = new Set([
  'contractor',
  'subcontractor',
])

const VENDOR_ROLES = new Set([
  'vendor',
  'supplier',
])

export function normalizeWorkspaceType(
  value?: string | null
): WorkspaceType | null {
  const workspace = String(value || '').toLowerCase().trim()

  if (
    workspace === 'internal' ||
    workspace === 'consultant' ||
    workspace === 'contractor' ||
    workspace === 'vendor'
  ) {
    return workspace
  }

  return null
}

export function resolveWorkspace(
  role?: string | null,
  explicitWorkspace?: string | null
): WorkspaceType {
  const configured = normalizeWorkspaceType(explicitWorkspace)

  if (configured) return configured

  const normalizedRole = String(role || '').toLowerCase().trim()

  if (CONSULTANT_ROLES.has(normalizedRole)) return 'consultant'
  if (CONTRACTOR_ROLES.has(normalizedRole)) return 'contractor'
  if (VENDOR_ROLES.has(normalizedRole)) return 'vendor'

  return 'internal'
}

export function isExternalWorkspace(
  workspace?: WorkspaceType | null
) {
  return Boolean(workspace && workspace !== 'internal')
}

export function getWorkspaceHome(workspace: WorkspaceType) {
  if (workspace === 'internal') return '/projects'

  // Existing external portal remains the safe destination until
  // the separate Consultant, Contractor and Vendor shells are built.
  return '/external-project'
}
