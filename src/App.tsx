import { useMembershipStore } from '@/store/membership'
import RequireRole from '@/components/auth/RequireRole'
import QualityPage from '@/pages/QualityPage'
import { useThemeStore } from '@/store/theme'
import ComingSoonPage from '@/pages/ComingSoonPage'
import TeamAccessPage from '@/pages/TeamAccessPage'
import { useProjectStore } from '@/store/project'
import ProjectsPage from '@/pages/ProjectsPage'
import RiskTrendPage from '@/pages/RiskTrendPage'
import AuditPage from '@/pages/AuditPage'
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/LoginPage'
import Dashboard from '@/pages/Dashboard'
import SchedulePage from '@/pages/SchedulePage'
import ProcurementPage from '@/pages/ProcurementPage'
import ApprovalsPage from '@/pages/ApprovalsPage'
import SitePage from '@/pages/SitePage'
import SnagsPage from '@/pages/SnagsPage'
import DocumentsPage from '@/pages/DocumentsPage'
import FinancialPage from '@/pages/FinancialPage'
import RiskPage from '@/pages/RiskPage'
import TeamPage from '@/pages/TeamPage'
import ReportsPage from '@/pages/ReportsPage'
import RecoveryForecastPage from '@/pages/RecoveryForecastPage'
import AcceptInvitePage from '@/pages/AcceptInvitePage'
import WorkspaceAdminPage from '@/pages/WorkspaceAdminPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0c1014]">
        <div className="text-center">
          <div className="font-display text-3xl text-[#c49e48] mb-2">
            PMOCorex
          </div>
          <div className="text-[#6e7d8c] text-sm">Loading…</div>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/mixta-admin-login" replace />

  return <>{children}</>
}

function RequireProject({ children }: { children: React.ReactNode }) {
  const { projectId } = useProjectStore()

  if (!projectId) {
    return <Navigate to="/projects" replace />
  }

  return <>{children}</>
}

export default function App() {
  const { setUser, setLoading } = useAuthStore()
  const { setMembership, clearMembership } = useMembershipStore()
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(theme)
  }, [theme])

  useEffect(() => {
  let mounted = true

  async function loadAuthUser() {
    try {
      setLoading(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (!session?.user) {
        clearMembership()
        setUser(null)
        return
      }

      setUser({
        ...session.user,
        email: session.user.email,
        full_name:
          session.user.user_metadata?.full_name ||
          session.user.email ||
          'Admin',
        role: 'admin',
      } as any)

      setMembership({
        role: 'admin',
        accessScope: 'workspace',
        organizationId: 1,
        portfolioId: null,
        projectId: null,
      })
    } catch (error) {
      console.error('Auth loading failed:', error)
      clearMembership()
      setUser(null)
    } finally {
      if (mounted) {
        setLoading(false)
      }
    }
  }

  loadAuthUser()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      clearMembership()
      setUser(null)
      setLoading(false)
      return
    }

    setUser({
      ...session.user,
      email: session.user.email,
      full_name:
        session.user.user_metadata?.full_name ||
        session.user.email ||
        'Admin',
      role: 'admin',
    } as any)

    setMembership({
      role: 'admin',
      accessScope: 'workspace',
      organizationId: 1,
      portfolioId: null,
      projectId: null,
    })

    setLoading(false)
  })

  return () => {
    mounted = false
    subscription.unsubscribe()
  }
}, [setUser, setLoading, setMembership, clearMembership]) 

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ComingSoonPage />} />

        <Route path="/pricing" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/signin" element={<Navigate to="/" replace />} />
        <Route path="/signup" element={<Navigate to="/" replace />} />

        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/mixta-admin-login" element={<LoginPage />} />

        <Route
          path="/projects"
          element={
            <RequireAuth>
              <ProjectsPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireRole
                allowedRoles={[
                  'workspace_admin',
                  'admin',
                  'pmo',
                  'portfolio_manager',
                ]}
              >
                <WorkspaceAdminPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        <Route
          path="/admin/audit"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['workspace_admin', 'admin']}>
                <AuditPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <RequireProject>
                <Layout />
              </RequireProject>
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="recovery" element={<RecoveryForecastPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="quality" element={<QualityPage />} />
          <Route path="procurement" element={<ProcurementPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="site" element={<SitePage />} />
          <Route path="snags" element={<SnagsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="financial" element={<FinancialPage />} />
          <Route path="risk" element={<RiskPage />} />
          <Route path="risk-trends" element={<RiskTrendPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="team-access" element={<TeamAccessPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
