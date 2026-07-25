import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FolderKanban,
  Pencil,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  UserCircle,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'
import {
  canAccessAdminConsole,
  canCreateWorkspaceItems,
  canEditProjectInfo,
  canViewInternalPages,
  isExternalRole,
} from '@/lib/permissions'

const PROJECT_STATUSES = [
  'Planning',
  'Active',
  'On Hold',
  'Inactive',
  'Delayed',
  'Completed',
  'Cancelled',
]

const PROJECT_PHASES = [
  'Concept',
  'Design',
  'Procurement',
  'Mobilization',
  'Execution',
  'Finishing',
  'Testing & Commissioning',
  'Handover',
  'Defects Liability',
  'Closed Out',
]

const INTERNAL_ROLE_LABELS: Record<string, string> = {
  workspace_admin: 'Workspace Admin',
  admin: 'Admin',
  pmo: 'PMO',
  portfolio_manager: 'Portfolio Manager',
  design: 'Design',
  housebuild: 'Housebuild',
  costing: 'Costing',
  infrastructure: 'Infrastructure',
  mep: 'MEP',
  hse: 'HSE',
  hse_lead: 'HSE Lead',
  hse_manager: 'HSE Manager',
  viewer: 'Viewer',
  guest: 'Guest',
  consultant: 'Consultant',
  contractor: 'Contractor',
  vendor: 'Vendor',
  subcontractor: 'Subcontractor',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [memberships, setMemberships] = useState<any[]>([])
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)

  const [canAccessAdmin, setCanAccessAdmin] = useState(false)
  const [canCreateItems, setCanCreateItems] = useState(false)
  const [canEditProjects, setCanEditProjects] = useState(false)

  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showPortfolioModal, setShowPortfolioModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)

  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectStatus, setNewProjectStatus] = useState('Planning')
  const [newProjectPhase, setNewProjectPhase] = useState('Concept')
  const [newPortfolioName, setNewPortfolioName] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<number | ''>('')
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | ''>('')

  const [newOverallOwnerEmail, setNewOverallOwnerEmail] = useState('')
  const [newHousebuildOwnerEmail, setNewHousebuildOwnerEmail] = useState('')
  const [newMepOwnerEmail, setNewMepOwnerEmail] = useState('')
  const [newInfrastructureOwnerEmail, setNewInfrastructureOwnerEmail] = useState('')

  const [editProjectName, setEditProjectName] = useState('')
  const [editProjectStatus, setEditProjectStatus] = useState('Planning')
  const [editProjectPhase, setEditProjectPhase] = useState('Concept')
  const [editProjectLocation, setEditProjectLocation] = useState('')
  const [editProjectHandoverDate, setEditProjectHandoverDate] = useState('')
  const [editOverallOwnerEmail, setEditOverallOwnerEmail] = useState('')
  const [editHousebuildOwnerEmail, setEditHousebuildOwnerEmail] = useState('')
  const [editMepOwnerEmail, setEditMepOwnerEmail] = useState('')
  const [editInfrastructureOwnerEmail, setEditInfrastructureOwnerEmail] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [portfolioFilter, setPortfolioFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [phaseFilter, setPhaseFilter] = useState('All')

  const navigate = useNavigate()
  const { setProject } = useProjectStore()

  useEffect(() => {
    loadHub()
  }, [])

  async function loadHub() {
    setLoading(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const currentUser = sessionData.session?.user

    if (!currentUser?.email) {
      setLoading(false)
      return
    }

    const cleanEmail = currentUser.email.toLowerCase().trim()
    setCurrentUserEmail(cleanEmail)
    setDisplayName(
      currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.name ||
        cleanEmail.split('@')[0].split(/[._-]/)[0]
    )

    const { data: membershipRows, error: membershipError } = await supabase
      .from('memberships')
      .select('*')
      .or(`user_id.eq.${currentUser.id},email.eq.${cleanEmail}`)

    if (membershipError) {
      alert(membershipError.message)
      setLoading(false)
      return
    }

    const memberRows = membershipRows || []
    setMemberships(memberRows)

    if (memberRows.length === 0) {
      setOrganizations([])
      setPortfolios([])
      setProjects([])
      setCanAccessAdmin(false)
      setCanCreateItems(false)
      setCanEditProjects(false)
      setLoading(false)
      return
    }

    const userRoles = memberRows.map(membership =>
      String(membership.role || '').toLowerCase().trim()
    )

    const isInternalUser = userRoles.some(role => canViewInternalPages(role))
    const isExternalUser = userRoles.some(role => isExternalRole(role))

    setCanAccessAdmin(userRoles.some(role => canAccessAdminConsole(role)))
    setCanCreateItems(userRoles.some(role => canCreateWorkspaceItems(role)))
    setCanEditProjects(userRoles.some(role => canEditProjectInfo(role)))

    const [
      { data: orgs, error: orgError },
      { data: ports, error: portError },
      { data: projs, error: projectError },
    ] = await Promise.all([
      supabase.from('organizations').select('*').order('created_at'),
      supabase.from('portfolios').select('*').order('created_at'),
      supabase.from('projects').select('*').order('id'),
    ])

    if (orgError || portError || projectError) {
      alert(
        orgError?.message ||
          portError?.message ||
          projectError?.message ||
          'Unable to load workspace.'
      )
      setLoading(false)
      return
    }

    if (isInternalUser) {
      setOrganizations(orgs || [])
      setPortfolios(ports || [])
      setProjects(projs || [])
      setLoading(false)
      return
    }

    if (isExternalUser) {
      const allowedProjectIds = memberRows
        .filter(membership => membership.access_scope === 'project')
        .flatMap(membership => [membership.project_id, ...(membership.project_ids || [])])
        .filter(Boolean)

      const visibleProjects = (projs || []).filter(project =>
        allowedProjectIds.includes(project.id)
      )
      const visiblePortfolioIds = [
        ...new Set(visibleProjects.map(project => project.portfolio_id).filter(Boolean)),
      ]
      const visibleOrgIds = [
        ...new Set(visibleProjects.map(project => project.organization_id).filter(Boolean)),
      ]

      setOrganizations((orgs || []).filter(org => visibleOrgIds.includes(org.id)))
      setPortfolios((ports || []).filter(portfolio => visiblePortfolioIds.includes(portfolio.id)))
      setProjects(visibleProjects)
      setLoading(false)
      return
    }

    setOrganizations([])
    setPortfolios([])
    setProjects([])
    setLoading(false)
  }

  function openProject(project: any) {
    setProject(
      Number(project.id),
      project.project_name,
      project.organization_id ?? null,
      project.portfolio_id ?? null,
      project.overall_owner_email ?? null,
      project.housebuild_owner_email ?? null,
      project.mep_owner_email ?? null,
      project.infrastructure_owner_email ?? null
    )
    navigate('/app')
  }

  function openEditProject(project: any) {
    setEditingProject(project)
    setEditProjectName(project.project_name || '')
    setEditProjectStatus(project.status || 'Planning')
    setEditProjectPhase(project.phase || 'Concept')
    setEditProjectLocation(project.location || '')
    setEditProjectHandoverDate(project.handover_date || '')
    setEditOverallOwnerEmail(project.overall_owner_email || '')
    setEditHousebuildOwnerEmail(project.housebuild_owner_email || '')
    setEditMepOwnerEmail(project.mep_owner_email || '')
    setEditInfrastructureOwnerEmail(project.infrastructure_owner_email || '')
    setShowEditProjectModal(true)
  }

  async function updateProject() {
    if (!canEditProjects || !editingProject || !editProjectName.trim()) return

    const { error } = await supabase
      .from('projects')
      .update({
        project_name: editProjectName.trim(),
        status: editProjectStatus,
        phase: editProjectPhase,
        location: editProjectLocation.trim() || null,
        handover_date: editProjectHandoverDate || null,
        overall_owner_email: editOverallOwnerEmail.trim().toLowerCase() || null,
        housebuild_owner_email: editHousebuildOwnerEmail.trim().toLowerCase() || null,
        mep_owner_email: editMepOwnerEmail.trim().toLowerCase() || null,
        infrastructure_owner_email:
          editInfrastructureOwnerEmail.trim().toLowerCase() || null,
      })
      .eq('id', editingProject.id)

    if (error) {
      alert(error.message)
      return
    }

    setEditingProject(null)
    setShowEditProjectModal(false)
    await loadHub()
  }

  async function createPortfolio() {
    if (!canCreateItems || !newPortfolioName.trim() || !selectedOrgId) return

    const { error } = await supabase.from('portfolios').insert({
      name: newPortfolioName.trim(),
      organization_id: selectedOrgId,
    })

    if (error) {
      alert(error.message)
      return
    }

    setNewPortfolioName('')
    setSelectedOrgId('')
    setShowPortfolioModal(false)
    loadHub()
  }

  async function createProject() {
    if (!canCreateItems || !newProjectName.trim()) return

    const { error } = await supabase.from('projects').insert({
      project_name: newProjectName.trim(),
      status: newProjectStatus,
      phase: newProjectPhase,
      organization_id: selectedOrgId || organizations[0]?.id || null,
      portfolio_id: selectedPortfolioId || null,
      overall_owner_email: newOverallOwnerEmail.trim().toLowerCase() || null,
      housebuild_owner_email: newHousebuildOwnerEmail.trim().toLowerCase() || null,
      mep_owner_email: newMepOwnerEmail.trim().toLowerCase() || null,
      infrastructure_owner_email:
        newInfrastructureOwnerEmail.trim().toLowerCase() || null,
    })

    if (error) {
      alert(error.message)
      return
    }

    setNewProjectName('')
    setNewProjectStatus('Planning')
    setNewProjectPhase('Concept')
    setSelectedOrgId('')
    setSelectedPortfolioId('')
    setNewOverallOwnerEmail('')
    setNewHousebuildOwnerEmail('')
    setNewMepOwnerEmail('')
    setNewInfrastructureOwnerEmail('')
    setShowProjectModal(false)
    loadHub()
  }

  const filteredProjects = useMemo(
    () =>
      projects.filter(project => {
        const search = searchTerm.toLowerCase().trim()
        return (
          (!search ||
            String(project.project_name || '').toLowerCase().includes(search) ||
            String(project.location || '').toLowerCase().includes(search)) &&
          (portfolioFilter === 'All' ||
            String(project.portfolio_id || '') === portfolioFilter) &&
          (statusFilter === 'All' ||
            String(project.status || 'Not set') === statusFilter) &&
          (phaseFilter === 'All' || String(project.phase || 'Not set') === phaseFilter)
        )
      }),
    [projects, searchTerm, portfolioFilter, statusFilter, phaseFilter]
  )

  const userRoles = memberships.map(m => String(m.role || '').toLowerCase().trim())
  const workspaceName = organizations[0]?.name || 'Workspace'
  const activeProjects = projects.filter(project => project.status === 'Active').length
  const attentionProjects = projects.filter(project =>
    ['Delayed', 'On Hold'].includes(project.status)
  ).length
  const healthyProjects = projects.filter(project =>
    ['Active', 'Completed'].includes(project.status)
  ).length
  const missingTargets = projects.filter(
    project => !project.handover_date && !['Completed', 'Cancelled'].includes(project.status)
  ).length

  const myAssignedProjects = projects.filter(project => {
    const capacity = resolveProjectCapacity(project, currentUserEmail, userRoles, memberships)
    return capacity !== 'Viewer' && capacity !== 'Guest'
  })

  const greeting = getGreeting()

  return (
    <div className="min-h-dvh bg-[#f5f7fb] text-[#17324d]">
      <header className="sticky top-0 z-30 border-b border-[#dce5ee] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-5 py-4 sm:px-7 lg:px-10">
          <button type="button" onClick={() => navigate('/')} className="text-left">
            <PMOCorexLogo size={40} />
          </button>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/profile')} className="hub-icon-button" title="My profile">
              <UserCircle size={19} />
            </button>
            {canAccessAdmin && (
              <button onClick={() => navigate('/admin')} className="hub-secondary-button hidden sm:inline-flex">
                <Shield size={16} /> Admin Console
              </button>
            )}
            {canCreateItems && (
              <button
                onClick={() => {
                  setSelectedOrgId(organizations[0]?.id || '')
                  setShowProjectModal(true)
                }}
                className="hub-primary-button"
              >
                <Plus size={17} /> New Project
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] space-y-7 px-5 py-7 pb-24 sm:px-7 lg:px-10 lg:py-9">
        <section className="overflow-hidden rounded-[28px] border border-[#d8e4ee] bg-white shadow-[0_18px_60px_rgba(30,67,101,0.08)]">
          <div className="grid lg:grid-cols-[1.3fr_0.7fr]">
            <div className="relative overflow-hidden px-6 py-8 sm:px-9 lg:px-11 lg:py-10">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#f47c55]/10" />
              <div className="absolute right-20 top-8 h-28 w-28 rounded-full border border-[#f47c55]/20" />
              <div className="relative">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f0c8bb] bg-[#fff4ef] px-3 py-1.5 text-xs font-semibold text-[#c95c38]">
                  <CircleDot size={13} /> Workspace control tower
                </div>
                <p className="text-sm font-medium text-[#6b8094]">{greeting}</p>
                <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] text-[#153b5d] sm:text-4xl">
                  {capitalize(displayName || 'there')}, here is your delivery position.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[#667c90] sm:text-base">
                  See what needs attention, understand your capacity on each project, and move directly into the work you can control.
                </p>
              </div>
            </div>

            <div className="border-t border-[#dce5ee] bg-[#eef5fa] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#6d8396]">Workspace</div>
              <div className="mt-2 text-2xl font-black text-[#153b5d]">{workspaceName}</div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniMetric label="Portfolios" value={portfolios.length} />
                <MiniMetric label="Projects" value={projects.length} />
                <MiniMetric label="Healthy" value={healthyProjects} />
                <MiniMetric label="Need attention" value={attentionProjects} accent />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="hub-panel p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="hub-eyebrow">My work today</div>
                <h2 className="mt-1 text-xl font-extrabold text-[#173b5c]">Your immediate delivery focus</h2>
              </div>
              <span className="rounded-full bg-[#e8f2f8] px-3 py-1 text-xs font-semibold text-[#315d7b]">
                {primaryRoleLabel(userRoles)}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <FocusItem icon={FolderKanban} value={myAssignedProjects.length} label="Projects within your working scope" />
              <FocusItem icon={AlertTriangle} value={attentionProjects} label="Projects requiring attention" urgent={attentionProjects > 0} />
              <FocusItem icon={CalendarClock} value={missingTargets} label="Projects without a target date" urgent={missingTargets > 0} />
              <FocusItem icon={Activity} value={activeProjects} label="Projects currently active" />
            </div>

            <button onClick={() => navigate('/portfolio-dashboard')} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#1d5b83] hover:text-[#f06f46]">
              Open portfolio command centre <ArrowRight size={16} />
            </button>
          </div>

          <div className="hub-panel p-6 sm:p-7">
            <div className="hub-eyebrow">Permission principle</div>
            <h2 className="mt-1 text-xl font-extrabold text-[#173b5c]">One truth. Relevant controls.</h2>
            <p className="mt-4 text-sm leading-6 text-[#667c90]">
              Everyone can see the delivery position. Editing tools appear only where your responsibility gives you control.
            </p>
            <div className="mt-6 space-y-3">
              <PermissionLine icon={CheckCircle2} title="Workspace visibility" text="See every project available to your membership." />
              <PermissionLine icon={Shield} title="Contextual access" text="Work only within your project or discipline permissions." />
              <PermissionLine icon={SlidersHorizontal} title="Cleaner interface" text="Irrelevant controls stay out of your way." />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="hub-eyebrow">Portfolio overview</div>
              <h2 className="mt-1 text-2xl font-black text-[#173b5c]">Choose a delivery environment</h2>
            </div>
            <button onClick={() => navigate('/portfolio-dashboard')} className="hub-secondary-button">
              <BarChart3 size={16} /> Portfolio Dashboard
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {portfolios.map(portfolio => {
              const portfolioProjects = projects.filter(p => p.portfolio_id === portfolio.id)
              const attention = portfolioProjects.filter(p => ['Delayed', 'On Hold'].includes(p.status)).length
              const active = portfolioProjects.filter(p => p.status === 'Active').length
              const health = portfolioProjects.length
                ? Math.round(((portfolioProjects.length - attention) / portfolioProjects.length) * 100)
                : 0

              return (
                <button
                  key={portfolio.id}
                  onClick={() => {
                    setPortfolioFilter(String(portfolio.id))
                    document.getElementById('projects-register')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="group rounded-[22px] border border-[#dbe5ee] bg-white p-5 text-left shadow-[0_10px_32px_rgba(31,70,104,0.06)] transition hover:-translate-y-1 hover:border-[#b9cedd] hover:shadow-[0_16px_40px_rgba(31,70,104,0.1)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf3f8] text-[#1f5d84]">
                      <Briefcase size={21} />
                    </div>
                    <ChevronRight className="text-[#9ab0c1] transition group-hover:translate-x-1 group-hover:text-[#f06f46]" size={20} />
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold text-[#173b5c]">{portfolio.name}</h3>
                  <p className="mt-1 min-h-10 text-sm leading-5 text-[#76899a]">
                    {portfolio.description || 'Project delivery portfolio'}
                  </p>
                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#e6edf3] pt-4">
                    <PortfolioMetric label="Projects" value={portfolioProjects.length} />
                    <PortfolioMetric label="Active" value={active} />
                    <PortfolioMetric label="Health" value={`${health}%`} attention={attention > 0} />
                  </div>
                </button>
              )
            })}

            {canCreateItems && (
              <button
                onClick={() => {
                  setSelectedOrgId(organizations[0]?.id || '')
                  setShowPortfolioModal(true)
                }}
                className="flex min-h-[210px] flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#cbd9e4] bg-[#f8fbfd] p-5 text-center transition hover:border-[#f1a58d] hover:bg-[#fff7f3]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#f06f46] shadow-sm">
                  <Plus size={21} />
                </div>
                <div className="mt-4 font-bold text-[#244a68]">Create portfolio</div>
                <div className="mt-1 text-sm text-[#7a8ea0]">Add another delivery environment</div>
              </button>
            )}
          </div>
        </section>

        <section id="projects-register" className="hub-panel overflow-hidden">
          <div className="border-b border-[#e1e9f0] p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="hub-eyebrow">Project register</div>
                <h2 className="mt-1 text-2xl font-black text-[#173b5c]">Projects and working capacity</h2>
                <p className="mt-1 text-sm text-[#76899a]">Your role is resolved project by project, not from one generic title.</p>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-4">
                <div className="relative sm:col-span-2 xl:col-span-1 xl:w-72">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8ba0b1]" />
                  <input className="hub-input pl-9" placeholder="Search project or location" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select className="hub-input" value={portfolioFilter} onChange={e => setPortfolioFilter(e.target.value)}>
                  <option value="All">All portfolios</option>
                  {portfolios.map(portfolio => <option key={portfolio.id} value={String(portfolio.id)}>{portfolio.name}</option>)}
                </select>
                <select className="hub-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="All">All statuses</option>
                  {PROJECT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
                <select className="hub-input" value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)}>
                  <option value="All">All phases</option>
                  {PROJECT_PHASES.map(phase => <option key={phase} value={phase}>{phase}</option>)}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#75899a]">Loading workspace…</div>
          ) : organizations.length === 0 ? (
            <EmptyHub title="No workspace access" message="You do not currently have access to an organization, portfolio, or project." action={() => navigate('/mixta-admin-login')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse">
                <thead>
                  <tr className="bg-[#f6f9fb] text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#718699]">
                    <th className="px-6 py-4">Project</th>
                    <th className="px-5 py-4">Portfolio</th>
                    <th className="px-5 py-4">Health</th>
                    <th className="px-5 py-4">My capacity</th>
                    <th className="px-5 py-4">Phase</th>
                    <th className="px-5 py-4">Target</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map(project => {
                    const portfolio = portfolios.find(p => p.id === project.portfolio_id)
                    const capacity = resolveProjectCapacity(project, currentUserEmail, userRoles, memberships)
                    return (
                      <ProjectRow
                        key={project.id}
                        project={project}
                        portfolioName={portfolio?.name || 'Unassigned'}
                        capacity={capacity}
                        canEdit={canEditProjects}
                        onOpen={() => openProject(project)}
                        onEdit={() => openEditProject(project)}
                      />
                    )
                  })}
                </tbody>
              </table>
              {filteredProjects.length === 0 && (
                <div className="p-12 text-center text-sm text-[#7a8ea0]">No projects match the selected filters.</div>
              )}
            </div>
          )}
        </section>
      </main>

      {showPortfolioModal && canCreateItems && (
        <Modal title="Create Portfolio" onClose={() => setShowPortfolioModal(false)}>
          <FieldLabel>Organization</FieldLabel>
          <div className="hub-readonly-field mb-4">{workspaceName}</div>
          <FieldLabel>Portfolio name</FieldLabel>
          <input className="hub-input mb-5" placeholder="e.g. Luxury Projects" value={newPortfolioName} onChange={e => setNewPortfolioName(e.target.value)} />
          <button className="hub-primary-button w-full justify-center" onClick={createPortfolio}>Create Portfolio</button>
        </Modal>
      )}

      {showProjectModal && canCreateItems && (
        <Modal title="Create Project" onClose={() => setShowProjectModal(false)}>
          <FieldLabel>Organization</FieldLabel>
          <div className="hub-readonly-field mb-4">{workspaceName}</div>
          <FieldLabel>Portfolio</FieldLabel>
          <select className="hub-input mb-4" value={selectedPortfolioId} onChange={e => setSelectedPortfolioId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Select portfolio</option>
            {portfolios.filter(p => !selectedOrgId || p.organization_id === selectedOrgId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <FieldLabel>Project name</FieldLabel>
          <input className="hub-input mb-4" placeholder="Project name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Status</FieldLabel><select className="hub-input mb-4" value={newProjectStatus} onChange={e => setNewProjectStatus(e.target.value)}>{PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><FieldLabel>Phase</FieldLabel><select className="hub-input mb-4" value={newProjectPhase} onChange={e => setNewProjectPhase(e.target.value)}>{PROJECT_PHASES.map(p => <option key={p}>{p}</option>)}</select></div>
          </div>
          <OwnerFields values={[newOverallOwnerEmail, newHousebuildOwnerEmail, newMepOwnerEmail, newInfrastructureOwnerEmail]} setters={[setNewOverallOwnerEmail, setNewHousebuildOwnerEmail, setNewMepOwnerEmail, setNewInfrastructureOwnerEmail]} />
          <button className="hub-primary-button mt-5 w-full justify-center" onClick={createProject}>Create Project</button>
        </Modal>
      )}

      {showEditProjectModal && editingProject && canEditProjects && (
        <Modal title="Edit Project" onClose={() => setShowEditProjectModal(false)}>
          <FieldLabel>Project name</FieldLabel>
          <input className="hub-input mb-4" value={editProjectName} onChange={e => setEditProjectName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Status</FieldLabel><select className="hub-input mb-4" value={editProjectStatus} onChange={e => setEditProjectStatus(e.target.value)}>{PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><FieldLabel>Phase</FieldLabel><select className="hub-input mb-4" value={editProjectPhase} onChange={e => setEditProjectPhase(e.target.value)}>{PROJECT_PHASES.map(p => <option key={p}>{p}</option>)}</select></div>
          </div>
          <FieldLabel>Location</FieldLabel>
          <input className="hub-input mb-4" value={editProjectLocation} onChange={e => setEditProjectLocation(e.target.value)} />
          <FieldLabel>Target handover date</FieldLabel>
          <input className="hub-input mb-4" type="date" value={editProjectHandoverDate} onChange={e => setEditProjectHandoverDate(e.target.value)} />
          <OwnerFields values={[editOverallOwnerEmail, editHousebuildOwnerEmail, editMepOwnerEmail, editInfrastructureOwnerEmail]} setters={[setEditOverallOwnerEmail, setEditHousebuildOwnerEmail, setEditMepOwnerEmail, setEditInfrastructureOwnerEmail]} />
          <button className="hub-primary-button mt-5 w-full justify-center" onClick={updateProject}>Save Project Changes</button>
        </Modal>
      )}
    </div>
  )
}

function MiniMetric({ label, value, accent = false }: any) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-[#f2c4b5] bg-[#fff4ef]' : 'border-[#d6e3ec] bg-white'}`}>
      <div className={`text-2xl font-black ${accent ? 'text-[#d85f38]' : 'text-[#173b5c]'}`}>{value}</div>
      <div className="mt-1 text-xs font-medium text-[#718699]">{label}</div>
    </div>
  )
}

function FocusItem({ icon: Icon, value, label, urgent = false }: any) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-4 ${urgent ? 'border-[#f3c6b8] bg-[#fff5f1]' : 'border-[#dce6ee] bg-[#f8fbfd]'}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${urgent ? 'bg-[#ffe5dc] text-[#d85f38]' : 'bg-[#e5f0f6] text-[#285f82]'}`}><Icon size={19} /></div>
      <div><div className="text-xl font-black text-[#183c5c]">{value}</div><div className="text-xs leading-5 text-[#718699]">{label}</div></div>
    </div>
  )
}

function PermissionLine({ icon: Icon, title, text }: any) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e9f3f8] text-[#285f82]"><Icon size={16} /></div>
      <div><div className="text-sm font-bold text-[#244863]">{title}</div><div className="mt-0.5 text-xs leading-5 text-[#778b9c]">{text}</div></div>
    </div>
  )
}

function PortfolioMetric({ label, value, attention = false }: any) {
  return <div><div className={`text-base font-extrabold ${attention ? 'text-[#d85f38]' : 'text-[#234967]'}`}>{value}</div><div className="text-[11px] text-[#8193a2]">{label}</div></div>
}

function ProjectRow({ project, portfolioName, capacity, canEdit, onOpen, onEdit }: any) {
  const status = project.status || 'Not set'
  const isAttention = ['Delayed', 'On Hold'].includes(status)
  const healthLabel = status === 'Delayed' ? 'Critical' : status === 'On Hold' ? 'Attention' : status === 'Completed' ? 'Complete' : 'Healthy'

  return (
    <tr className="border-t border-[#e5ecf2] bg-white transition hover:bg-[#f8fbfd]">
      <td className="px-6 py-4">
        <button onClick={onOpen} className="text-left">
          <div className="font-bold text-[#173b5c] hover:text-[#e86e48]">{project.project_name}</div>
          <div className="mt-1 text-xs text-[#8193a2]">{project.location || 'No location set'}</div>
        </button>
      </td>
      <td className="px-5 py-4 text-sm text-[#587084]">{portfolioName}</td>
      <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${isAttention ? 'border-[#f0c3b4] bg-[#fff2ed] text-[#cc5b37]' : 'border-[#bfe0d0] bg-[#edf9f3] text-[#2f7b59]'}`}><span className={`h-1.5 w-1.5 rounded-full ${isAttention ? 'bg-[#e56d47]' : 'bg-[#41a878]'}`} />{healthLabel}</span></td>
      <td className="px-5 py-4"><span className="rounded-full bg-[#eaf3f8] px-2.5 py-1 text-xs font-semibold text-[#2b6080]">{capacity}</span></td>
      <td className="px-5 py-4 text-sm text-[#587084]">{project.phase || 'Not set'}</td>
      <td className="px-5 py-4 text-sm text-[#587084]">{formatDate(project.handover_date)}</td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          {canEdit && <button onClick={onEdit} className="hub-icon-button h-9 w-9" title="Edit project"><Pencil size={15} /></button>}
          <button onClick={onOpen} className="hub-secondary-button py-2">Open <ArrowRight size={14} /></button>
        </div>
      </td>
    </tr>
  )
}

function OwnerFields({ values, setters }: any) {
  const labels = ['Overall Project Owner', 'Housebuild Owner', 'MEP Owner', 'Infrastructure Owner']
  return (
    <div className="rounded-2xl border border-[#dce6ee] bg-[#f8fbfd] p-4">
      <div className="mb-3 text-sm font-bold text-[#244863]">Project ownership</div>
      <div className="space-y-3">
        {labels.map((label, index) => (
          <div key={label}><FieldLabel>{label}</FieldLabel><input className="hub-input" type="email" placeholder={`${label} email`} value={values[index]} onChange={e => setters[index](e.target.value)} /></div>
        ))}
      </div>
    </div>
  )
}

function FieldLabel({ children }: any) {
  return <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#718699]">{children}</label>
}

function EmptyHub({ title, message, action }: any) {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f2f8] text-[#285f82]"><Building2 size={24} /></div>
      <div className="mt-4 text-xl font-bold text-[#173b5c]">{title}</div>
      <div className="mt-2 text-sm text-[#718699]">{message}</div>
      <button onClick={action} className="hub-primary-button mt-5">Back to Login</button>
    </div>
  )
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324d]/45 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] border border-[#dbe5ed] bg-white p-6 shadow-[0_30px_90px_rgba(18,50,76,0.25)]">
        <div className="mb-6 flex items-center justify-between">
          <div><div className="hub-eyebrow">Workspace setup</div><h2 className="mt-1 text-xl font-black text-[#173b5c]">{title}</h2></div>
          <button onClick={onClose} className="hub-icon-button"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function resolveProjectCapacity(project: any, email: string, roles: string[], memberships: any[]) {
  const clean = (value: unknown) => String(value || '').toLowerCase().trim()
  if (email && clean(project.overall_owner_email) === email) return 'Project Owner'
  if (email && clean(project.housebuild_owner_email) === email) return 'Housebuild Owner'
  if (email && clean(project.mep_owner_email) === email) return 'MEP Owner'
  if (email && clean(project.infrastructure_owner_email) === email) return 'Infrastructure Owner'

  const projectMembership = memberships.find(m => {
    const ids = [m.project_id, ...(m.project_ids || [])].filter(Boolean)
    return m.access_scope === 'project' && ids.includes(project.id)
  })
  if (projectMembership?.role) return INTERNAL_ROLE_LABELS[clean(projectMembership.role)] || String(projectMembership.role)

  const priority = ['workspace_admin', 'admin', 'pmo', 'portfolio_manager', 'design', 'costing', 'hse_manager', 'hse_lead', 'hse', 'housebuild', 'infrastructure', 'mep', 'viewer', 'guest']
  const role = priority.find(item => roles.includes(item))
  return INTERNAL_ROLE_LABELS[role || 'viewer'] || 'Viewer'
}

function primaryRoleLabel(roles: string[]) {
  const priority = ['workspace_admin', 'admin', 'pmo', 'portfolio_manager', 'design', 'costing', 'hse_manager', 'hse_lead', 'hse', 'housebuild', 'infrastructure', 'mep', 'viewer', 'guest']
  const role = priority.find(item => roles.includes(item)) || roles[0] || 'viewer'
  return INTERNAL_ROLE_LABELS[role] || capitalize(role.split('_').join(' '))
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

function formatDate(value: string | null) {
  if (!value) return 'Not set'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
