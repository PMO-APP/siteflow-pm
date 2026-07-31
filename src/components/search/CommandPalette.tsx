import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  FilePlus2,
  FileText,
  FolderOpen,
  HardHat,
  LayoutDashboard,
  Loader2,
  MessageSquarePlus,
  MessageSquareText,
  PlusCircle,
  Search,
  Shield,
  ShoppingCart,
  Star,
  Upload,
  UserRoundPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import {
  canApprove,
  canCreateInternalContribution,
  canCreateSnags,
  canEditProcurement,
  canEditRisk,
  canUploadDocuments,
} from '@/lib/permissions'
import type { SearchResult as SearchResultModel } from '@/services/search'
import SearchInput from './SearchInput'
import SearchCategory from './SearchCategory'
import SearchResult from './SearchResult'

const RECENT_SEARCH_KEY = 'pmocorex_recent_searches'
const RECENT_PROJECT_KEY = 'pmocorex_recent_projects'
const FAVORITES_KEY = 'pmocorex_command_favorites'
const RECENT_COMMAND_KEY = 'pmocorex_recent_commands'
const COMMAND_USAGE_KEY = 'pmocorex_command_usage'

type NavigationCommand = {
  id: string
  title: string
  subtitle: string
  url: string
  icon: typeof Search
}

type QuickAction = {
  id: string
  title: string
  subtitle: string
  url: string
  icon: typeof Search
  permitted: (role: string | null) => boolean
  requiresProject?: boolean
}

type RecentProject = {
  id: number
  name: string
  organizationId: number | null
  portfolioId: number | null
}

type PaletteItem =
  | { kind: 'command'; key: string; command: NavigationCommand }
  | { kind: 'action'; key: string; action: QuickAction }
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
  { id: 'assignments', title: 'Open Internal Assignments', subtitle: 'Team actions and follow-ups', url: '/app/internal-assignments', icon: ClipboardList },
  { id: 'team', title: 'Open Team & Access', subtitle: 'People, roles and project access', url: '/app/team-access', icon: Users },
  { id: 'reports', title: 'Open Executive Reports', subtitle: 'IPD and management reporting', url: '/app/reports', icon: FileText },
]

const TASK_ASSIGNER_ROLES = [
  'workspace_admin', 'admin', 'pmo', 'portfolio_manager', 'project_owner',
  'overall_project_owner', 'housebuild_project_owner', 'mep_project_owner',
  'infrastructure_project_owner', 'hse_manager', 'hse_lead', 'design',
  'housebuild', 'infrastructure', 'mep', 'costing',
]

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'create-rfi', title: 'Create RFI', subtitle: 'Open a technical clarification for the selected project', url: '/app/rfis/new', icon: MessageSquarePlus, permitted: canCreateInternalContribution, requiresProject: true },
  { id: 'create-risk', title: 'Add Risk', subtitle: 'Record a new project risk and mitigation', url: '/app/risk?action=new', icon: AlertTriangle, permitted: role => canEditRisk(role), requiresProject: true },
  { id: 'create-snag', title: 'Create Snag', subtitle: 'Record a defect or completion issue', url: '/app/snags?action=new', icon: PlusCircle, permitted: canCreateSnags, requiresProject: true },
  { id: 'create-procurement', title: 'Add Procurement Item', subtitle: 'Create a material, vendor or delivery requirement', url: '/app/procurement?action=new', icon: ShoppingCart, permitted: role => canEditProcurement(role), requiresProject: true },
  { id: 'create-approval', title: 'Submit Approval', subtitle: 'Create a technical or material approval request', url: '/app/approvals?action=new', icon: FilePlus2, permitted: role => canApprove(role), requiresProject: true },
  { id: 'create-site-report', title: 'Add Site Progress', subtitle: 'Create today’s site progress report', url: '/app/site?action=new', icon: HardHat, permitted: canCreateInternalContribution, requiresProject: true },
  { id: 'upload-document', title: 'Upload Document', subtitle: 'Add a drawing, report or controlled document', url: '/app/documents?action=new', icon: Upload, permitted: canUploadDocuments, requiresProject: true },
  { id: 'create-assignment', title: 'Create Internal Assignment', subtitle: 'Assign a tracked action to an internal team member', url: '/app/internal-assignments?action=new', icon: UserRoundPlus, permitted: role => TASK_ASSIGNER_ROLES.includes(role || ''), requiresProject: true },
]

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function textMatches(title: string, subtitle: string, query: string) {
  return `${title} ${subtitle}`.toLowerCase().includes(query.toLowerCase())
}

