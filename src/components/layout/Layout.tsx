import { useBrowserBranding } from '@/hooks/useBrowserBranding'
import { supabase } from '@/lib/supabase'
import { parseISO, differenceInDays } from 'date-fns'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import { PackageCheck } from 'lucide-react'
import WorkspaceSwitcher from './WorkspaceSwitcher'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { useAccessSession } from '@/access/AccessSessionProvider'
import type { PermissionAction } from '@/access/accessTypes'


import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  ShoppingCart,
  FileSpreadsheet,
  Brain,
  Wallet,
  CheckSquare,
  Activity,
  HardHat,
  AlertTriangle,
  FolderOpen,
  Shield,
  ClipboardList,
  ListChecks,
  Users,
  FileText,
  PenTool,
  Bell,
  LogOut,
  Menu,
  BarChart3,
  ClipboardCheck,
  UserCircle,
  Building2,
  MessageSquareText,
  Search,
  Send,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { getInitials } from '@/lib/utils'
import NotificationsPanel from '@/components/modules/dashboard/NotificationsPanel'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'
import { CommandPalette } from '@/components/search'
import { useCommandPalette } from '@/hooks/useCommandPalette'

type NavItem = {
  to: string
  icon: any
  label: string
  exact?: boolean
  permission?: PermissionAction
  group: NavGroupKey
}

type NavGroupKey = 'overview' | 'planning' | 'delivery' | 'commercial' | 'technical' | 'governance' | 'administration'

const NAV_GROUPS: Array<{ key: NavGroupKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'planning', label: 'Planning' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'technical', label: 'Technical' },
  { key: 'governance', label: 'Governance' },
  { key: 'administration', label: 'Administration' },
]

const NAV: NavItem[] = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', exact: true, group: 'overview' },
  { to: '/app/executive-dashboard', icon: BarChart3, label: 'Executive Dashboard', permission: 'reports.view', group: 'overview' },
  { to: '/app/schedule', icon: CalendarDays, label: 'Schedule', group: 'planning' },
  {
  to: '/app/project-controls',
  icon: Activity,
  label: 'Project Controls',
  group: 'planning',
},
   {
  to: '/app/schedule-revisions',
  icon: FileSpreadsheet,
  label: 'Schedule Revisions',
  group: 'planning',
},
  { to: '/app/recovery', icon: BarChart3, label: 'Recovery Forecast', group: 'planning' },
  { to: '/app/planner', icon: CalendarCheck, label: 'Planner', group: 'planning' },
  { to: '/app/procurement', icon: ShoppingCart, label: 'Procurement', group: 'commercial' },
  { to: '/app/approvals', icon: CheckSquare, label: 'Approvals', group: 'commercial' },
  { to: '/app/site', icon: HardHat, label: 'Site Progress', group: 'delivery' },
  { to: '/app/quality', icon: ClipboardCheck, label: 'Quality Gates', group: 'delivery' },
  { to: '/app/hse', icon: HardHat, label: 'HSE', group: 'delivery' },
  { to: '/app/snags', icon: AlertTriangle, label: 'Snag List', group: 'delivery' },
  { to: '/app/rfis', icon: MessageSquareText, label: 'RFIs', group: 'technical' },
  { to: '/app/documents', icon: FolderOpen, label: 'Documents', group: 'technical' },
  { to: '/app/costing', icon: Wallet, label: 'Costing', group: 'commercial' },
  { to: '/app/risk', icon: Shield, label: 'Risk Register', group: 'governance' },
  { to: '/app/risk-trends', icon: Shield, label: 'Risk Trends', group: 'governance' },
  { to: '/app/reports', icon: FileText, label: 'Reports', group: 'governance' },
  { to: '/app/handover', icon: PackageCheck, label: 'Handover', group: 'delivery' },

   {
  to: '/app/project-packages',
  icon: Building2,
  label: 'Project Packages',
  group: 'administration',
},
 
 
  {
    to: '/app/internal-assignments',
    icon: ClipboardList,
    label: 'Internal Assignments',
    group: 'administration',
  },
  { to: '/app/my-assignments', icon: ListChecks, label: 'My Assignments', group: 'overview' },
  {
  to: '/app/business-intelligence',
  icon: Brain,
  label: 'Business Intelligence',
  group: 'overview',
},
  {
    to: '/app/administration',
    icon: Shield,
    label: 'Administration',
    permission: 'workspace.manage',
    group: 'administration',
  },
  { to: '/app/team', icon: Users, label: 'Team', group: 'administration' },
]

