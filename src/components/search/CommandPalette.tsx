import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  FileText,
  FolderOpen,
  HardHat,
  LayoutDashboard,
  Loader2,
  MessageSquareText,
  Search,
  Shield,
  ShoppingCart,
  Star,
  Wallet,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { useProjectStore } from '@/store/project'
import type { SearchResult as SearchResultModel } from '@/services/search'
import SearchInput from './SearchInput'
import SearchCategory from './SearchCategory'
import SearchResult from './SearchResult'

const RECENT_SEARCH_KEY = 'pmocorex_recent_searches'
const RECENT_PROJECT_KEY = 'pmocorex_recent_projects'
const FAVORITES_KEY = 'pmocorex_command_favorites'

type NavigationCommand = {
  id: string
  title: string
  subtitle: string
  url: string
  icon: typeof Search
}

type RecentProject = {
  id: number
  name: string
  organizationId: number | null
  portfolioId: number | null
}

type PaletteItem =
  | { kind: 'command'; key: string; command: NavigationCommand }
  | { kind: 'project'; key: string; project: RecentProject }
  | { kind: 'result'; key: string; result: SearchResultModel }

const NAVIGATION_COMMANDS: NavigationCommand[] = [
  { id: 'dashboard', title: 'Open Dashboard', subtitle: 'Project command centre', url: '/app', icon: LayoutDashboard },
  { id: 'schedule', title: 'Open Schedule', subtitle: 'Activities, milestones and Gantt', url: '/app/schedule', icon: CalendarDays },
  { id: 'recovery', title: 'Open Recovery Forecast', subtitle: 'Critical delays and recovery actions', url: '/app/recovery', icon: BarChart3 },
  { id: 'planner', title: 'Open Planner', subtitle: 'Weekly operational planning', url: '/app/planner', icon: CalendarCheck },
  { id: 'procurement', title: 'Open Procurement', subtitle: 'Materials, vendors and deliveries', url: '/app/procurement', icon: ShoppingCart },
  { id: 'approvals', title: 'Open Approvals', subtitle: 'Submissions and decision status', url: '/app/approvals', icon: CheckSquare },
  { id: 'site', title: 'Open Site Progress', subtitle: 'Daily production and field updates', url: '/app/site', icon: HardHat },
  { id: 'quality', title: 'Open Quality Gates', subtitle: 'Inspections and hold points', url: '/app/quality', icon: ClipboardCheck },
  { id: 'rfis', title: 'Open RFIs', subtitle: 'Technical clarifications', url: '/app/rfis', icon: MessageSquareText },
  { id: 'documents', title: 'Open Documents', subtitle: 'Drawings, registers and files', url: '/app/documents', icon: FolderOpen },
  { id: 'risk', title: 'Open Risk Register', subtitle: 'Exposure and mitigations', url: '/app/risk', icon: Shield },
  { id: 'costing', title: 'Open Costing', subtitle: 'Commercial and cost controls', url: '/app/costing', icon: Wallet },
  { id: 'reports', title: 'Open Executive Reports', subtitle: 'IPD and management reporting', url: '/app/reports', icon: FileText },
]

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function commandMatches(command: NavigationCommand, query: string) {
  const haystack = `${command.title} ${command.subtitle}`.toLowerCase()
  return haystack.includes(query.toLowerCase())
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readJson(RECENT_SEARCH_KEY, []).slice(0, 5))
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => readJson(RECENT_PROJECT_KEY, []).slice(0, 5))
  const [favorites, setFavorites] = useState<string[]>(() => readJson(FAVORITES_KEY, []))
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const project = useProjectStore()
  const search = useGlobalSearch(query, { projectId: project.projectId, projectName: project.projectName })
  const results = search.data?.results || []
  const groups = search.data?.groups || {}
  const normalizedQuery = query.trim()

  const matchingCommands = useMemo(() => {
    const source = normalizedQuery
      ? NAVIGATION_COMMANDS.filter(command => commandMatches(command, normalizedQuery))
      : NAVIGATION_COMMANDS.filter(command => favorites.includes(`command:${command.id}`)).slice(0, 5)
    return source.filter(command => command.url !== location.pathname)
  }, [favorites, location.pathname, normalizedQuery])

  const visibleRecentProjects = useMemo(() => {
    if (normalizedQuery) return []
    return recentProjects.filter(item => item.id !== project.projectId).slice(0, 5)
  }, [normalizedQuery, project.projectId, recentProjects])

  const paletteItems = useMemo<PaletteItem[]>(() => [
    ...matchingCommands.map(command => ({ kind: 'command' as const, key: `command:${command.id}`, command })),
    ...visibleRecentProjects.map(item => ({ kind: 'project' as const, key: `project:${item.id}`, project: item })),
    ...results.map(result => ({ kind: 'result' as const, key: `result:${result.type}:${result.id}`, result })),
  ], [matchingCommands, results, visibleRecentProjects])

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setActiveIndex(0)
    window.setTimeout(() => inputRef.current?.focus(), 20)
    return () => previousFocus.current?.focus()
  }, [open])

  useEffect(() => setActiveIndex(0), [query])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  function rememberSearch(value: string) {
    const term = value.trim()
    if (!term) return
    const next = [term, ...recentSearches.filter(item => item.toLowerCase() !== term.toLowerCase())].slice(0, 5)
    setRecentSearches(next)
    localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next))
  }

  function rememberProject(item: RecentProject) {
    const next = [item, ...recentProjects.filter(projectItem => projectItem.id !== item.id)].slice(0, 5)
    setRecentProjects(next)
    localStorage.setItem(RECENT_PROJECT_KEY, JSON.stringify(next))
  }

  function toggleFavorite(key: string) {
    const next = favorites.includes(key) ? favorites.filter(item => item !== key) : [key, ...favorites].slice(0, 12)
    setFavorites(next)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  }

  function openProject(item: RecentProject) {
    project.setProject(item.id, item.name, item.organizationId, item.portfolioId)
    rememberProject(item)
    onClose()
    navigate('/app')
  }

  function selectResult(result: SearchResultModel) {
    rememberSearch(query)
    if (result.projectId && result.projectName) {
      const item = {
        id: result.projectId,
        name: result.projectName,
        organizationId: Number(result.metadata?.organizationId) || null,
        portfolioId: Number(result.metadata?.portfolioId) || null,
      }
      project.setProject(item.id, item.name, item.organizationId, item.portfolioId)
      rememberProject(item)
    }
    onClose()
    navigate(result.url)
  }

  function selectItem(item: PaletteItem) {
    if (item.kind === 'command') {
      onClose()
      navigate(item.command.url)
      return
    }
    if (item.kind === 'project') {
      openProject(item.project)
      return
    }
    selectResult(item.result)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key === 'Tab') {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
      return
    }

    if (!paletteItems.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(index => (index + 1) % paletteItems.length)
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => (index - 1 + paletteItems.length) % paletteItems.length)
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      selectItem(paletteItems[activeIndex])
    }
  }

  if (!open) return null

  let runningIndex = matchingCommands.length + visibleRecentProjects.length

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#102c43]/55 px-3 pt-[7vh] backdrop-blur-sm sm:px-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div ref={dialogRef} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/40 bg-white shadow-[0_30px_90px_rgba(13,43,64,.28)]" role="dialog" aria-modal="true" aria-label="PMOCorex command palette" onKeyDown={onKeyDown}>
        <SearchInput value={query} onChange={setQuery} inputRef={inputRef} />

        <div className="max-h-[66vh] overflow-y-auto p-3">
          {matchingCommands.length ? (
            <SearchCategory label={normalizedQuery ? 'Navigation' : 'Favorites'} count={matchingCommands.length}>
              {matchingCommands.map((command, index) => {
                const Icon = command.icon
                const key = `command:${command.id}`
                return (
                  <div key={command.id} className={`group flex items-center rounded-xl ${paletteItems[activeIndex]?.key === key ? 'bg-[#edf4f7]' : 'hover:bg-[#f5f8fa]'}`}>
                    <button type="button" onClick={() => selectItem({ kind: 'command', key, command })} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left">
                      <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-[#dce6eb] bg-white text-[#426477]"><Icon size={17} /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#173f5f]">{command.title}</span><span className="block truncate text-xs text-[#758892]">{command.subtitle}</span></span>
                    </button>
                    <button type="button" onClick={() => toggleFavorite(key)} className="mr-2 rounded-lg p-2 text-[#8da0aa] opacity-60 transition hover:bg-white hover:text-[#ef8354] group-hover:opacity-100" aria-label={favorites.includes(key) ? `Remove ${command.title} from favorites` : `Add ${command.title} to favorites`}>
                      <Star size={15} fill={favorites.includes(key) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                )
              })}
            </SearchCategory>
          ) : null}

          {visibleRecentProjects.length ? (
            <SearchCategory label="Recent projects" count={visibleRecentProjects.length}>
              {visibleRecentProjects.map((item, index) => {
                const itemIndex = matchingCommands.length + index
                return (
                  <button key={item.id} type="button" onClick={() => openProject(item)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${activeIndex === itemIndex ? 'bg-[#edf4f7]' : 'hover:bg-[#f5f8fa]'}`}>
                    <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#dce6eb] bg-white text-[#426477]"><FolderOpen size={17} /></span>
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#173f5f]">{item.name}</span><span className="block text-xs text-[#758892]">Return to project dashboard</span></span>
                  </button>
                )
              })}
            </SearchCategory>
          ) : null}

          {normalizedQuery.length < 2 ? (
            <div className="px-3 py-6">
              {!matchingCommands.length && !visibleRecentProjects.length ? (
                <div className="mb-5 rounded-xl border border-[#dfe8ec] bg-[#f8fafb] px-4 py-3 text-sm leading-6 text-[#6f838e]">
                  Search across the workspace or type a page name such as <strong className="text-[#173f5f]">Schedule</strong>, <strong className="text-[#173f5f]">Risk</strong> or <strong className="text-[#173f5f]">Reports</strong>.
                </div>
              ) : null}
              {recentSearches.length ? (
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a9ca5]">Recent searches</div>
                  <div className="flex flex-wrap gap-2">{recentSearches.map(item => <button key={item} type="button" onClick={() => setQuery(item)} className="rounded-full border border-[#dce6eb] bg-[#f7fafb] px-3 py-1.5 text-xs font-semibold text-[#45616f] hover:border-[#b9cad3]">{item}</button>)}</div>
                </div>
              ) : null}
            </div>
          ) : search.isFetching ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-[#667d89]"><Loader2 size={18} className="animate-spin" /> Searching workspace…</div>
          ) : results.length ? (
            Object.entries(groups).map(([category, categoryResults]) => {
              const startIndex = runningIndex
              runningIndex += categoryResults?.length || 0
              return (
                <SearchCategory key={category} label={category} count={categoryResults?.length || 0}>
                  {(categoryResults || []).map((result, resultIndex) => (
                    <SearchResult key={`${result.type}:${result.id}`} result={result} active={activeIndex === startIndex + resultIndex} onSelect={() => selectResult(result)} />
                  ))}
                </SearchCategory>
              )
            })
          ) : (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#edf3f6] text-[#5e7480]"><Search size={19} /></div>
              <div className="font-semibold text-[#173f5f]">No matching records or commands</div>
              <p className="mt-1 text-sm text-[#7b8e98]">Try a project name, page, activity, document number or RFI reference.</p>
            </div>
          )}

          {search.data?.errors.length ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> Some modules could not be searched. Available results are still shown.</div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e2eaee] bg-[#f8fafb] px-4 py-2 text-[10px] font-semibold text-[#82949d]">
          <span>Search is limited to records you are permitted to view.</span>
          <span>↑↓ Navigate · Enter Open · Esc Close · Ctrl/⌘ K</span>
        </div>
      </div>
    </div>
  )
}
