
import { useBrowserBranding } from '@/hooks/useBrowserBranding'
import { supabase } from '@/lib/supabase'
import { parseISO } from 'date-fns'
import { useProjectStore } from '@/store/project'
import { getRole } from '@/lib/access'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  CalendarDays,
  ShoppingCart,
  CheckSquare,
  HardHat,
  AlertTriangle,
  FolderOpen,
  DollarSign,
  Shield,
  Users,
  FileText,
  Bell,
  LogOut,
  Menu,
  BarChart3,
  ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { differenceInDays } from 'date-fns'
import { getInitials } from '@/lib/utils'
import NotificationsPanel from '@/components/modules/dashboard/NotificationsPanel'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'
import {
  Settings,
  UserCircle,
} from 'lucide-react'

const NAV = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/app/schedule', icon: CalendarDays, label: 'Schedule' },
  { to: '/app/recovery', icon: BarChart3, label: 'Recovery Forecast' },
  { to: '/app/procurement', icon: ShoppingCart, label: 'Procurement' },
  { to: '/app/approvals', icon: CheckSquare, label: 'Approvals' },
  { to: '/app/site', icon: HardHat, label: 'Site Progress' },
  { to: '/app/snags', icon: AlertTriangle, label: 'Snag List' },
  { to: '/app/documents', icon: FolderOpen, label: 'Documents' },
  { to: '/app/financial', icon: DollarSign, label: 'Financial' },
  { to: '/app/risk', icon: Shield, label: 'Risk Register' },
  { to: '/app/risk-trends', icon: Shield, label: 'Risk Trends' },
  { to: '/app/team', icon: Users, label: 'Team' },
  { to: '/app/reports', icon: FileText, label: 'Reports' },
  { to: '/app/profile', icon: UserCircle, label: 'Profile' },
{ to: '/app/settings', icon: Settings, label: 'Settings' },
  { to: '/app/audit', icon: ShieldCheck, label: 'Audit Trail' },
  { to: '/app/team-access', icon: Users, label: 'Team Access' },
]

export default function Layout() {
  useBrowserBranding()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [handoverDate, setHandoverDate] =
    useState<Date | null>(null)
  const [organizationName, setOrganizationName] =
    useState('')
  const [portfolioName, setPortfolioName] =
    useState('')

  const { user, signOut } = useAuthStore()

  const {
    projectName,
    organizationId,
    portfolioId,
  } = useProjectStore()

  const role = getRole(user?.email)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    loadProject()
  }, [projectName])

  useEffect(() => {
    loadWorkspaceContext()
  }, [organizationId, portfolioId])

  async function loadProject() {
    if (!projectName) {
      setHandoverDate(null)
      return
    }

    const { data } = await supabase
      .from('projects')
      .select('handover_date')
      .eq('project_name', projectName)
      .single()

    if (data?.handover_date) {
      setHandoverDate(parseISO(data.handover_date))
    } else {
      setHandoverDate(null)
    }
  }

  async function loadWorkspaceContext() {
    if (organizationId) {
      const { data } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single()

      setOrganizationName(data?.name || '')
    } else {
      setOrganizationName('')
    }

    if (portfolioId) {
      const { data } = await supabase
        .from('portfolios')
        .select('name')
        .eq('id', portfolioId)
        .single()

      setPortfolioName(data?.name || '')
    } else {
      setPortfolioName('')
    }
  }

  const daysLeft = handoverDate
    ? differenceInDays(handoverDate, new Date())
    : null

  const allowedNav = NAV.filter(item => {
    if (role === 'admin') return true
    if (role === 'project') return item.to !== '/app/audit'

    if (role === 'design') {
      return [
        '/app',
        '/app/recovery',
        '/app/documents',
        '/app/snags',
        '/app/risk',
      ].includes(item.to)
    }

    if (role === 'costing') {
      return [
        '/app',
        '/app/recovery',
        '/app/financial',
        '/app/snags',
        '/app/risk',
      ].includes(item.to)
    }

    return ['/app', '/app/recovery'].includes(item.to)
  })

  const currentPage = allowedNav.find(n =>
    n.exact
      ? location.pathname === n.to
      : location.pathname.startsWith(n.to)
  )

  const pageTitle = currentPage?.label || 'Dashboard'

  return (
    <div className="flex h-screen bg-[#0a0e12] text-white overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:relative z-30 h-full w-[280px] flex-shrink-0
          border-r border-white/[0.06] bg-[#0f141a]/95 backdrop-blur-xl
          flex flex-col transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
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

          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 space-y-2">
            <div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-[#6e7d8c]">
                Organization
              </div>

              <div className="mt-1 truncate text-xs font-semibold text-[#ede8de]">
                {organizationName || 'No organization'}
              </div>
            </div>

            <div className="h-px bg-white/[0.06]" />

            <div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-[#6e7d8c]">
                Portfolio
              </div>

              <div className="mt-1 truncate text-xs font-semibold text-[#ede8de]">
                {portfolioName || 'No portfolio'}
              </div>
            </div>

            <div className="h-px bg-white/[0.06]" />

            <div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-[#6e7d8c]">
                Project
              </div>

              <div className="mt-1 truncate text-sm font-bold text-[#c49e48]">
                {projectName || 'No project selected'}
              </div>
            </div>

            {role === 'guest' && (
              <div className="mt-2 inline-block px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[9px] font-semibold tracking-wide text-amber-400">
                Executive View
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#111820] px-3 py-3">
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

              <div className="text-[9px] text-[#6e7d8c]">
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
                    ? 'bg-[#c49e48]/12 text-[#c49e48] border-[#c49e48]/20'
                    : 'text-slate-400 border-transparent hover:text-white hover:bg-white/[0.04]'
                }`
              }
            >
              <Icon size={15} className="flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/[0.06] p-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] p-2.5">
            <div className="w-8 h-8 rounded-full bg-[#c49e48]/20 border border-[#c49e48]/30 flex items-center justify-center text-[10px] font-bold text-[#c49e48] flex-shrink-0">
             {user ? getInitials(user.full_name || 'Admin') : 'A'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-[#ede8de] truncate">
                {user?.full_name || 'Admin'}
              </div>

              <div className="text-[9px] text-[#6e7d8c] capitalize">
                {role === 'guest'
                  ? 'Management'
                  : role === 'project'
                  ? 'Project Team'
                  : role === 'design'
                  ? 'Design Team'
                  : role === 'costing'
                  ? 'Costing Team'
                  : 'Administrator'}
              </div>
            </div>

            <button
              onClick={signOut}
              className="text-[#6e7d8c] hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0c1014]/80 backdrop-blur-xl px-4 lg:px-6 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            className="lg:hidden text-[#6e7d8c] hover:text-[#ede8de] transition-colors"
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
              <div className="font-display text-[18px] lg:text-[20px] font-semibold text-[#ede8de]">
                {pageTitle}
              </div>

              <div className="hidden md:flex items-center gap-1 text-[10px] text-[#6e7d8c] mt-0.5 truncate">
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
            <span className="text-[11px] text-emerald-400">
              Live
            </span>
          </div>

          <div className="text-[10px] text-[#6e7d8c] font-mono hidden sm:block">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>

          <button
            className="relative text-[#6e7d8c] hover:text-[#c49e48] transition-colors p-1"
            onClick={() => setNotifsOpen(!notifsOpen)}
          >
            <Bell size={16} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full pulse-gold" />
          </button>
        </header>

        {notifsOpen && (
          <div className="absolute top-14 right-4 z-40 w-80">
            <NotificationsPanel onClose={() => setNotifsOpen(false)} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 animate-in bg-[#0c1014]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
