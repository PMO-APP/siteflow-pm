type RecordId = string | number

type WorkspaceLink = {
  workspace_id?: string | null
  organization_id?: RecordId | null
}

type Organization = { id: RecordId; workspace_id?: string | null }
type Portfolio = WorkspaceLink & { id: RecordId }

export function workspaceOrganizations<T extends Organization>(
  workspaceId: string | null,
  organizations: T[],
  links: WorkspaceLink[],
): T[] {
  if (!workspaceId) return []
  const linkedOrganizations = new Set(links
    .filter(link => link.workspace_id === workspaceId && link.organization_id != null)
    .map(link => String(link.organization_id)))

  return organizations.filter(organization => organization.workspace_id
    ? organization.workspace_id === workspaceId
    : linkedOrganizations.has(String(organization.id)))
}

export function projectCreationScope(
  workspaceId: string,
  organizationId: RecordId,
  portfolioId: RecordId | '',
  portfolios: Portfolio[],
) {
  const scope = { workspace_id: workspaceId, organization_id: organizationId }
  if (portfolioId === '') return { ...scope, portfolio_id: null }

  const portfolio = portfolios.find(item => String(item.id) === String(portfolioId))
  if (!portfolio || (portfolio.workspace_id && portfolio.workspace_id !== workspaceId) ||
      (portfolio.organization_id != null && String(portfolio.organization_id) !== String(organizationId))) {
    throw new Error('Select a portfolio in this workspace and organization.')
  }
  if (!portfolio.workspace_id) {
    throw new Error('This portfolio needs its workspace link restored before a project can be added.')
  }

  return { ...scope, portfolio_id: portfolio.id }
}