const NAV_PERMISSIONS:Record<string,PermissionAction>={
  '/app':'workspace.view',
  '/app/executive-dashboard':'reports.view',
  '/app/schedule':'schedule.view',
  '/app/project-controls':'project.view',
  '/app/schedule-revisions':'schedule.view',
  '/app/recovery':'schedule.view',
  '/app/planner':'schedule.view',
  '/app/procurement':'procurement.view',
  '/app/approvals':'approvals.view',
  '/app/site':'project.view',
  '/app/quality':'quality.view',
  '/app/hse':'project.view',
  '/app/snags':'snags.view',
  '/app/rfis':'project.view',
  '/app/documents':'documents.view',
  '/app/costing':'costing.view',
  '/app/design-reports':'reports.view',
  '/app/risk':'risk.view',
  '/app/risk-trends':'risk.view',
  '/app/reports':'reports.view',
  '/app/handover':'project.view',
  '/app/project-packages':'project.view',
  '/app/pmo-weekly-report':'reports.view',
  '/app/executive-reporting':'reports.view',
  '/app/executive-narrative':'reports.view',
  '/app/report-designer':'reports.edit',
  '/app/report-distribution':'reports.view',
  '/app/internal-assignments':'team.manage',
  '/app/my-assignments':'workspace.view',
  '/app/business-intelligence':'reports.view',
  '/app/administration':'workspace.manage',
  '/app/team':'workspace.view',
}

function formatRoleLabel(role: string | null) {
  if (!role) return 'Team Member'

  const labels: Record<string, string> = {
    workspace_admin: 'Workspace Admin',
    admin: 'Administrator',
    pmo: 'PMO',
    portfolio_manager: 'Portfolio Manager',
    project_owner: 'Project Owner',
    project_manager: 'Project Manager',
    design: 'Design Team',
    housebuild: 'Housebuild',
    costing: 'Costing Team',
    infrastructure: 'Infrastructure',
    mep: 'MEP',
    contractor: 'Contractor',
    consultant: 'Consultant',
    vendor: 'Vendor',
    subcontractor: 'Subcontractor',
    viewer: 'Viewer',
    guest: 'Guest',
  }

  return labels[role] || role.replace(/_/g, ' ')
}

