import { getRole } from '@/lib/access'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, CalendarDays, ShoppingCart, CheckSquare,
  HardHat, AlertTriangle, FolderOpen, DollarSign, Shield,
  Users, FileText, Bell, LogOut, Menu, X, ChevronDown, BarChart3, ShieldCheck
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { differenceInDays } from 'date-fns'
import { PROJECT_END } from '@/lib/utils'
import { getInitials } from '@/lib/utils'
import NotificationsPanel from '@/components/modules/dashboard/NotificationsPanel'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/schedule', icon: CalendarDays, label: 'Schedule' },
  { to: '/recovery', icon: BarChart3, label: 'Recovery Forecast' },
  { to: '/procurement', icon: ShoppingCart, label: 'Procurement' },
  { to: '/approvals', icon: CheckSquare, label: 'Approvals' },
  { to: '/site', icon: HardHat, label: 'Site Progress' },
  { to: '/snags', icon: AlertTriangle, label: 'Snag List' },
  { to: '/documents', icon: FolderOpen, label: 'Documents' },
  { to: '/financial', icon: DollarSign, label: 'Financial' },
  { to: '/risk', icon: Shield, label: 'Risk Register' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/audit', icon: ShieldCheck, label: 'Audit Trail' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const { user, signOut } = useAuthStore()
const role = getRole(user?.email)
  const location = useLocation()
  const daysLeft = differenceInDays(PROJECT_END, new Date())

  const allowedNav = NAV.filter(item => {
  if (role === 'admin') {
  return true
}

if (role === 'project') {
  return item.to !== '/audit'
}

  if (role === 'design') {
    return [
      '/',
      '/recovery',
      '/documents',
      '/snags',
      '/risk',
    ].includes(item.to)
  }

  if (role === 'costing') {
    return [
      '/',
      '/recovery',
      '/financial',
      '/snags',
      '/risk',
    ].includes(item.to)
  }

  return [
    '/',
    '/recovery',
  ].includes(item.to)
})
  const currentPage = allowedNav.find(n =>
  n.exact
    ? location.pathname === n.to
    : location.pathname.startsWith(n.to)
)
  const pageTitle = currentPage?.label || 'Dashboard'

  return (
    <div className="flex h-full overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative z-30 h-full w-[220px] flex-shrink-0
        bg-[#111820] border-r border-[#c49e48]/15
        flex flex-col transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Gold top line */}
        <div className="h-[2px] bg-gradient-to-r from-[#c49e48] to-transparent flex-shrink-0" />

        {/* Brand */}
        <div className="px-4 py-5 border-b border-white/[0.06] flex-shrink-0">
          <div className="text-[8px] font-mono uppercase tracking-[0.18em] text-[#c49e48] mb-1">Project Command</div>
          <div className="font-display text-[17px] font-bold text-[#ede8de] leading-tight">
            Lakowe Lakes<br />SPA Centre
          </div>
          <div className="text-[10px] text-[#6e7d8c] mt-1">Mixta Africa · Lagos</div>
          {role === 'guest' && (
  <div className="mt-2 inline-block px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[9px] font-semibold tracking-wide text-amber-400">
    Executive View
  </div>
)}
        </div>

        {/* Countdown */}
        <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3 bg-[#1c2a36] rounded-lg px-3 py-2.5">
            <div className={`font-display text-3xl font-bold leading-none ${daysLeft < 60 ? 'text-red-400' : 'text-[#c49e48]'}`}>
              {Math.max(0, daysLeft)}
            </div>
            <div>
              <div className={`text-[10px] font-semibold ${daysLeft < 60 ? 'text-red-400' : 'text-[#c49e48]'}`}>
                DAYS LEFT
              </div>
              <div className="text-[9px] text-[#6e7d8c]">18 Sep 2026</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {allowedNav.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={14} className="flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/[0.06] p-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#c49e48]/20 border border-[#c49e48]/30 flex items-center justify-center text-[10px] font-bold text-[#c49e48] flex-shrink-0">
              {user ? getInitials(user.full_name || 'User') : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-[#ede8de] truncate">{user?.full_name || 'User'}</div>
              <div className="text-[9px] text-[#6e7d8c] capitalize">{
  role === 'guest'
    ? 'Management'
    : role === 'project'
    ? 'Project Team'
    : role === 'design'
    ? 'Design Team'
    : role === 'costing'
    ? 'Costing Team'
    : 'Administrator'
}
              </div>
            </div>
            <button onClick={signOut} className="text-[#6e7d8c] hover:text-red-400 transition-colors" title="Sign out">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <header className="bg-[#111820] border-b border-[#c49e48]/15 px-4 lg:px-6 py-3 flex items-center gap-3 flex-shrink-0 relative">
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[#c49e48]/30 to-transparent" />
          <button
            className="lg:hidden text-[#6e7d8c] hover:text-[#ede8de] transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </button>
          <div className="font-display text-[18px] lg:text-[20px] font-semibold text-[#ede8de] flex-1">
            {pageTitle}
          </div>
          <div className="text-[10px] text-[#6e7d8c] font-mono hidden sm:block">
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <button
            className="relative text-[#6e7d8c] hover:text-[#c49e48] transition-colors p-1"
            onClick={() => setNotifsOpen(!notifsOpen)}
          >
            <Bell size={16} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full pulse-gold" />
          </button>
        </header>

        {/* Notifications panel */}
        {notifsOpen && (
          <div className="absolute top-14 right-4 z-40 w-80">
            <NotificationsPanel onClose={() => setNotifsOpen(false)} />
          </div>
        )}

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 animate-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
