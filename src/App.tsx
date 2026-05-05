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
import SignInPage from '@/pages/SignInPage'
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
import RecoveryForecastPage from './pages/RecoveryForecastPage'
import { getRole } from '@/lib/access'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0c1014]">
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user as any)
      }

      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user as any)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading])

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC LANDING PAGE */}
        <Route path="/" element={<LandingPage />} />

        {/* LOGIN */}
        <Route path="/signin" element={<SignInPage />} />
<Route path="/signup" element={<SignUpPage />} />

        {/* PROJECT HUB */}
        <Route
          path="/projects"
          element={
            <RequireAuth>
              <ProjectsPage />
            </RequireAuth>
          }
        />

        {/* MAIN APP */}
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

          {(role === 'admin' || role === 'project') && (
            <>
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
              <Route path="reports" element={<ReportsPage />} />

              {role === 'admin' && (
                <Route path="audit" element={<AuditPage />} />
              )}
            </>
          )}

          {role === 'design' && (
            <>
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="snags" element={<SnagsPage />} />
              <Route path="risk" element={<RiskPage />} />
            </>
          )}

          {role === 'costing' && (
            <>
              <Route path="financial" element={<FinancialPage />} />
              <Route path="snags" element={<SnagsPage />} />
              <Route path="risk" element={<RiskPage />} />
            </>
          )}
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
