import { useBrowserBranding } from '@/hooks/useBrowserBranding'
import { supabase } from '@/lib/supabase'
import { parseISO, differenceInDays } from 'date-fns'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'

import {
  canViewInternalPages,
  isExternalRole,
} from '@/lib/permissions'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  ShoppingCart,
  Brain,
  Wallet,
  CheckSquare,
  HardHat,
  AlertTriangle,
  FolderOpen,
  DollarSign,
  Shield,
  ClipboardList,
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
  MessageSquare,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { getInitials } from '@/lib/utils'
import NotificationsPanel from '@/components/modules/dashboard/NotificationsPanel'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

const NAV = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/app/schedule', icon: CalendarDays, label: 'Schedule' },
  { to: '/app/recovery', icon: BarChart3, label: 'Recovery Forecast' },
  { to: '/app/planner', icon: CalendarCheck, label: 'Planner', },
  { to: '/app/procurement', icon: ShoppingCart, label: 'Procurement' },
  { to: '/app/approvals', icon: CheckSquare, label: 'Approvals' },
  { to: '/app/site', icon: HardHat, label: 'Site Progress' },
  { to: '/app/quality', icon: ClipboardCheck, label: 'Quality Gates' },
  { to: '/app/hse', icon: HardHat, label: 'HSE', },
  { to: '/app/snags', icon: AlertTriangle, label: 'Snag List' },
  { to: '/app/documents', icon: FolderOpen, label: 'Documents' },
  { to: '/app/financial', icon: DollarSign, label: 'Financial' },
  { to: '/app/costing', icon: Wallet, label: 'Costing' },
  { to: '/app/design-reports', icon: PenTool, label: 'Design Reports' },
  { to: '/app/risk', icon: Shield, label: 'Risk Register' },
  { to: '/app/risk-trends', icon: Shield, label: 'Risk Trends' },
  { to: '/app/reports', icon: FileText, label: 'IPD Reports' },
   {
  to: '/app/project-packages',
  icon: Building2,
  label: 'Project Packages',
},
  {
  to: '/app/pmo-weekly-report',
  icon: FileText,
  label: 'Executive Reports',
},
 
  {
    to: '/app/internal-assignments',
    icon: ClipboardList,
    label: 'Internal Assignments',
  },
  {
    to: '/app/external-task-review',
    icon: ClipboardList,
    label: 'Task Review',
  },
  {
    to: '/app/external-assignments',
    icon: Building2,
    label: 'External Assignments',
  },

  {
    to: '/app/external-review',
    icon: Building2,
    label: 'External Review',
  },
  {
    to: '/app/external-communication',
    icon: MessageSquare,
    label: 'Communications',
  },
  {
  to: '/app/business-intelligence',
  icon: Brain,
  label: 'Business Intelligence',
},
  { to: '/app/team', icon: Users, label: 'Team' },
]

const VIEWER_NAV = [
  '/app',
  '/app/recovery',
  '/app/planner',
  '/app/team',
]

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
  useBrowserBranding()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [handoverDate, setHandoverDate] = useState<Date | null>(null)
  const [organizationName, setOrganizationName] = useState('')
  const [portfolioName, setPortfolioName] = useState('')

  const { user, signOut } = useAuthStore()
  const { projectId, projectName, organizationId, portfolioId } =
    useProjectStore()
  const role = useMembershipStore(state => state.role)

  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ['layout-notifications', user?.id, role, projectId],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return []

      const filters = [`user_id.eq.${user.id}`, `role.eq.${role || ''}`]

      if (projectId) {
        filters.push(`project_id.eq.${projectId}`)
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('is_read', false)
        .or(filters.join(','))

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
  }, [projectName])

  useEffect(() => {
    loadWorkspaceContext()
  }, [organizationId, portfolioId])

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

  async function loadProject() {
    if (!projectName) {
      setHandoverDate(null)
      return
    }

    const { data } = await supabase
      .from('projects')
      .select('handover_date')
      .eq('project_name', projectName)
      .maybeSingle()

    setHandoverDate(data?.handover_date ? parseISO(data.handover_date) : null)
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

  const allowedNav = NAV.filter(item => {
    if (isExternalRole(role)) return false

    if (role === 'viewer' || role === 'guest') {
      return VIEWER_NAV.includes(item.to)
    }

    return canViewInternalPages(role)
  })

  const currentPage = allowedNav.find(n =>
    n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to)
  )

  const pageTitle = currentPage?.label || 'Dashboard'

  return (
    <div className="layout-shell flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`layout-sidebar fixed lg:relative z-30 h-full w-[280px] flex-shrink-0 border-r backdrop-blur-xl flex flex-col transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-[2px] bg-gradient-to-r from-[#c49e48] via-[#e3c06a] to-transparent flex-shrink-0" />

        <div className="px-4 py-5 border-b border-white/[0.06] flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-left"
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

            <InfoBlock
              label="Project"
              value={projectName || 'No project selected'}
              highlight
            />
          </div>
        </div>

        <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="sidebar-panel flex items-center gap-3 rounded-xl px-3 py-3">
            <div
              className={`font-display text-3xl font-black leading-none ${
                daysLeft !== null && daysLeft < 60
                  ? 'text-red-400'
                  : 'text-[#c49e48]'
              }`}
            >
              {daysLeft !== null ? Math.max(0, daysLeft) : '-'}
            </div>

            <div>
              <div
                className={`text-[10px] font-semibold ${
                  daysLeft !== null && daysLeft < 60
                    ? 'text-red-400'
                    : 'text-[#c49e48]'
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

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {allowedNav.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all border ${
                  isActive
                    ? 'nav-active'
                    : 'nav-inactive'
                }`
              }
            >
              <Icon size={15} className="flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/[0.06] p-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="sidebar-panel w-full flex items-center gap-2.5 rounded-xl p-2.5 hover:border-[#c49e48]/30 hover:bg-[#c49e48]/5 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#c49e48]/20 border border-[#c49e48]/30 flex items-center justify-center text-[10px] font-bold text-[#c49e48] flex-shrink-0">
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
              <UserCircle size={16} className="text-[#c49e48]" />

              <button
                type="button"
                onClick={event => {
                  event.stopPropagation()
                  signOut()
                }}
                className="sidebar-muted hover:text-red-400 transition-colors"
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="layout-header sticky top-0 z-20 border-b backdrop-blur-xl px-4 lg:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            className="lg:hidden sidebar-muted hover:text-[#c49e48] transition-colors"
            onClick={() => setSidebarOpen(true)}
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
                <span className="text-[#c49e48]">
                  {projectName || 'Project'}
                </span>
              </div>
            </div>
          </div>

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
            className="relative sidebar-muted hover:text-[#c49e48] transition-colors p-1"
            onClick={() => setNotifsOpen(!notifsOpen)}
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

        <div className="layout-content flex-1 overflow-y-auto p-4 lg:p-6 animate-in">
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
            ? 'text-sm font-bold text-[#c49e48]'
            : 'sidebar-text text-xs font-semibold'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
