import { Search, X } from 'lucide-react'
import type { RefObject } from 'react'

export default function SearchInput({ value, onChange, inputRef }: { value: string; onChange: (value: string) => void; inputRef: RefObject<HTMLInputElement> }) {
  return (
    <div className="flex items-center gap-3 border-b border-[#dce6eb] px-5 py-4">
      <Search size={20} className="text-[#607682]" />
      <input
        ref={inputRef}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="Search projects, activities, RFIs, documents…"
        className="min-w-0 flex-1 bg-transparent text-base font-medium text-[#173f5f] outline-none placeholder:text-[#9aabb3]"
        aria-label="Search workspace"
        autoComplete="off"
      />
      {value ? (
        <button type="button" onClick={() => onChange('')} className="rounded-lg p-1 text-[#718690] hover:bg-[#edf3f6]" aria-label="Clear search">
          <X size={16} />
        </button>
      ) : null}
    </div>
  )
}
