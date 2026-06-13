import { useEffect, useState } from 'react'
import {
  ClipboardList,
  FileText,
  FolderUp,
  MessageSquare,
  UploadCloud,
  CheckCircle,
  LogOut,
  FolderKanban,
  Bell,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useExternalProjectStore } from '@/store/externalProject'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'
import ExternalNotificationsPanel from '@/components/external/ExternalNotificationsPanel'

export default function ExternalProjectPortal() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()

  const role = useMembershipStore(state => state.role)
  const organizationId = useMembershipStore(state => state.organizationId)

  const {
    externalProjectId,
    externalProjectName,
    setExternalProject,
    clearExternalProject,
  } = useExternalProjectStore()

  const [organizationName, setOrganizationName] = useState('')
  const [assignedProjects, setAssignedProjects] = useState<any[]>([])
  const [loadingContext, setLoadingContext] = useState(true)
  const [notifsOpen, setNotifsOpen] = useState(false)

  useEffect(() => {
    loadPortalContext()
  }, [user?.email, organizationId])

  async function loadPortalContext() {
    setLoadingContext(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const currentUser = sessionData.session?.user

    if (!currentUser?.email) {
      setLoadingContext(false)
      return
    }

    const cleanEmail = currentUser.email.toLowerCase().trim()

    const { data: membershipRows } = await supabase
      .from('memberships')
      .select('*')
      .or(`user_id.eq.${currentUser.id},email.eq.${cleanEmail}`)

    const memberships = membershipRows || []
    const orgId = memberships[0]?.organization_id || organizationId || null

    if (orgId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .maybeSingle()

      setOrganizationName(org?.name || '')
    }

    const projectIds = [
      ...new Set(
        memberships
          .filter(item => item.access_scope === 'project')
          .map(item => item.project_id)
          .filter(Boolean)
      ),
    ]

    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, project_name, location')
        .in('id', projectIds)
        .order('project_name')

      const cleanProjects = projects || []
      setAssignedProjects(cleanProjects)

      const currentProjectStillValid = cleanProjects.some(
        project => project.id === externalProjectId
      )

      if (!externalProjectId || !currentProjectStillValid) {
        const firstProject = cleanProjects[0]

        if (firstProject) {
          setExternalProject(firstProject.id, firstProject.project_name)
        }
      }
    } else {
      setAssignedProjects([])
      clearExternalProject()
    }

    setLoadingContext(false)
  }

  function handleProjectChange(projectId: string) {
    const selectedProject = assignedProjects.find(
      project => String(project.id) === String(projectId)
    )

    if (!selectedProject) return

    setExternalProject(selectedProject.id, selectedProject.project_name)
  }

  function openExternalPage(path: string) {
    if (!externalProjectId) return

    navigate(`${path}?project=${externalProjectId}`)
  }

  const organizationLabel = organizationName || 'your organization'
  const projectLabel =
    externalProjectName ||
    (assignedProjects.length === 0 ? 'No project assigned' : 'Select project')

  return (
    <div className="min-h-dvh bg-[#0c1014] text-white">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <PMOCorexLogo size={42} />

          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setNotifsOpen(current => !current)}
              className="btn btn-ghost relative"
            >
              <Bell size={15} />
            </button>

            {notifsOpen && (
              <div className="absolute right-0 top-12 z-40 w-80">
                <ExternalNotificationsPanel
                  onClose={() => setNotifsOpen(false)}
                />
              </div>
            )}

            <button
              onClick={() => navigate('/profile')}
              className="btn btn-ghost"
            >
              Profile
            </button>

            <button onClick={signOut} className="btn btn-ghost">
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-8">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#c49e48]/10 blur-3xl" />

          <div className="relative max-w-3xl">
            <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
              External Project Portal
            </div>

            <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
              Welcome, {user?.full_name || user?.email || 'Partner'}
            </h1>

            <p className="text-slate-400 mt-4 max-w-2xl">
              Submit updates, upload documents, respond to assigned tasks, and
              communicate with the {organizationLabel} project team.
            </p>

            <div className="mt-5 text-sm text-slate-500">
              Role:{' '}
              <span className="text-[#c49e48]">
                {role || 'External User'}
              </span>{' '}
              • Current Project:{' '}
              <span className="text-[#c49e48]">
                {loadingContext ? 'Loading…' : projectLabel}
              </span>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FolderKanban size={18} className="text-[#c49e48]" />

            <div>
              <h2 className="text-lg font-bold text-[#ede8de]">
                Select Project
              </h2>

              <p className="text-xs text-slate-500">
                Choose the project you want to submit updates, RFIs, documents,
                or task responses for.
              </p>
            </div>
          </div>

          {loadingContext ? (
            <div className="text-sm text-slate-500">
              Loading assigned projects…
            </div>
          ) : assignedProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">
              No project has been assigned to your account. Contact the project
              administrator.
            </div>
          ) : (
            <select
              className="form-control"
              value={externalProjectId || ''}
              onChange={e => handleProjectChange(e.target.value)}
            >
              {assignedProjects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_name}
                  {project.location ? ` — ${project.location}` : ''}
                </option>
              ))}
            </select>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <PortalCard
            icon={ClipboardList}
            title="My Assigned Tasks"
            description="View and update tasks assigned to your company or project role."
            disabled={!externalProjectId}
            onClick={() => openExternalPage('/external-project/tasks')}
          />

          <PortalCard
            icon={UploadCloud}
            title="Submit Progress Update"
            description="Send daily or weekly progress updates for internal review."
            disabled={!externalProjectId}
            onClick={() =>
              openExternalPage('/external-project/progress-report')
            }
          />

          <PortalCard
            icon={FolderUp}
            title="Upload Documents"
            description="Upload drawings, reports, photos, certificates, or supporting files."
            disabled={!externalProjectId}
            onClick={() => openExternalPage('/external-project/documents')}
          />

          <PortalCard
            icon={FileText}
            title="Upload Report"
            description="Submit site reports, inspection notes, method statements, or progress reports."
            disabled={!externalProjectId}
            onClick={() =>
              openExternalPage('/external-project/progress-report')
            }
          />

          <PortalCard
            icon={MessageSquare}
            title="Comments / RFIs"
            description="Raise questions, respond to comments, or submit RFIs to the project team."
            disabled={!externalProjectId}
            onClick={() => openExternalPage('/external-project/rfis')}
          />

          <PortalCard
            icon={CheckCircle}
            title="Submission Status"
            description="Track whether your submitted items are pending, reviewed, approved, or rejected."
            disabled={!externalProjectId}
            onClick={() => openExternalPage('/external-project/submissions')}
          />
        </section>
      </div>
    </div>
  )
}

function PortalCard({
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: any
  title: string
  description: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <div
      className={`card p-6 transition ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-[#c49e48]/30'
      }`}
    >
      <div className="h-12 w-12 rounded-2xl border border-[#c49e48]/20 bg-[#c49e48]/10 flex items-center justify-center mb-5">
        <Icon size={22} className="text-[#c49e48]" />
      </div>

      <h2 className="text-lg font-bold text-[#ede8de]">{title}</h2>

      <p className="text-sm text-slate-500 mt-2 leading-relaxed">
        {description}
      </p>

      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className="btn btn-ghost mt-5 w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {disabled ? 'Select Project First' : 'Open'}
      </button>
    </div>
  )
}
