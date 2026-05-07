import ProfilePage from '@/pages/ProfilePage'
import SettingsPage from '@/pages/SettingsPage'
import AcceptInvitePage from '@/pages/AcceptInvitePage'
import TeamAccessPage from '@/pages/TeamAccessPage'
import PricingPage from '@/pages/PricingPage'
import LandingPage from '@/pages/LandingPage'
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
import SignUpPage from '@/pages/SignUpPage'
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
import { getRole } from '@/lib/access'

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

  if (!user) return <Navigate to="/login" replace />

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
  const { user, setUser, setLoading } = useAuthStore()
  const role = getRole(user?.email)

  useEffect(() => {
  async function loadUser() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error) {
        console.error('Profile error:', error)
      }

      setUser({
        ...session.user,
        ...(profile || {}),
        email: profile?.email || session.user.email,
        full_name: profile?.full_name || 'Admin',
        role: profile?.role || 'admin',
      } as any)
    } catch (err) {
      console.error('Auth load error:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  loadUser()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    try {
      if (!session?.user) {
        setUser(null)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      setUser({
        ...session.user,
        ...(profile || {}),
        email: profile?.email || session.user.email,
        full_name: profile?.full_name || 'Admin',
        role: profile?.role || 'admin',
      } as any)
    } catch (err) {
      console.error('Auth change error:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  })

  return () => {
    subscription.unsubscribe()
  }
}, [setUser, setLoading])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signin" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />

        <Route
          path="/projects"
          element={
            <RequireAuth>
              <ProjectsPage />
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
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />

          {role === 'admin' && (
            <Route path="audit" element={<AuditPage />} />
          )}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
