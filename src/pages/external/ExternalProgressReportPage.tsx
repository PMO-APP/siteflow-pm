import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ClipboardCheck,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useExternalProjectStore } from '@/store/externalProject'
import { notifyUsers } from '@/lib/notifications'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

export default function ExternalProgressReportPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()

  const {
    externalProjectId,
    externalProjectName,
    setExternalProject,
  } = useExternalProjectStore()

  const projectFromUrl = searchParams.get('project')
  const activeProjectId = externalProjectId || Number(projectFromUrl) || null

  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [progressSummary, setProgressSummary] = useState('')
  const [activitiesCompleted, setActivitiesCompleted] = useState('')
  const [activitiesOngoing, setActivitiesOngoing] = useState('')
  const [plannedActivities, setPlannedActivities] = useState('')
  const [manpower, setManpower] = useState('')
  const [equipment, setEquipment] = useState('')
  const [issuesRisks, setIssuesRisks] = useState('')

  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    syncProjectFromUrl()
  }, [projectFromUrl])

  useEffect(() => {
    loadReports()
  }, [activeProjectId, user?.email])

  async function syncProjectFromUrl() {
    if (!projectFromUrl) return

    const projectId = Number(projectFromUrl)

    if (!projectId || externalProjectId === projectId) return

    const { data } = await supabase
      .from('projects')
      .select('id, project_name')
      .eq('id', projectId)
      .maybeSingle()

    if (data) {
      setExternalProject(data.id, data.project_name)
    }
  }

  async function loadReports() {
    if (!activeProjectId || !user?.email) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('external_progress_reports')
      .select('*')
      .eq('project_id', activeProjectId)
      .eq('submitted_by_email', user.email)
      .order('created_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      setLoading(false)
      return
    }

    setReports(data || [])
    setLoading(false)
  }

  async function submitReport() {
    setNotice('')

    if (!activeProjectId) {
      setNotice('Please select a project from the External Portal first.')
      return
    }

    if (!progressSummary.trim()) {
      setNotice('Progress summary is required.')
      return
    }

    setSubmitting(true)

    const cleanSummary = progressSummary.trim()

    const { error } = await supabase
      .from('external_progress_reports')
      .insert({
        project_id: activeProjectId,
        submitted_by: user?.full_name || user?.email || 'External User',
        submitted_by_email: user?.email || '',
        report_date: reportDate,
        progress_summary: cleanSummary,
        activities_completed: activitiesCompleted.trim() || null,
        activities_ongoing: activitiesOngoing.trim() || null,
        planned_activities: plannedActivities.trim() || null,
        manpower: manpower ? Number(manpower) : null,
        equipment: equipment.trim() || null,
        issues_risks: issuesRisks.trim() || null,
        status: 'Submitted',
      })

    if (error) {
      setNotice(error.message)
      setSubmitting(false)
      return
    }

    await notifyUsers({
      projectId: activeProjectId,
      recipientRole: 'pmo',
      type: 'progress_report',
      title: 'New External Progress Report Submitted',
      message: `${
        user?.full_name || user?.email || 'External user'
      } submitted a progress report: ${cleanSummary}`,
      sendEmail: true,
      emailPayload: {
        to: ['e.bio-ibogomo@mixtafrica.com'],
        subject: `New Progress Report Submitted: ${externalProjectName || 'Project'}`,
        type: 'Progress Report',
        projectName: externalProjectName || 'Selected Project',
        submittedBy: user?.full_name || user?.email || 'External User',
        submittedByEmail: user?.email || '',
        message: [
          `Date: ${reportDate}`,
          `Summary: ${cleanSummary}`,
          activitiesCompleted
            ? `Completed: ${activitiesCompleted}`
            : '',
          activitiesOngoing
            ? `Ongoing: ${activitiesOngoing}`
            : '',
          plannedActivities
            ? `Planned: ${plannedActivities}`
            : '',
          manpower ? `Manpower: ${manpower}` : '',
          equipment ? `Equipment: ${equipment}` : '',
          issuesRisks ? `Issues/Risks: ${issuesRisks}` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
        reviewUrl: `${window.location.origin}/app/external-review`,
      },
    })

    setProgressSummary('')
    setActivitiesCompleted('')
    setActivitiesOngoing('')
    setPlannedActivities('')
    setManpower('')
    setEquipment('')
    setIssuesRisks('')

    setNotice(
      'Progress report submitted successfully. The internal team has been notified.'
    )
    setSubmitting(false)

    await loadReports()
  }

  return (
    <div className="min-h-dvh bg-[#0c1014] text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <PMOCorexLogo size={42} />

          <button
            onClick={() => navigate('/external-project')}
            className="btn btn-ghost"
          >
            <ArrowLeft size={15} />
            External Portal
          </button>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-8">
          <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
            Progress Reporting
          </div>

          <h1 className="text-4xl font-black">
            Submit Progress Update
          </h1>

          <p className="text-slate-400 mt-4">
            Submit daily or weekly site updates for the selected project only.
          </p>

          <div className="mt-4 text-sm text-slate-500">
            Current Project:{' '}
            <span className="text-[#c49e48]">
              {externalProjectName || 'No project selected'}
            </span>
          </div>
        </section>

        {notice && (
          <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm">
            {notice}
          </div>
        )}

        {!activeProjectId && (
          <div className="card p-6 text-center">
            <p className="text-slate-400">
              Please select a project before submitting progress reports.
            </p>

            <button
              onClick={() => navigate('/external-project')}
              className="btn btn-gold mt-4"
            >
              Select Project
            </button>
          </div>
        )}

        {activeProjectId && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="card p-6 xl:col-span-1">
              <div className="flex items-center gap-2 mb-5">
                <ClipboardCheck
                  size={18}
                  className="text-[#c49e48]"
                />

                <h2 className="font-bold text-lg">
                  New Progress Report
                </h2>
              </div>

              <div className="space-y-3">
                <input
                  type="date"
                  className="form-control"
                  value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                />

                <textarea
                  className="form-control min-h-[100px]"
                  placeholder="Progress Summary"
                  value={progressSummary}
                  onChange={e => setProgressSummary(e.target.value)}
                />

                <textarea
                  className="form-control"
                  placeholder="Activities Completed"
                  value={activitiesCompleted}
                  onChange={e => setActivitiesCompleted(e.target.value)}
                />

                <textarea
                  className="form-control"
                  placeholder="Activities Ongoing"
                  value={activitiesOngoing}
                  onChange={e => setActivitiesOngoing(e.target.value)}
                />

                <textarea
                  className="form-control"
                  placeholder="Planned Activities"
                  value={plannedActivities}
                  onChange={e => setPlannedActivities(e.target.value)}
                />

                <input
                  className="form-control"
                  placeholder="Manpower"
                  value={manpower}
                  onChange={e => setManpower(e.target.value)}
                />

                <textarea
                  className="form-control"
                  placeholder="Equipment on Site"
                  value={equipment}
                  onChange={e => setEquipment(e.target.value)}
                />

                <textarea
                  className="form-control"
                  placeholder="Issues / Risks"
                  value={issuesRisks}
                  onChange={e => setIssuesRisks(e.target.value)}
                />

                <button
                  onClick={submitReport}
                  disabled={submitting}
                  className="btn btn-gold w-full justify-center"
                >
                  {submitting
                    ? 'Submitting...'
                    : 'Submit Progress Report'}
                </button>
              </div>
            </div>

            <div className="xl:col-span-2 space-y-4">
              {loading ? (
                <div className="card p-6">
                  Loading reports...
                </div>
              ) : reports.length === 0 ? (
                <div className="card p-10 text-center">
                  <Calendar
                    size={30}
                    className="mx-auto text-[#c49e48]"
                  />

                  <div className="mt-3 text-lg font-bold">
                    No reports submitted yet
                  </div>

                  <div className="text-slate-500 mt-2">
                    Submitted progress reports for this selected project will
                    appear here.
                  </div>
                </div>
              ) : (
                reports.map(report => (
                  <div
                    key={report.id}
                    className="card p-5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-lg">
                          {report.progress_summary}
                        </div>

                        <div className="text-sm text-slate-500 mt-1">
                          {report.report_date}
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                        <AlertTriangle size={12} />
                        {report.status}
                      </span>
                    </div>

                    <div className="mt-4 text-sm text-slate-400 whitespace-pre-wrap">
                      {report.activities_completed}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
