const DEFAULT_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/xml', 'text/xml',
  'image/jpeg', 'image/png', 'image/webp',
])

export function validateUpload(file: File, options?: { maxMb?: number; allowedTypes?: string[] }) {
  const maxMb = options?.maxMb ?? 25
  const allowed = new Set(options?.allowedTypes ?? [...DEFAULT_TYPES])
  const errors: string[] = []
  if (!allowed.has(file.type)) errors.push(`Unsupported file type: ${file.type || 'unknown'}`)
  if (file.size > maxMb * 1024 * 1024) errors.push(`File exceeds ${maxMb} MB limit`)
  if (/\.(exe|cmd|bat|sh|js|html?)$/i.test(file.name)) errors.push('Executable files are not permitted')
  return { valid: errors.length === 0, errors }
}
