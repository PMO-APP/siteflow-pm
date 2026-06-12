import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useProjectStore } from '@/store/project'
import { useThemeStore } from '@/store/theme'

import RequireRole from '@/components/auth/RequireRole'
import Layout from '@/components/layout/Layout'

import ComingSoonPage from '@/pages/ComingSoonPage'
import LoginPage from '@/pages/LoginPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import AcceptInvitePage from '@/pages/AcceptInvitePage'
import ProjectsPage from '@/pages/ProjectsPage'
import ProfilePage from '@/pages/ProfilePage'
import WorkspaceAdminPage from '@/pages/WorkspaceAdminPage'
import AuditPage from '@/pages/AuditPage'
import ExternalProjectPortal from '@/pages/ExternalProjectPortal'
import ExternalTasksPage from '@/pages/external/ExternalTasksPage'

import Dashboard from '@/pages/Dashboard'
import SchedulePage from '@/pages/SchedulePage'
import QualityPage from '@/pages/QualityPage'
import ProcurementPage from '@/pages/ProcurementPage'
import ApprovalsPage from '@/pages/ApprovalsPage'
import SitePage from '@/pages/SitePage'
import SnagsPage from '@/pages/SnagsPage'
import DocumentsPage from '@/pages/DocumentsPage'
import FinancialPage from '@/pages/FinancialPage'
import RiskPage from '@/pages/RiskPage'
import RiskTrendPage from '@/pages/RiskTrendPage'
import TeamPage from '@/pages/TeamPage'
import TeamAccessPage from '@/pages/TeamAccessPage'
import ReportsPage from '@/pages/ReportsPage'
import RecoveryForecastPage from '@/pages/RecoveryForecastPage'

const EXTERNAL_ROLES = ['consultant', 'contractor', 'vendor', 'subcontractor']

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

function RequireInternal({ children }: { children: React.ReactNode }) {
  const role = useMembershipStore(state => state.role)

  if (EXTERNAL_ROLES.includes(role || '')) {
    return <Navigate to="/external-project" replace />
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

  async function loadMembership(userId: string) {
    const { data: membership, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !membership) {
      clearMembership()
      return
    }

    setMembership({
      role: membership.role,
      accessScope: membership.access_scope,
      organizationId: membership.organization_id,
      portfolioId: membership.portfolio_id,
      projectId: membership.project_id,
    })
  }

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

        const { user } = session

        setUser({
          ...user,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email || 'User',
          role: user.user_metadata?.role || null,
        } as any)

        await loadMembership(user.id)
      } catch (error) {
        console.error('Auth loading failed:', error)
        clearMembership()
        setUser(null)
      } finally {
        if (mounted) setLoading(false)
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

      const { user } = session

      setUser({
        ...user,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email || 'User',
        role: user.user_metadata?.role || null,
      } as any)

      setTimeout(async () => {
        await loadMembership(user.id)
        setLoading(false)
      }, 0)
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
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />

        <Route
          path="/external-project"
          element={
            <RequireAuth>
              <ExternalProjectPortal />
            </RequireAuth>
          }
        />

        <Route
          path="/external-project/tasks"
          element={
            <RequireAuth>
              <ExternalTasksPage />
            </RequireAuth>
          }
        />

        <Route
          path="/projects"
          element={
            <RequireAuth>
              <RequireInternal>
                <ProjectsPage />
              </RequireInternal>
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireInternal>
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
              </RequireInternal>
            </RequireAuth>
          }
        />

        <Route
          path="/admin/audit"
          element={
            <RequireAuth>
              <RequireInternal>
                <RequireRole allowedRoles={['workspace_admin', 'admin']}>
                  <AuditPage />
                </RequireRole>
              </RequireInternal>
            </RequireAuth>
          }
        />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <RequireInternal>
                <RequireProject>
                  <Layout />
                </RequireProject>
              </RequireInternal>
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
