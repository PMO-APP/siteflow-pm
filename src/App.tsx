
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useThemeStore } from '@/store/theme'
import { isExternalRole } from '@/lib/permissions'
import {
  isExternalWorkspace,
  resolveWorkspace,
  type WorkspaceType,
} from '@/platform/access'

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
import PortfolioDashboardPage from '@/pages/PortfolioDashboardPage'
import PlannerPage from '@/pages/PlannerPage'
import CostingPage from '@/pages/CostingPage'
import DesignReportsPage from '@/pages/DesignReportsPage'
import PMOWeeklyReportPage from '@/pages/PMOWeeklyReportPage'
import ProjectPackagesPage from '@/pages/ProjectPackagesPage'
import HandoverPage from '@/pages/HandoverPage'

import CommandCenterDashboard from '@/pages/CommandCenterDashboard'
import BusinessIntelligencePage from '@/pages/BusinessIntelligencePage'
import StudioLayout from '@/studio/layout/StudioLayout'
import StudioHome from '@/studio/pages/StudioHome'
import StudioIntelligencePage from '@/studio/pages/StudioIntelligencePage'
import StudioProjectStatePage from '@/studio/pages/StudioProjectStatePage'
import StudioPlaceholderPage from '@/studio/pages/StudioPlaceholderPage'

import Dashboard from '@/pages/Dashboard'
import SchedulePage from '@/pages/SchedulePage'
import QualityPage from '@/pages/QualityPage'
import HSEPage from '@/pages/HSEPage'
import ProcurementPage from '@/pages/ProcurementPage'
import ApprovalsPage from '@/pages/ApprovalsPage'
import SitePage from '@/pages/SitePage'
import SnagsPage from '@/pages/SnagsPage'
import DocumentsPage from '@/pages/DocumentsPage'
import RiskPage from '@/pages/RiskPage'
import RiskTrendPage from '@/pages/RiskTrendPage'
import TeamPage from '@/pages/TeamPage'
import TeamAccessPage from '@/pages/TeamAccessPage'
import ReportsPage from '@/pages/ReportsPage'
import RecoveryForecastPage from '@/pages/RecoveryForecastPage'
import ProjectControlsPage from '@/pages/ProjectControlsPage'
import ScheduleRevisionsPage from '@/pages/ScheduleRevisionsPage'

const VIEWER_ALLOWED_ROUTES = [
  '/app',
  '/app/recovery',
  '/app/team',
  '/app/costing',
]

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

function RequireInternal({ children }: { children: React.ReactNode }) {
  const role = useMembershipStore(state => state.role)
  const workspaceType = useMembershipStore(state => state.workspaceType)
  const workspace = workspaceType || resolveWorkspace(role)

  if (isExternalWorkspace(workspace) || isExternalRole(role)) {
    return <Navigate to="/external-project" replace />
  }

  return <>{children}</>
}


function ViewerRoute({ children }: { children: React.ReactNode }) {
  const role = useMembershipStore(state => state.role)
  const path = window.location.pathname

  if (
    ['viewer', 'guest'].includes(role || '') &&
    !VIEWER_ALLOWED_ROUTES.includes(path)
  ) {
    return <Navigate to="/app" replace />
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
    const { data: sessionData } = await supabase.auth.getSession()
    const email = sessionData.session?.user?.email?.toLowerCase().trim()

    let query = supabase
      .from('memberships')
      .select('*')
      .eq('user_id', userId)

    if (email) {
      query = supabase
        .from('memberships')
        .select('*')
        .or(`user_id.eq.${userId},email.eq.${email}`)
    }

    const { data: memberships, error } = await query

    if (error || !memberships || memberships.length === 0) {
      clearMembership()
      return
    }

   

    const workspaceMembership = memberships.find(
      membership => membership.access_scope === 'workspace'
    )

    const selectedMembership =
      externalMembership || workspaceMembership || memberships[0]

    const projectIds = memberships
      .filter(
        membership =>
          membership.access_scope === 'project' && membership.project_id
      )
      .map(membership => membership.project_id)

    const workspaceType = resolveWorkspace(
      selectedMembership.role,
      selectedMembership.workspace_type
    )

    setMembership({
      role: selectedMembership.role,
      portalRole: selectedMembership.portal_role || null,
      workspaceType: workspaceType as WorkspaceType,
      accessScope: selectedMembership.access_scope,
      organizationId: selectedMembership.organization_id,
      portfolioId: selectedMembership.portfolio_id,
      projectId: selectedMembership.project_id,
      projectIds,
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
          path="/portfolio-dashboard"
          element={
            <RequireAuth>
              <RequireInternal>
                <PortfolioDashboardPage />
              </RequireInternal>
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
                <RequireRole allowedRoles={['workspace_admin', 'admin', 'pmo']}>
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
                <RequireRole allowedRoles={['workspace_admin', 'admin', 'pmo']}>
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
                <ViewerRoute>
                  <Layout />
                </ViewerRoute>
              </RequireInternal>
            </RequireAuth>
          }
        >
          <Route index element={<CommandCenterDashboard />} />
          <Route path="recovery" element={<RecoveryForecastPage />} />
          <Route path="planner" element={<PlannerPage />} />
           <Route path="costing" element={<CostingPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="quality" element={<QualityPage />} />
          <Route path="hse" element={<HSEPage />} />
          <Route path="procurement" element={<ProcurementPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="site" element={<SitePage />} />
          <Route path="snags" element={<SnagsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="risk" element={<RiskPage />} />
          <Route path="risk-trends" element={<RiskTrendPage />} />
          <Route path="external-review" element={<ExternalReviewDashboard />} />
          <Route path="design-reports" element={<DesignReportsPage />} />
          <Route path="pmo-weekly-report" element={<PMOWeeklyReportPage />} />
          <Route path="business-intelligence" element={<BusinessIntelligencePage />} />
          <Route path="project-packages" element={<ProjectPackagesPage />} />
          <Route path="project-controls" element={<ProjectControlsPage />} />
          <Route path="schedule-revisions" element={<ScheduleRevisionsPage />} />
          <Route path="handover" element={<HandoverPage />} />
         
          <Route path="team" element={<TeamPage />} />
          <Route
            path="internal-assignments"
            element={<InternalAssignmentsPage />}
          />
          <Route path="team-access" element={<TeamAccessPage />} />
          <Route path="reports" element={<ReportsPage />} />
          
         
        </Route>
        <Route path="studio" element={<StudioLayout />}>
  <Route index element={<StudioHome />} />

  <Route
    path="intelligence"
    element={<StudioIntelligencePage />}
  />

  <Route
    path="project-state"
    element={<StudioProjectStatePage />}
  />

  <Route
    path="recovery-validator"
    element={<StudioPlaceholderPage />}
  />

  <Route
    path="project-twin"
    element={<StudioPlaceholderPage />}
  />

  <Route
    path="portfolio-simulator"
    element={<StudioPlaceholderPage />}
  />

  <Route
    path="scenario-builder"
    element={<StudioPlaceholderPage />}
  />

  <Route
    path="executive-preview"
    element={<StudioPlaceholderPage />}
  />

  <Route
    path="ai-preview"
    element={<StudioPlaceholderPage />}
  />

  <Route
    path="events"
    element={<StudioPlaceholderPage />}
  />

  <Route
    path="performance"
    element={<StudioPlaceholderPage />}
  />

  <Route
    path="permissions"
    element={<StudioPlaceholderPage />}
  />

  <Route
    path="design-system"
    element={<StudioPlaceholderPage />}
  />

  <Route
    path="database"
    element={<StudioPlaceholderPage />}
  />
</Route>


        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
