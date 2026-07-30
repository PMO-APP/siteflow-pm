import { ArrowUpRight } from 'lucide-react'
import type { SearchResult as SearchResultModel } from '@/services/search'

export default function SearchResult({
  result,
  active,
  onSelect,
}: {
  result: SearchResultModel
  active: boolean
  onSelect: () => void
}) {
  const Icon = result.icon
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        active ? 'bg-[#173f5f] text-white' : 'hover:bg-[#f2f6f8] text-[#173f5f]'
      }`}
    >
      <span className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg ${active ? 'bg-white/10' : 'bg-[#edf3f6]'}`}>
        {Icon ? <Icon size={16} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{result.title}</span>
        {result.subtitle ? (
          <span className={`mt-0.5 block truncate text-xs ${active ? 'text-white/65' : 'text-[#6f828d]'}`}>
            {result.subtitle}
          </span>
        ) : null}
      </span>
      <ArrowUpRight size={14} className={active ? 'text-white/60' : 'text-[#8ba0ab]'} />
    </button>
  )
}
