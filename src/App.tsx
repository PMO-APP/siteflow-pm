import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useThemeStore } from '@/store/theme'
import ThemeProvider from '@/theme/ThemeProvider'

import RequireRole from '@/components/auth/RequireRole'
import Layout from '@/components/layout/Layout'
import NotificationProvider from './components/ui/notifications/NotificationProvider'
import EventInfrastructureProvider from '@/components/events/EventInfrastructureProvider'
import { WorkspaceProvider } from '@/workspace/WorkspaceProvider'

const LandingPage = lazy(() => import('@/pages/LandingPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))
const AcceptInvitePage = lazy(() => import('@/pages/AcceptInvitePage'))
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const WorkspaceAdminPage = lazy(() => import('@/pages/WorkspaceAdminPage'))
const AuditPage = lazy(() => import('@/pages/AuditPage'))
const PortfolioDashboardPage = lazy(() => import('@/pages/PortfolioDashboardPage'))
const PlannerPage = lazy(() => import('@/pages/PlannerPage'))
const CostingPage = lazy(() => import('@/pages/CostingPage'))
const DesignReportsPage = lazy(() => import('@/pages/DesignReportsPage'))
const PMOWeeklyReportPage = lazy(() => import('@/pages/PMOWeeklyReportPage'))
const ProjectPackagesPage = lazy(() => import('@/pages/ProjectPackagesPage'))
const HandoverPage = lazy(() => import('@/pages/HandoverPage'))
const AdministrationPage = lazy(() => import('@/pages/AdministrationPage'))
const CreateOrganizationPage = lazy(() => import('@/features/organizations/pages/CreateOrganizationPage'))
const OrganizationDetailPage = lazy(() => import('@/features/organizations/pages/OrganizationDetailPage'))
const CommandCenterDashboard = lazy(() => import('@/pages/CommandCenterDashboard'))
const BusinessIntelligencePage = lazy(() => import('@/pages/BusinessIntelligencePage'))
const StudioLayout = lazy(() => import('@/studio/layout/StudioLayout'))
const StudioHome = lazy(() => import('@/studio/pages/StudioHome'))
const StudioIntelligencePage = lazy(() => import('@/studio/pages/StudioIntelligencePage'))
const StudioProjectStatePage = lazy(() => import('@/studio/pages/StudioProjectStatePage'))
const StudioPlaceholderPage = lazy(() => import('@/studio/pages/StudioPlaceholderPage'))
const SchedulePage = lazy(() => import('@/pages/SchedulePage'))
const QualityPage = lazy(() => import('@/pages/QualityPage'))
const HSEPage = lazy(() => import('@/pages/HSEPage'))
const ProcurementPage = lazy(() => import('@/pages/ProcurementPage'))
const ApprovalsPage = lazy(() => import('@/pages/ApprovalsPage'))
const SitePage = lazy(() => import('@/pages/SitePage'))
const SnagsPage = lazy(() => import('@/pages/SnagsPage'))
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'))
const RiskPage = lazy(() => import('@/pages/RiskPage'))
const RiskTrendPage = lazy(() => import('@/pages/RiskTrendPage'))
const TeamPage = lazy(() => import('@/pages/TeamPage'))
const InternalAssignmentsPage = lazy(() => import('@/pages/InternalAssignmentsPage'))
const MyAssignmentsPage = lazy(() => import('@/pages/MyAssignmentsPage'))
const TeamAccessPage = lazy(() => import('@/pages/TeamAccessPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const RecoveryForecastPage = lazy(() => import('@/pages/RecoveryForecastPage'))
const ProjectControlsPage = lazy(() => import('@/pages/ProjectControlsPage'))
const ScheduleRevisionsPage = lazy(() => import('@/pages/ScheduleRevisionsPage'))
const OrganizationsPage = lazy(() => import('@/features/organizations/pages/OrganizationsPage'))
const CreateRFIPage = lazy(() => import('@/features/rfi/pages/CreateRFIPage'))
const RFIDetailPage = lazy(() => import('@/features/rfi/pages/RFIDetailPage'))
const RFIRegisterPage = lazy(() => import('@/features/rfi/pages/RFIRegisterPage'))
const WorkspaceSettingsPage = lazy(() => import('@/pages/WorkspaceSettingsPage'))
const CustomerAdministrationPage = lazy(() => import('@/pages/CustomerAdministrationPage'))






















































function RouteFallback() {
  return (
    <div
      className="route-loading"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="route-loading__mark" aria-hidden="true">P</div>
      <div>
        <div className="route-loading__title">Loading workspace</div>
        <div className="route-loading__copy">Preparing the latest project information…</div>
      </div>
    </div>
  )
}

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
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fa]">
        <div className="rounded-3xl border border-[#dbe5eb] bg-white px-10 py-8 text-center shadow-[0_24px_70px_rgba(23,63,95,.10)]">
          <div className="mx-auto mb-4 h-11 w-11 rounded-2xl bg-[#173f5f] grid place-items-center text-white font-black relative overflow-hidden">
            <span className="absolute inset-x-0 top-0 h-[3px] bg-[#ef8354]" />P
          </div>
          <div className="font-display text-2xl font-extrabold text-[#173f5f] mb-2">PMOCorex</div>
          <div className="text-[#71838d] text-sm">Preparing your delivery workspace…</div>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

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
  const { setTheme } = useThemeStore()

  useEffect(() => {
    // PMOCorex now uses one unified light visual system across public and authenticated pages.
    setTheme('light')
    document.documentElement.dataset.productTheme = 'pmocorex'
  }, [setTheme])

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

    if (error) {
      console.error('Membership loading failed:', error)
      clearMembership()
      return
    }

    if (!memberships || memberships.length === 0) {
      clearMembership()
      return
    }

    const selectedMembership =
      memberships.find(
        membership => membership.access_scope === 'workspace'
      ) ??
      memberships.find(
        membership => membership.access_scope === 'portfolio'
      ) ??
      memberships.find(
        membership => membership.access_scope === 'project'
      ) ??
      memberships[0]

    const projectIds = Array.from(
      new Set(
        memberships
          .filter(
            membership =>
              membership.access_scope === 'project' &&
              membership.project_id !== null &&
              membership.project_id !== undefined
          )
          .map(membership => membership.project_id)
      )
    )

    setMembership({
      role: selectedMembership.role,
      accessScope: selectedMembership.access_scope,
      portfolioId: selectedMembership.portfolio_id ?? null,
      projectId: selectedMembership.project_id ?? null,
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
    <ThemeProvider>
      <NotificationProvider>
        <WorkspaceProvider>
        <EventInfrastructureProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/pricing" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signin" element={<Navigate to="/login" replace />} />
        <Route path="/signup" element={<Navigate to="/" replace />} />

        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/mixta-admin-login" element={<Navigate to="/login" replace />} />
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
              <PortfolioDashboardPage />
            </RequireAuth>
          }
        />

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
              <RequireRole allowedRoles={['workspace_admin', 'admin', 'pmo']}>
                <WorkspaceAdminPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        <Route
          path="/admin/audit"
          element={
            <RequireAuth>
              <RequireRole allowedRoles={['workspace_admin', 'admin', 'pmo']}>
                <AuditPage />
              </RequireRole>
            </RequireAuth>
          }
        />


        <Route
          path="/app"
          element={
            <RequireAuth>
              <ViewerRoute>
                <Layout />
              </ViewerRoute>
            </RequireAuth>
          }
        >
          <Route index element={<CommandCenterDashboard />} />
    <Route
  path="administration"
  element={
    <RequireRole allowedRoles={['workspace_admin', 'admin', 'pmo']}>
      <AdministrationPage />
    </RequireRole>
  }
/>

<Route
  path="administration/organizations"
  element={
    <RequireRole allowedRoles={['workspace_admin', 'admin', 'pmo']}>
      <OrganizationsPage />
    </RequireRole>
  }
/>

<Route
  path="administration/organizations/new"
  element={
    <RequireRole allowedRoles={['workspace_admin', 'admin', 'pmo']}>
      <CreateOrganizationPage />
    </RequireRole>
  }
/>

<Route
  path="administration/organizations/:organizationId"
  element={
    <RequireRole allowedRoles={['workspace_admin', 'admin', 'pmo']}>
      <OrganizationDetailPage />
    </RequireRole>
  }
/>

<Route
  path="administration/audit"
  element={
    <RequireRole allowedRoles={['workspace_admin', 'admin', 'pmo']}>
      <AuditPage />
    </RequireRole>
  }
/>


<Route
  path="administration/customer"
  element={
    <RequireRole allowedRoles={['workspace_admin', 'admin', 'pmo']}>
      <CustomerAdministrationPage />
    </RequireRole>
  }
/>

<Route
  path="administration/workspaces"
  element={
    <RequireRole allowedRoles={['workspace_admin', 'admin', 'pmo']}>
      <WorkspaceSettingsPage />
    </RequireRole>
  }
/>

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
          <Route path="rfis" element={<RFIRegisterPage />} />
          <Route path="rfis/new" element={<CreateRFIPage />} />
          <Route path="rfis/:rfiId" element={<RFIDetailPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="risk" element={<RiskPage />} />
          <Route path="risk-trends" element={<RiskTrendPage />} />
          <Route path="design-reports" element={<DesignReportsPage />} />
          <Route path="pmo-weekly-report" element={<PMOWeeklyReportPage />} />
          <Route
            path="business-intelligence"
            element={<BusinessIntelligencePage />}
          />
          <Route path="project-packages" element={<ProjectPackagesPage />} />
          <Route path="project-controls" element={<ProjectControlsPage />} />
          <Route
            path="schedule-revisions"
            element={<ScheduleRevisionsPage />}
          />
          <Route path="handover" element={<HandoverPage />} />
          <Route path="internal-assignments" element={<InternalAssignmentsPage />} />
          <Route path="my-assignments" element={<MyAssignmentsPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="team-access" element={<TeamAccessPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        <Route
          path="/studio"
          element={
            <RequireAuth>
              <StudioLayout />
            </RequireAuth>
          }
        >
          <Route index element={<StudioHome />} />
          <Route path="intelligence" element={<StudioIntelligencePage />} />
          <Route path="project-state" element={<StudioProjectStatePage />} />
          <Route path="recovery-validator" element={<StudioPlaceholderPage />} />
          <Route path="project-twin" element={<StudioPlaceholderPage />} />
          <Route path="portfolio-simulator" element={<StudioPlaceholderPage />} />
          <Route path="scenario-builder" element={<StudioPlaceholderPage />} />
          <Route path="executive-preview" element={<StudioPlaceholderPage />} />
          <Route path="ai-preview" element={<StudioPlaceholderPage />} />
          <Route path="events" element={<StudioPlaceholderPage />} />
          <Route path="performance" element={<StudioPlaceholderPage />} />
          <Route path="permissions" element={<StudioPlaceholderPage />} />
          <Route path="design-system" element={<StudioPlaceholderPage />} />
          <Route path="database" element={<StudioPlaceholderPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
          </Suspense>
        </BrowserRouter>
        </EventInfrastructureProvider>
        </WorkspaceProvider>
      </NotificationProvider>
    </ThemeProvider>
  )
}
