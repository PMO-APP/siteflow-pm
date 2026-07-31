import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { useOfflineStatus } from '@/platform/offline/OfflineProvider'

export default function ConnectivityIndicator() {
  const { online, pending, syncing, sync } = useOfflineStatus()
  return (
    <button type="button" onClick={() => void sync()} className="fixed bottom-4 right-4 z-[80] flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg" title="Synchronization status">
      {syncing ? <RefreshCw size={14} className="animate-spin" /> : online ? <Cloud size={14} /> : <CloudOff size={14} />}
      {online ? (pending ? `${pending} pending` : 'Synced') : `Offline${pending ? ` · ${pending} queued` : ''}`}
    </button>
  )
}
