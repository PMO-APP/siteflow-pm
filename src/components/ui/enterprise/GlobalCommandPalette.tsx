import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, ArrowRight, Command } from 'lucide-react'

export type CommandItem = {
  label: string
  description?: string
  to: string
  group: string
  keywords?: string[]
}

export default function GlobalCommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean
  onClose: () => void
  items: CommandItem[]
}) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items
    return items.filter(item =>
      [item.label, item.description, item.group, ...(item.keywords || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [items, query])

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
      ;(acc[item.group] ||= []).push(item)
      return acc
    }, {})
  }, [filtered])

  if (!open) return null

  const select = (item: CommandItem) => {
    navigate(item.to)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[120] flex justify-center bg-[#102943]/45 px-4 pt-[8vh] backdrop-blur-sm" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="h-fit w-full max-w-2xl overflow-hidden rounded-[24px] border border-[#dfe3e7] bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[#e7eaed] px-5 py-4">
          <Search size={18} className="text-[#ff7657]" />
          <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search pages, controls and reports…" className="min-w-0 flex-1 bg-transparent text-sm text-[#243547] outline-none placeholder:text-[#9aa4ad]" />
          <span className="hidden items-center gap-1 rounded-lg border border-[#dfe3e7] px-2 py-1 text-[10px] font-semibold text-[#7a8792] sm:flex"><Command size={11}/>K</span>
          <button onClick={onClose} className="rounded-lg p-2 text-[#73808c] hover:bg-[#f2f5f7]"><X size={17}/></button>
        </div>
        <div className="max-h-[62vh] overflow-y-auto p-3">
          {Object.entries(grouped).map(([group, groupItems]) => (
            <div key={group} className="mb-4 last:mb-0">
              <div className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a96a0]">{group}</div>
              <div className="space-y-1">
                {groupItems.map(item => (
                  <button key={item.to} onClick={() => select(item)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#f2f6f8]">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#102943]">{item.label}</div>
                      {item.description && <div className="mt-0.5 truncate text-xs text-[#7b8791]">{item.description}</div>}
                    </div>
                    <ArrowRight size={15} className="text-[#a0aab2] transition group-hover:translate-x-0.5 group-hover:text-[#123a60]" />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!filtered.length && <div className="px-6 py-14 text-center"><div className="text-sm font-semibold text-[#243547]">No matching destination</div><div className="mt-1 text-xs text-[#89949d]">Try a page name such as schedule, risk, procurement or reports.</div></div>}
        </div>
      </div>
    </div>
  )
}
