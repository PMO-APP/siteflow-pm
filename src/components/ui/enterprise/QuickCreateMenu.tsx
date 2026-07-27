import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CalendarPlus, AlertTriangle, FileUp, CheckSquare, ShoppingCart, ClipboardCheck, Building2 } from 'lucide-react'

const actions = [
  { label: 'Schedule activity', description: 'Open schedule register', to: '/app/schedule', icon: CalendarPlus },
  { label: 'Procurement item', description: 'Create and track long-lead items', to: '/app/procurement', icon: ShoppingCart },
  { label: 'Approval request', description: 'Submit an approval workflow', to: '/app/approvals', icon: CheckSquare },
  { label: 'Risk', description: 'Record and assign a project risk', to: '/app/risk', icon: AlertTriangle },
  { label: 'Snag', description: 'Log a quality completion item', to: '/app/snags', icon: ClipboardCheck },
  { label: 'Document', description: 'Upload to the information centre', to: '/app/documents', icon: FileUp },
  { label: 'Delivery package', description: 'Configure a project work package', to: '/app/project-packages', icon: Building2 },
]

export default function QuickCreateMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div ref={ref} className="absolute right-0 top-12 z-50 w-[330px] overflow-hidden rounded-2xl border border-[#dfe3e7] bg-white shadow-xl">
      <div className="border-b border-[#e7eaed] px-4 py-3"><div className="flex items-center gap-2 text-sm font-semibold text-[#102943]"><Plus size={16} className="text-[#ff7657]"/>Create or record</div><div className="mt-1 text-xs text-[#83909a]">Choose the workspace for the new record.</div></div>
      <div className="p-2">
        {actions.map(({ label, description, to, icon: Icon }) => <button key={to} onClick={() => { navigate(to); onClose() }} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-[#f2f6f8]"><div className="rounded-xl bg-[#eaf1f7] p-2 text-[#1f668f]"><Icon size={16}/></div><div><div className="text-sm font-semibold text-[#26384a]">{label}</div><div className="mt-0.5 text-[11px] text-[#88949e]">{description}</div></div></button>)}
      </div>
    </div>
  )
}
