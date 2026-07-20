import type { RFIStatus } from '../types'
const cls:Record<RFIStatus,string>={Draft:'bg-slate-500/15 text-slate-300',Submitted:'bg-blue-500/15 text-blue-300','Under Review':'bg-amber-500/15 text-amber-300',Answered:'bg-emerald-500/15 text-emerald-300',Closed:'bg-white/10 text-slate-400',Rejected:'bg-red-500/15 text-red-300'}
export default function RFIStatusBadge({status}:{status:RFIStatus}){return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls[status]}`}>{status}</span>}
