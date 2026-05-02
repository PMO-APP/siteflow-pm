export function canEditPage(
  role: string,
  page: string
) {
  if (
    role === 'admin' ||
    role === 'project'
  ) {
    return true
  }

  if (role === 'design') {
    return [
      'documents',
      'snags',
      'risk',
    ].includes(page)
  }

  if (role === 'costing') {
    return [
      'financial',
      'snags',
      'risk',
    ].includes(page)
  }

  return false
}

export function canDelete(
  role: string
) {
  return (
    role === 'admin' ||
    role === 'project'
  )
}
