export type OfflineMutation = {
  id: string
  createdAt: string
  type: string
  projectId?: number | null
  payload: Record<string, unknown>
  retryCount: number
}

const KEY = 'pmocorex-offline-queue-v1'
const read = (): OfflineMutation[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
const write = (items: OfflineMutation[]) => localStorage.setItem(KEY, JSON.stringify(items))

export function getOfflineQueue() { return read() }
export function enqueueOfflineMutation(input: Omit<OfflineMutation, 'id' | 'createdAt' | 'retryCount'>) {
  const item: OfflineMutation = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), retryCount: 0 }
  write([...read(), item])
  window.dispatchEvent(new CustomEvent('pmocorex:offline-queue-changed'))
  return item
}
export function removeOfflineMutation(id: string) {
  write(read().filter(item => item.id !== id))
  window.dispatchEvent(new CustomEvent('pmocorex:offline-queue-changed'))
}
export function markOfflineMutationFailed(id: string) {
  write(read().map(item => item.id === id ? { ...item, retryCount: item.retryCount + 1 } : item))
}
