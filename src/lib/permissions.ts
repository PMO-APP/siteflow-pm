export function isProjectOwner(
  userEmail?: string,
  projectOwnerEmail?: string | null
) {
  if (!userEmail || !projectOwnerEmail) {
    return false
  }

  return (
    userEmail.toLowerCase().trim() ===
    projectOwnerEmail.toLowerCase().trim()
  )
}

export function canEditPage(
  role: string,
  page: string,
  userEmail?: string,
  projectOwnerEmail?: string | null
) {
  const owner = isProjectOwner(userEmail, projectOwnerEmail)

  if (role === 'admin' || owner) {
    return true
  }

  if (role === 'design') {
    return ['documents', 'snags', 'risk'].includes(page)
  }

  if (role === 'costing') {
    return ['financial', 'snags', 'risk'].includes(page)
  }

  return false
}

export function canDelete(
  role: string,
  userEmail?: string,
  projectOwnerEmail?: string | null
) {
  const owner = isProjectOwner(userEmail, projectOwnerEmail)

  return role === 'admin' || owner
}

export function canAssignProjectOwner(role: string) {
  return role === 'admin'
}
