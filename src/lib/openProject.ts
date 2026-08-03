
import type { NavigateFunction } from 'react-router-dom'
import { useProjectStore } from '@/store/project'

export type ProjectNavigationTarget = {
  id: string | number
  project_name?: string | null
  name?: string | null
  organization_id?: string | number | null
  organizationId?: string | number | null
  portfolio_id?: string | number | null
  portfolioId?: string | number | null
  overall_owner_email?: string | null
  projectOwnerEmail?: string | null
  housebuild_owner_email?: string | null
  housebuildOwnerEmail?: string | null
  mep_owner_email?: string | null
  mepOwnerEmail?: string | null
  infrastructure_owner_email?: string | null
  infrastructureOwnerEmail?: string | null
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function openProject(
  navigate: NavigateFunction,
  project: ProjectNavigationTarget,
  destination = '/app',
) {
  const projectId = Number(project.id)
  const projectName = String(project.project_name || project.name || 'Selected Project')

  if (!Number.isFinite(projectId)) {
    throw new Error('A valid project ID is required to open the project dashboard.')
  }

  useProjectStore.getState().setProject(
    projectId,
    projectName,
    optionalNumber(project.organization_id ?? project.organizationId),
    optionalNumber(project.portfolio_id ?? project.portfolioId),
    project.overall_owner_email ?? project.projectOwnerEmail ?? null,
    project.housebuild_owner_email ?? project.housebuildOwnerEmail ?? null,
    project.mep_owner_email ?? project.mepOwnerEmail ?? null,
    project.infrastructure_owner_email ?? project.infrastructureOwnerEmail ?? null,
  )

  navigate(destination)
}
