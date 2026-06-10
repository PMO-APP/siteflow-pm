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

export function canManagePortfolio(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'portfolio_manager',
  ].includes(role || '')
}

export function canEditProject(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'portfolio_manager',
    'project_manager',
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

export function canViewFinancials(role?: string | null) {
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
