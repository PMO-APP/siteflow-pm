import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useThemeStore } from '@/store/theme'
import ThemeProvider from '@/theme/ThemeProvider'

import RequirePermission from '@/components/auth/RequirePermission'
import Layout from '@/components/layout/Layout'
import NotificationProvider from './components/ui/notifications/NotificationProvider'
import EventInfrastructureProvider from '@/components/events/EventInfrastructureProvider'
import { WorkspaceProvider } from '@/workspace/WorkspaceProvider'
import AccessSessionProvider from '@/access/AccessSessionProvider'

const LandingPage = lazy(() => import('@/pages/LandingPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))
const AcceptInvitePage = lazy(() => import('@/pages/AcceptInvitePage'))
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const WorkspaceAdminPage = lazy(() => import('@/pages/WorkspaceAdminPage'))
const AuditPage = lazy(() => import('@/pages/AuditPage'))
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
const IPDReportsPage = lazy(() => import('@/pages/IPDReportsPage'))
const IPDReportsHubPage = lazy(() => import('@/pages/IPDReportsHubPage'))
const PMOReportsHubPage = lazy(() => import('@/pages/PMOReportsHubPage'))
const RecoveryForecastPage = lazy(() => import('@/pages/RecoveryForecastPage'))
const ProjectControlsPage = lazy(() => import('@/pages/ProjectControlsPage'))
const ProjectJourneyPage = lazy(() => import('@/pages/ProjectJourneyPage'))
const ScheduleRevisionsPage = lazy(() => import('@/pages/ScheduleRevisionsPage'))
const OrganizationsPage = lazy(() => import('@/features/organizations/pages/OrganizationsPage'))
const CreateRFIPage = lazy(() => import('@/features/rfi/pages/CreateRFIPage'))
const RFIDetailPage = lazy(() => import('@/features/rfi/pages/RFIDetailPage'))
const RFIRegisterPage = lazy(() => import('@/features/rfi/pages/RFIRegisterPage'))
const WorkspaceSettingsPage = lazy(() => import('@/pages/WorkspaceSettingsPage'))
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'))
const ExecutiveReportingPage = lazy(() => import('@/pages/ExecutiveReportingPage'))
const ExecutiveDashboardPage = lazy(() => import('@/pages/ExecutiveDashboardPage'))
const ExecutiveNarrativePage = lazy(() => import('@/pages/ExecutiveNarrativePage'))
const ReportDesignerPage = lazy(() => import('@/pages/ReportDesignerPage'))
const ReportDistributionPage = lazy(() => import('@/pages/ReportDistributionPage'))
const BoardroomPage = lazy(() => import('@/pages/BoardroomPage'))
const CustomerAdministrationPage = lazy(() => import('@/pages/CustomerAdministrationPage'))






















































function RouteFallback() {
  return (
    <div
      className="route-loading"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <img className="route-loading__mark" src="/brand/pmocorex-mark.svg" alt="" aria-hidden="true" />
      <div>
        <div className="route-loading__title">Loading workspace</div>
        <div className="route-loading__copy">Preparing the latest project information…</div>
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fa]">
        <div className="rounded-3xl border border-[#dbe5eb] bg-white px-10 py-8 text-center shadow-[0_24px_70px_rgba(23,63,95,.10)]">
          <img src="/brand/pmocorex-mark.svg" alt="PMOCorex" className="mx-auto mb-4 h-11 w-11 object-contain" />
          <div className="font-display text-2xl font-extrabold text-[#173f5f] mb-2">PMOCorex</div>
          <div className="text-[#71838d] text-sm">Preparing your delivery workspace…</div>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}

export default function App() {
  const { setUser, setLoading } = useAuthStore()
  const { clearMembership } = useMembershipStore()
  const { setTheme } = useThemeStore()

  useEffect(() => {
    // PMOCorex now uses one unified light visual system across public and authenticated pages.
    setTheme('light')
    document.documentElement.dataset.productTheme = 'pmocorex'
  }, [setTheme])


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
        setLoading(false)
      }, 0)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setUser, setLoading, clearMembership])

  return (
    <ThemeProvider>
      <NotificationProvider>
        <WorkspaceProvider>
        <AccessSessionProvider>
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
          element={<Navigate to="/executive-dashboard" replace />}
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
          path="/executive-dashboard"
          element={
            <RequireAuth>
              <RequirePermission action="reports.view">
                <ExecutiveDashboardPage />
              </RequirePermission>
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequirePermission action="workspace.manage">
                <WorkspaceAdminPage />
              </RequirePermission>
            </RequireAuth>
          }
        />

        <Route
          path="/admin/audit"
          element={
            <RequireAuth>
              <RequirePermission action="workspace.manage">
                <AuditPage />
              </RequirePermission>
            </RequireAuth>
          }
        />


        <Route
          path="/app"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<CommandCenterDashboard />} />
    <Route
  path="administration"
  element={
    <RequirePermission action="workspace.manage">
      <AdministrationPage />
    </RequirePermission>
  }
/>

<Route
  path="administration/organizations"
  element={
    <RequirePermission action="workspace.manage">
      <OrganizationsPage />
    </RequirePermission>
  }
/>

<Route
  path="administration/organizations/new"
  element={
    <RequirePermission action="workspace.manage">
      <CreateOrganizationPage />
    </RequirePermission>
  }
/>

<Route
  path="administration/organizations/:organizationId"
  element={
    <RequirePermission action="workspace.manage">
      <OrganizationDetailPage />
    </RequirePermission>
  }
/>

<Route
  path="administration/audit"
  element={
    <RequirePermission action="workspace.manage">
      <AuditPage />
    </RequirePermission>
  }
/>


<Route
  path="administration/customer"
  element={
    <RequirePermission action="workspace.manage">
      <CustomerAdministrationPage />
    </RequirePermission>
  }
/>

<Route
  path="administration/workspaces"
  element={
    <RequirePermission action="workspace.manage">
      <WorkspaceSettingsPage />
    </RequirePermission>
  }
/>

          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="executive-dashboard" element={<Navigate to="/executive-dashboard" replace />} />
          <Route path="executive-narrative" element={<ExecutiveNarrativePage />} />
          <Route path="report-designer" element={<ReportDesignerPage />} />
          <Route path="report-distribution" element={<ReportDistributionPage />} />
          <Route path="boardroom" element={<BoardroomPage />} />



          <Route path="executive-reporting" element={<ExecutiveReportingPage />} />

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
          <Route path="project-journey" element={<ProjectJourneyPage />} />
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
          <Route path="reports/ipd" element={<IPDReportsHubPage />} />
          <Route path="reports/ipd/:discipline" element={<IPDReportsPage />} />
          <Route path="reports/pmo" element={<PMOReportsHubPage />} />
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
        </AccessSessionProvider>
        </WorkspaceProvider>
      </NotificationProvider>
    </ThemeProvider>
  )
}