function stripMode(value: string) {
  const trimmed = value.trimStart()
  const prefix = ['>', '@', '#'].includes(trimmed[0]) ? trimmed[0] : ''
  return { prefix, query: prefix ? trimmed.slice(1).trimStart() : value.trim() }
}

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [projectPrompt, setProjectPrompt] = useState<QuickAction | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readJson(RECENT_SEARCH_KEY, []).slice(0, 5))
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => readJson(RECENT_PROJECT_KEY, []).slice(0, 5))
  const [favorites, setFavorites] = useState<string[]>(() => readJson(FAVORITES_KEY, []))
  const [recentCommands, setRecentCommands] = useState<string[]>(() => readJson(RECENT_COMMAND_KEY, []).slice(0, 8))
  const [usage, setUsage] = useState<Record<string, number>>(() => readJson(COMMAND_USAGE_KEY, {}))
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const project = useProjectStore()
  const role = useMembershipStore(state => state.role)
  const mode = stripMode(query)
  const searchEnabled = mode.prefix !== '>' && mode.prefix !== '@'
  const search = useGlobalSearch(searchEnabled ? mode.query : '', { projectId: project.projectId, projectName: project.projectName })
  const results = search.data?.results || []
  const groups = search.data?.groups || {}
  const normalizedQuery = mode.query.trim()

  const permittedActions = useMemo(() => QUICK_ACTIONS.filter(action => action.permitted(role)), [role])

  const matchingActions = useMemo(() => {
    if (mode.prefix === '#' || mode.prefix === '@') return []
    const source = normalizedQuery
      ? permittedActions.filter(action => textMatches(action.title, action.subtitle, normalizedQuery))
      : permittedActions
          .filter(action => favorites.includes(`action:${action.id}`) || recentCommands.includes(`action:${action.id}`))
          .sort((a, b) => (usage[`action:${b.id}`] || 0) - (usage[`action:${a.id}`] || 0))
          .slice(0, 6)
    return source
  }, [favorites, mode.prefix, normalizedQuery, permittedActions, recentCommands, usage])

  const matchingCommands = useMemo(() => {
    if (mode.prefix === '#') return []
    let commands = NAVIGATION_COMMANDS
    if (mode.prefix === '@') commands = commands.filter(command => command.id === 'team' || command.id === 'assignments')
    const source = normalizedQuery
      ? commands.filter(command => textMatches(command.title, command.subtitle, normalizedQuery))
      : commands
          .filter(command => favorites.includes(`command:${command.id}`) || recentCommands.includes(`command:${command.id}`))
          .sort((a, b) => (usage[`command:${b.id}`] || 0) - (usage[`command:${a.id}`] || 0))
          .slice(0, 6)
    return source.filter(command => command.url.split('?')[0] !== location.pathname)
  }, [favorites, location.pathname, mode.prefix, normalizedQuery, recentCommands, usage])

  const visibleRecentProjects = useMemo(() => {
    if (normalizedQuery || mode.prefix) return []
    return recentProjects.filter(item => item.id !== project.projectId).slice(0, 5)
  }, [mode.prefix, normalizedQuery, project.projectId, recentProjects])

  const paletteItems = useMemo<PaletteItem[]>(() => [
    ...matchingActions.map(action => ({ kind: 'action' as const, key: `action:${action.id}`, action })),
    ...matchingCommands.map(command => ({ kind: 'command' as const, key: `command:${command.id}`, command })),
    ...visibleRecentProjects.map(item => ({ kind: 'project' as const, key: `project:${item.id}`, project: item })),
    ...results.map(result => ({ kind: 'result' as const, key: `result:${result.type}:${result.id}`, result })),
  ], [matchingActions, matchingCommands, results, visibleRecentProjects])

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setActiveIndex(0)
    setProjectPrompt(null)
    window.setTimeout(() => inputRef.current?.focus(), 20)
    return () => previousFocus.current?.focus()
  }, [open])

  useEffect(() => setActiveIndex(0), [query])
  useEffect(() => { if (!open) setQuery('') }, [open])

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

  function rememberCommand(key: string) {
    const nextRecent = [key, ...recentCommands.filter(item => item !== key)].slice(0, 8)
    const nextUsage = { ...usage, [key]: (usage[key] || 0) + 1 }
    setRecentCommands(nextRecent)
    setUsage(nextUsage)
    localStorage.setItem(RECENT_COMMAND_KEY, JSON.stringify(nextRecent))
    localStorage.setItem(COMMAND_USAGE_KEY, JSON.stringify(nextUsage))
  }

  function clearHistory() {
    setRecentSearches([])
    setRecentCommands([])
    setUsage({})
    localStorage.removeItem(RECENT_SEARCH_KEY)
    localStorage.removeItem(RECENT_COMMAND_KEY)
    localStorage.removeItem(COMMAND_USAGE_KEY)
  }

  function toggleFavorite(key: string) {
    const next = favorites.includes(key) ? favorites.filter(item => item !== key) : [key, ...favorites].slice(0, 16)
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
    rememberSearch(mode.query)
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

  function runAction(action: QuickAction) {
    if (action.requiresProject && !project.projectId) {
      setProjectPrompt(action)
      return
    }
    rememberCommand(`action:${action.id}`)
    onClose()
    navigate(action.url)
  }

  function selectItem(item: PaletteItem) {
    if (item.kind === 'action') return runAction(item.action)
    if (item.kind === 'command') {
      rememberCommand(item.key)
      onClose()
      navigate(item.command.url)
      return
    }
    if (item.kind === 'project') return openProject(item.project)
    selectResult(item.result)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (projectPrompt) setProjectPrompt(null)
      else onClose()
      return
    }

    if (event.key === 'Tab') {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      return
    }

    if (!paletteItems.length || projectPrompt) return
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex(index => (index + 1) % paletteItems.length) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => (index - 1 + paletteItems.length) % paletteItems.length) }
    if (event.key === 'Enter') { event.preventDefault(); selectItem(paletteItems[activeIndex]) }
  }

  if (!open) return null

  let runningIndex = matchingActions.length + matchingCommands.length + visibleRecentProjects.length

  const renderCommandRow = (item: NavigationCommand | QuickAction, key: string, kind: 'command' | 'action', index: number) => {
    const Icon = item.icon
    return (
      <div key={key} className={`group flex items-center rounded-xl ${paletteItems[activeIndex]?.key === key ? 'bg-[#edf4f7]' : 'hover:bg-[#f5f8fa]'}`}>
        <button type="button" onClick={() => kind === 'action' ? runAction(item as QuickAction) : selectItem({ kind: 'command', key, command: item as NavigationCommand })} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left">
          <span className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border ${kind === 'action' ? 'border-[#f1d2c6] bg-[#fff7f3] text-[#df6547]' : 'border-[#dce6eb] bg-white text-[#426477]'}`}><Icon size={17} /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#173f5f]">{item.title}</span><span className="block truncate text-xs text-[#758892]">{item.subtitle}</span></span>
          {kind === 'action' && (item as QuickAction).requiresProject ? <span className="hidden rounded-full bg-[#edf3f6] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#6b808b] sm:inline">{project.projectName || 'Project required'}</span> : null}
        </button>
        <button type="button" onClick={() => toggleFavorite(key)} className="mr-2 rounded-lg p-2 text-[#8da0aa] opacity-60 transition hover:bg-white hover:text-[#ef8354] group-hover:opacity-100" aria-label={favorites.includes(key) ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}>
          <Star size={15} fill={favorites.includes(key) ? 'currentColor' : 'none'} />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-[#102c43]/55 px-3 pt-[7vh] backdrop-blur-sm sm:px-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div ref={dialogRef} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/40 bg-white shadow-[0_30px_90px_rgba(13,43,64,.28)]" role="dialog" aria-modal="true" aria-label="PMOCorex command palette" onKeyDown={onKeyDown}>
        <SearchInput value={query} onChange={value => { setQuery(value); setProjectPrompt(null) }} inputRef={inputRef} />

        <div className="flex items-center gap-2 border-b border-[#e8eef1] bg-[#fbfcfd] px-4 py-2 text-[10px] font-semibold text-[#82949d]">
          <span className="rounded border border-[#dce6eb] bg-white px-1.5 py-0.5 text-[#45616f]">&gt;</span><span>Actions</span>
          <span className="ml-2 rounded border border-[#dce6eb] bg-white px-1.5 py-0.5 text-[#45616f]">#</span><span>Records</span>
          <span className="ml-2 rounded border border-[#dce6eb] bg-white px-1.5 py-0.5 text-[#45616f]">@</span><span>People & teams</span>
        </div>

        <div className="max-h-[66vh] overflow-y-auto p-3">
          {projectPrompt ? (
            <div className="m-2 rounded-2xl border border-[#f0d1c5] bg-[#fff8f4] p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#173f5f]"><AlertCircle size={17} className="text-[#df6547]" /> Select a project before continuing</div>
              <p className="text-sm leading-6 text-[#6f838e]">“{projectPrompt.title}” must be linked to a project. Open the project list, select the correct project, then run the action again.</p>
              <div className="mt-4 flex gap-2">
                <button type="button" className="rounded-xl bg-[#173f5f] px-4 py-2 text-xs font-bold text-white" onClick={() => { onClose(); navigate('/projects') }}>Choose project</button>
                <button type="button" className="rounded-xl border border-[#d9e3e8] bg-white px-4 py-2 text-xs font-bold text-[#536b78]" onClick={() => setProjectPrompt(null)}>Back</button>
              </div>
            </div>
          ) : (
            <>
              {matchingActions.length ? <SearchCategory label={normalizedQuery ? 'Quick actions' : 'Recent actions'} count={matchingActions.length}>{matchingActions.map((action, index) => renderCommandRow(action, `action:${action.id}`, 'action', index))}</SearchCategory> : null}

              {matchingCommands.length ? <SearchCategory label={mode.prefix === '@' ? 'People & team navigation' : normalizedQuery ? 'Navigation' : 'Recent navigation'} count={matchingCommands.length}>{matchingCommands.map((command, index) => renderCommandRow(command, `command:${command.id}`, 'command', matchingActions.length + index))}</SearchCategory> : null}

              {visibleRecentProjects.length ? (
                <SearchCategory label="Recent projects" count={visibleRecentProjects.length}>
                  {visibleRecentProjects.map((item, index) => {
                    const itemIndex = matchingActions.length + matchingCommands.length + index
                    return <button key={item.id} type="button" onClick={() => openProject(item)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${activeIndex === itemIndex ? 'bg-[#edf4f7]' : 'hover:bg-[#f5f8fa]'}`}><span className="grid h-9 w-9 place-items-center rounded-xl border border-[#dce6eb] bg-white text-[#426477]"><FolderOpen size={17} /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#173f5f]">{item.name}</span><span className="block text-xs text-[#758892]">Return to project dashboard</span></span></button>
                  })}
                </SearchCategory>
              ) : null}

              {normalizedQuery.length < 2 ? (
                <div className="px-3 py-5">
                  {!matchingActions.length && !matchingCommands.length && !visibleRecentProjects.length ? <div className="mb-5 rounded-xl border border-[#dfe8ec] bg-[#f8fafb] px-4 py-3 text-sm leading-6 text-[#6f838e]">Type <strong className="text-[#173f5f]">&gt;</strong> for actions, <strong className="text-[#173f5f]">#</strong> for project records, or search a page such as Schedule, Risk or Reports.</div> : null}
                  {recentSearches.length ? <div><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a9ca5]">Recent searches</span><button type="button" onClick={clearHistory} className="text-[10px] font-bold text-[#c15e45] hover:underline">Clear history</button></div><div className="flex flex-wrap gap-2">{recentSearches.map(item => <button key={item} type="button" onClick={() => setQuery(item)} className="rounded-full border border-[#dce6eb] bg-[#f7fafb] px-3 py-1.5 text-xs font-semibold text-[#45616f] hover:border-[#b9cad3]">{item}</button>)}</div></div> : null}
                </div>
              ) : searchEnabled && search.isFetching ? (
                <div className="flex items-center justify-center gap-3 py-16 text-sm text-[#667d89]"><Loader2 size={18} className="animate-spin" /> Searching workspace…</div>
              ) : searchEnabled && results.length ? (
                Object.entries(groups).map(([category, categoryResults]) => {
                  const startIndex = runningIndex
                  runningIndex += categoryResults?.length || 0
                  return <SearchCategory key={category} label={category} count={categoryResults?.length || 0}>{(categoryResults || []).map((result, resultIndex) => <SearchResult key={`${result.type}:${result.id}`} result={result} active={activeIndex === startIndex + resultIndex} onSelect={() => selectResult(result)} />)}</SearchCategory>
                })
              ) : normalizedQuery.length >= 2 && !matchingActions.length && !matchingCommands.length ? (
                <div className="py-16 text-center"><div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#edf3f6] text-[#5e7480]"><Search size={19} /></div><div className="font-semibold text-[#173f5f]">No matching records or commands</div><p className="mt-1 text-sm text-[#7b8e98]">Try a project name, page, activity, document number or RFI reference.</p></div>
              ) : null}

              {search.data?.errors.length ? <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> Some modules could not be searched. Available results are still shown.</div> : null}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e2eaee] bg-[#f8fafb] px-4 py-2 text-[10px] font-semibold text-[#82949d]"><span>Commands and records respect your current permissions.</span><span>↑↓ Navigate · Enter Run · Esc Close · Ctrl/⌘ K</span></div>
      </div>
    </div>
  )
}
