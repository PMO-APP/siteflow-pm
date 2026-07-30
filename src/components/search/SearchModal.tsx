import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Loader2, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { useProjectStore } from '@/store/project'
import type { SearchResult as SearchResultModel } from '@/services/search'
import SearchInput from './SearchInput'
import SearchCategory from './SearchCategory'
import SearchResult from './SearchResult'

const RECENT_KEY = 'pmocorex_recent_searches'

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 5) } catch { return [] }
}

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recent, setRecent] = useState<string[]>(readRecent)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const project = useProjectStore()
  const search = useGlobalSearch(query, { projectId: project.projectId, projectName: project.projectName })
  const results = search.data?.results || []
  const groups = search.data?.groups || {}

  const orderedGroups = useMemo(() => Object.entries(groups), [groups])

  useEffect(() => {
    if (!open) return
    setActiveIndex(0)
    window.setTimeout(() => inputRef.current?.focus(), 20)
  }, [open])

  useEffect(() => setActiveIndex(0), [query])

  function remember(value: string) {
    const term = value.trim()
    if (!term) return
    const next = [term, ...recent.filter(item => item.toLowerCase() !== term.toLowerCase())].slice(0, 5)
    setRecent(next)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  }

  function selectResult(result: SearchResultModel) {
    remember(query)
    if (result.type === 'project' && result.projectId && result.projectName) {
      project.setProject(
        result.projectId,
        result.projectName,
        Number(result.metadata?.organizationId) || null,
        Number(result.metadata?.portfolioId) || null
      )
    }
    onClose()
    navigate(result.url)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
    if (!results.length) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(index => (index + 1) % results.length) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => (index - 1 + results.length) % results.length) }
    if (event.key === 'Enter') { event.preventDefault(); selectResult(results[activeIndex]) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#102c43]/55 px-4 pt-[8vh] backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/40 bg-white shadow-[0_30px_90px_rgba(13,43,64,.28)]" role="dialog" aria-modal="true" aria-label="Search PMOCorex" onKeyDown={onKeyDown}>
        <SearchInput value={query} onChange={setQuery} inputRef={inputRef} />
        <div className="max-h-[62vh] overflow-y-auto p-3">
          {query.trim().length < 2 ? (
            <div className="px-3 py-7">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#173f5f]"><Search size={16} /> Search the current workspace</div>
              <p className="mb-5 max-w-lg text-sm leading-6 text-[#71838d]">Enter at least two characters. Results are grouped across projects, schedule activities, procurement, approvals, risks, RFIs, snags and documents.</p>
              {recent.length ? (
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a9ca5]">Recent searches</div>
                  <div className="flex flex-wrap gap-2">{recent.map(item => <button key={item} type="button" onClick={() => setQuery(item)} className="rounded-full border border-[#dce6eb] bg-[#f7fafb] px-3 py-1.5 text-xs font-semibold text-[#45616f] hover:border-[#b9cad3]">{item}</button>)}</div>
                </div>
              ) : null}
            </div>
          ) : search.isFetching ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-[#667d89]"><Loader2 size={18} className="animate-spin" /> Searching workspace…</div>
          ) : results.length ? (
            orderedGroups.map(([category, categoryResults]) => (
              <SearchCategory key={category} label={category} count={categoryResults?.length || 0}>
                {(categoryResults || []).map(result => (
                  <SearchResult key={`${result.type}:${result.id}`} result={result} active={results[activeIndex]?.id === result.id && results[activeIndex]?.type === result.type} onSelect={() => selectResult(result)} />
                ))}
              </SearchCategory>
            ))
          ) : (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#edf3f6] text-[#5e7480]"><Search size={19} /></div>
              <div className="font-semibold text-[#173f5f]">No matching records</div>
              <p className="mt-1 text-sm text-[#7b8e98]">Try a project name, activity, document number, RFI reference or contractor.</p>
            </div>
          )}
          {search.data?.errors.length ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> Some modules could not be searched. Available results are still shown.</div>
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-[#e2eaee] bg-[#f8fafb] px-4 py-2 text-[10px] font-semibold text-[#82949d]">
          <span>Search is limited to records you are permitted to view.</span>
          <span>↑↓ Navigate · Enter Open · Esc Close</span>
        </div>
      </div>
    </div>
  )
}
