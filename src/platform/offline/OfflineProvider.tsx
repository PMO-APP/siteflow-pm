import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getOfflineQueue, markOfflineMutationFailed, removeOfflineMutation, type OfflineMutation } from './offlineQueue'

export type OfflineExecutor = (mutation: OfflineMutation) => Promise<void>
const OfflineContext = createContext({ online: true, pending: 0, syncing: false, lastSync: null as string | null, sync: async () => {} })

export function OfflineProvider({ children, executor }: { children: React.ReactNode; executor?: OfflineExecutor }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(getOfflineQueue().length)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('pmocorex-last-sync'))

  const refresh = useCallback(() => setPending(getOfflineQueue().length), [])
  const sync = useCallback(async () => {
    if (!navigator.onLine || !executor || syncing) return
    setSyncing(true)
    for (const item of getOfflineQueue()) {
      try { await executor(item); removeOfflineMutation(item.id) }
      catch { markOfflineMutationFailed(item.id) }
    }
    const stamp = new Date().toISOString(); localStorage.setItem('pmocorex-last-sync', stamp); setLastSync(stamp)
    refresh(); setSyncing(false)
  }, [executor, refresh, syncing])

  useEffect(() => {
    const onOnline = () => { setOnline(true); void sync() }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline)
    window.addEventListener('focus', sync); window.addEventListener('pmocorex:offline-queue-changed', refresh)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); window.removeEventListener('focus', sync); window.removeEventListener('pmocorex:offline-queue-changed', refresh) }
  }, [refresh, sync])

  const value = useMemo(() => ({ online, pending, syncing, lastSync, sync }), [online, pending, syncing, lastSync, sync])
  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
}
export const useOfflineStatus = () => useContext(OfflineContext)