export default function Layout() {
  const { can } = useAccessSession()
  useBrowserBranding()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const commandPalette = useCommandPalette()
  const [handoverDate, setHandoverDate] = useState<Date | null>(null)
  const [organizationName, setOrganizationName] = useState('')
  const [portfolioName, setPortfolioName] = useState('')
  const [projectImageUrl, setProjectImageUrl] = useState<string | null>(null)

  const { user, signOut } = useAuthStore()
  const { activeWorkspace } = useWorkspace()
  const { projectId, projectName, organizationId, portfolioId } =
    useProjectStore()
  const role = useMembershipStore(state => state.role)

  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ['layout-notifications', activeWorkspace?.id, user?.id, role, projectId],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return []

      const filters = [`user_id.eq.${user.id}`, `role.eq.${role || ''}`]

      if (projectId) {
        filters.push(`project_id.eq.${projectId}`)
      }

      let query = supabase
        .from('notifications')
        .select('id')
        .eq('is_read', false)

      if (activeWorkspace?.id) {
        query = query.eq('workspace_id', activeWorkspace.id)
      }

      const { data, error } = await query.or(filters.join(','))

      if (error) {
        console.error(error.message)
        return []
      }

      return data || []
    },
  })

  const unreadCount = unreadNotifications.length

  useEffect(() => {
    loadProject()
  }, [projectId, projectName])

  useEffect(() => {
    loadWorkspaceContext()
  }, [organizationId, portfolioId])

  useEffect(() => {
    setSidebarOpen(false)
    setNotifsOpen(false)
    commandPalette.close()
  }, [location.pathname, commandPalette.close])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setSidebarOpen(false)
      setNotifsOpen(false)
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('layout-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['layout-notifications'],
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  function safeParseDate(value?: string | null) {
    if (!value) return null
    const date = parseISO(value)
    return Number.isNaN(date.getTime()) ? null : date
  }

  async function loadProject() {
    if (!projectId && !projectName) {
      setHandoverDate(null)
      setProjectImageUrl(null)
      return
    }

    const query = supabase
      .from('projects')
      .select('id, handover_date, project_scope, scope_notes, project_image_url')

    const { data: projectData, error: projectError } = projectId
      ? await query.eq('id', projectId).maybeSingle()
      : await query.eq('project_name', projectName).maybeSingle()

    if (projectError) {
      console.error(projectError.message)
    }

    setProjectImageUrl(projectData?.project_image_url || null)

    const explicitHandover = safeParseDate(projectData?.handover_date)

    if (explicitHandover) {
      setHandoverDate(explicitHandover)
      return
    }


    const resolvedProjectId = projectData?.id || projectId

    if (!resolvedProjectId) {
      setHandoverDate(null)
      return
    }

    const { data: scheduleTasks, error } = await supabase
      .from('tasks')
      .select('planned_finish, finish_date')
      .eq('project_id', resolvedProjectId)

    if (error) {
      console.error(error.message)
      setHandoverDate(null)
      return
    }

    const lastTask = (scheduleTasks || [])
      .map(task => ({
        ...task,
        finishDate:
          safeParseDate(task.planned_finish) ||
          safeParseDate(task.finish_date),
      }))
      .filter(task => task.finishDate)
      .sort((a, b) => {
        const aTime = a.finishDate?.getTime() ?? 0
        const bTime = b.finishDate?.getTime() ?? 0
        return bTime - aTime
      })[0]

    setHandoverDate(lastTask?.finishDate || null)
  }

  async function loadWorkspaceContext() {
    if (organizationId) {
      const { data } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .maybeSingle()

      setOrganizationName(data?.name || '')
    } else {
      setOrganizationName('')
    }

    if (portfolioId) {
      const { data } = await supabase
        .from('portfolios')
        .select('name')
        .eq('id', portfolioId)
        .maybeSingle()

      setPortfolioName(data?.name || '')
    } else {
      setPortfolioName('')
    }
  }

  const daysLeft = handoverDate
    ? differenceInDays(handoverDate, new Date())
    : null

  // Navigation visibility is deliberately separate from edit permissions.
  // Every active internal team member can see the project-control modules;
  // individual pages/actions remain permission-gated. Administration stays admin-only.
  const allowedNav = NAV.filter(item => {
    if (item.permission === 'workspace.manage') {
      return can('workspace.manage', { scopeType: 'workspace' })
    }

    return true
  })

  const currentPage = allowedNav.find(n =>
    n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to)
  )

  const pageTitle = currentPage?.label || 'Dashboard'

  return (
    <div className="layout-shell flex h-screen overflow-hidden">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="primary-navigation"
        aria-label="Primary navigation"
        className={`layout-sidebar fixed lg:relative z-30 h-full w-[280px] flex-shrink-0 border-r backdrop-blur-xl flex flex-col transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-[2px] bg-transparent flex-shrink-0" />

        <div className="px-4 py-5 border-b border-white/[0.06] flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-left"
            aria-label="Open PMOCorex home"
          >
            <PMOCorexLogo size={34} />
          </button>

          <div className="sidebar-panel mt-4 rounded-xl p-3 space-y-2">
            <InfoBlock
              label="Organization"
              value={organizationName || 'No organization'}
            />

            <div className="h-px bg-white/[0.06]" />

            <InfoBlock
              label="Portfolio"
              value={portfolioName || 'No portfolio'}
            />

            <div className="h-px bg-white/[0.06]" />

            <div className="flex items-center gap-3">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-[#d7e1e4] bg-[#f6f8f9]">
                {projectImageUrl ? (
                  <img src={projectImageUrl} alt={`${projectName || 'Project'} cover`} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-[9px] font-semibold text-[#8a9aa3]">PROJECT</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <InfoBlock
                  label="Project"
                  value={projectName || 'No project selected'}
                  highlight
                />
              </div>
            </div>
          </div>
            <div className="mt-4"><WorkspaceSwitcher /></div>
        </div>

        <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="sidebar-panel flex items-center gap-3 rounded-xl px-3 py-3">
            <div
              className={`font-display text-3xl font-black leading-none ${
                daysLeft !== null && daysLeft < 60
                  ? 'text-red-500'
                  : 'text-[#173f5f]'
              }`}
            >
              {daysLeft !== null ? Math.max(0, daysLeft) : '-'}
            </div>

            <div>
              <div
                className={`text-[10px] font-semibold ${
                  daysLeft !== null && daysLeft < 60
                    ? 'text-red-500'
                    : 'text-[#5f7481]'
                }`}
              >
                DAYS LEFT
              </div>

              <div className="sidebar-muted text-[9px]">
                {handoverDate
                  ? handoverDate.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'No handover date'}
              </div>
            </div>
          </div>
        </div>

        <nav className="layout-nav flex-1 overflow-y-auto px-3 py-3" aria-label="Project modules">
          {NAV_GROUPS.map(group => {
            const items = allowedNav.filter(item => item.group === group.key)
            if (!items.length) return null

            return (
              <section key={group.key} className="layout-nav__group" aria-labelledby={`nav-${group.key}`}>
                <div id={`nav-${group.key}`} className="layout-nav__label">{group.label}</div>
                <div className="layout-nav__items">
                  {items.map(({ to, icon: Icon, label, exact }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={exact}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `layout-nav__item ${isActive ? 'nav-active' : 'nav-inactive'}`
                      }
                    >
                      <Icon size={15} className="flex-shrink-0" />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              </section>
            )
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="sidebar-panel w-full flex items-center gap-2.5 rounded-xl p-2.5 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all text-left"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400 flex-shrink-0">
              {user ? getInitials(user.full_name || user.email || 'User') : 'U'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="sidebar-text text-[11px] font-medium truncate">
                {user?.full_name || user?.email || 'User'}
              </div>

              <div className="sidebar-muted text-[9px] capitalize">
                {formatRoleLabel(role)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <UserCircle size={16} className="text-blue-400" />

              <button
                type="button"
                onClick={event => {
                  event.stopPropagation()
                  signOut()
                }}
                className="sidebar-muted hover:text-red-500 transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 flex flex-col h-full overflow-hidden" aria-label="Application workspace">
        <header className="layout-header sticky top-0 z-20 border-b backdrop-blur-xl px-4 lg:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            className="lg:hidden sidebar-muted hover:text-[#173f5f] transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            aria-controls="primary-navigation"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="btn-ghost btn-sm btn"
            >
              ← Back
            </button>

            <button
              onClick={() => navigate('/projects')}
              className="btn-ghost btn-sm btn"
            >
              Workspace Hub
            </button>

            <div className="ml-2 min-w-0">
              <div className="sidebar-text font-display text-[18px] lg:text-[20px] font-semibold">
                {pageTitle}
              </div>

              <div className="hidden md:flex items-center gap-1 sidebar-muted text-[10px] mt-0.5 truncate">
                <span>{organizationName || 'Organization'}</span>
                <span>/</span>
                <span>{portfolioName || 'Portfolio'}</span>
                <span>/</span>
                <span className="text-blue-400">
                  {projectName || 'Project'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={commandPalette.show}
            className="hidden sm:flex min-w-[190px] items-center gap-2 rounded-xl border border-[#d8e3e8] bg-white px-3 py-2 text-left text-xs font-medium text-[#6b7f8a] shadow-sm transition hover:border-[#bdccd4] hover:bg-[#f8fafb]"
            aria-label="Search workspace"
          >
            <Search size={15} />
            <span className="flex-1">Search or jump to…</span>
            <kbd className="rounded border border-[#d7e1e6] bg-[#f6f8f9] px-1.5 py-0.5 text-[9px] font-bold text-[#738690]">Ctrl K</kbd>
          </button>

          <button
            type="button"
            onClick={commandPalette.show}
            className="sm:hidden rounded-lg p-1.5 sidebar-muted hover:bg-[#edf3f6] hover:text-[#173f5f]"
            aria-label="Search workspace"
          >
            <Search size={17} />
          </button>

          <div className="hidden md:flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-emerald-400">Live</span>
          </div>

          <div className="sidebar-muted text-[10px] font-mono hidden sm:block">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>

          <button
            className="relative sidebar-muted hover:text-[#173f5f] transition-colors p-1"
            onClick={() => setNotifsOpen(!notifsOpen)}
            aria-label={unreadCount ? `Open notifications, ${unreadCount} unread` : 'Open notifications'}
            aria-expanded={notifsOpen}
          >
            <Bell size={16} />

            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </header>

        {notifsOpen && (
          <div className="absolute top-14 right-4 z-40 w-80">
            <NotificationsPanel onClose={() => setNotifsOpen(false)} />
          </div>
        )}

        <CommandPalette open={commandPalette.open} onClose={commandPalette.close} />

        <div id="main-content" tabIndex={-1} className="layout-content min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-6 animate-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function InfoBlock({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <div className="sidebar-muted text-[9px] uppercase tracking-[0.25em]">
        {label}
      </div>

      <div
        className={`mt-1 truncate ${
          highlight
            ? 'text-sm font-bold text-[#3b82f6]'
            : 'sidebar-text text-xs font-semibold'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
