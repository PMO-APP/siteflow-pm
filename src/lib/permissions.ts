import { useMembershipStore } from '@/store/membership'

export function canManageWorkspace(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
  ].includes(role || '')
}

export function canManageUsers(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
  ].includes(role || '')
}
export function canEditProcurement(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'costing',
  ].includes(role || '')
}
export function canManagePortfolio(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'portfolio_manager',
  ].includes(role || '')
}

export function canEditProjectInfo(
  role?: string | null,
  userEmail?: string | null,
  projectOwnerEmail?: string | null
) {
  if (
    ['workspace_admin', 'admin', 'pmo'].includes(role || '')
  ) {
    return true
  }

  if (
    role === 'project_owner' &&
    userEmail &&
    projectOwnerEmail &&
    userEmail.toLowerCase() === projectOwnerEmail.toLowerCase()
  ) {
    return true
  }

  return false
}

export function canEditHousebuild(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'housebuild',
  ].includes(role || '')
}

export function canEditDesign(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'design',
  ].includes(role || '')
}

export function canEditInfrastructure(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'infrastructure',
  ].includes(role || '')
}

export function canEditCosting(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'costing',
  ].includes(role || '')
}

export function canApprove(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_manager',
  ].includes(role || '')
}

export function canManageFinancials(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'costing',
    'portfolio_manager',
  ].includes(role || '')
}

export function isReadOnly(role?: string | null) {
  return role === 'guest'
}
