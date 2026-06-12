import { useEffect, useState } from 'react'
import {
  Building2,
  Briefcase,
  FolderKanban,
  Plus,
  ArrowRight,
  Layers,
  Activity,
  Shield,
  Search,
  Filter,
  UserCircle,
  Pencil,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

const ADMIN_ROLES = ['workspace_admin', 'admin']

const CREATE_ROLES = [
  'workspace_admin',
  'admin',
  'pmo',
  'portfolio_manager',
]

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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [canAccessAdmin, setCanAccessAdmin] = useState(false)
  const [canCreateWorkspaceItems, setCanCreateWorkspaceItems] = useState(false)

  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [showPortfolioModal, setShowPortfolioModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)

  const [editingProject, setEditingProject] = useState<any>(null)

  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectStatus, setNewProjectStatus] = useState('Planning')
  const [newProjectPhase, setNewProjectPhase] = useState('Concept')
  const [newOrgName, setNewOrgName] = useState('')
  const [newPortfolioName, setNewPortfolioName] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<number | ''>('')
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | ''>('')

  const [editProjectName, setEditProjectName] = useState('')
  const [editProjectStatus, setEditProjectStatus] = useState('Planning')
  const [editProjectPhase, setEditProjectPhase] = useState('Concept')
  const [editProjectLocation, setEditProjectLocation] = useState('')
  const [editProjectHandoverDate, setEditProjectHandoverDate] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [organizationFilter, setOrganizationFilter] = useState('All')
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

    const { data: membershipRows, error: membershipError } = await supabase
      .from('memberships')
      .select('*')
      .or(`user_id.eq.${currentUser.id},email.eq.${cleanEmail}`)

    if (membershipError) {
      alert(membershipError.message)
      setLoading(false)
      return
    }

    const memberships = membershipRows || []

    if (memberships.length === 0) {
      setOrganizations([])
      setPortfolios([])
      setProjects([])
      setCanAccessAdmin(false)
      setCanCreateWorkspaceItems(false)
      setLoading(false)
      return
    }

    const userRoles = memberships.map(membership =>
      String(membership.role || '').toLowerCase()
    )

    setCanAccessAdmin(userRoles.some(role => ADMIN_ROLES.includes(role)))
    setCanCreateWorkspaceItems(userRoles.some(role => CREATE_ROLES.includes(role)))

    const hasWorkspaceAccess = memberships.some(
      membership => membership.access_scope === 'workspace'
    )

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

    if (hasWorkspaceAccess) {
      setOrganizations(orgs || [])
      setPortfolios(ports || [])
      setProjects(projs || [])
      setLoading(false)
      return
    }

    const allowedProjectIds = memberships
      .filter(membership => membership.access_scope === 'project')
      .map(membership => membership.project_id)
      .filter(Boolean)

    const allowedPortfolioIds = memberships
      .filter(membership => membership.access_scope === 'portfolio')
      .map(membership => membership.portfolio_id)
      .filter(Boolean)

    const visibleProjects = (projs || []).filter(project => {
      return (
        allowedProjectIds.includes(project.id) ||
        allowedPortfolioIds.includes(project.portfolio_id)
      )
    })

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
  }

  function openProject(project: any) {
    setProject(
      Number(project.id),
      project.project_name,
      project.organization_id ?? null,
      project.portfolio_id ?? null,
      project.project_owner_email ?? null
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
    setShowEditProjectModal(true)
  }

  async function updateProject() {
    if (!editingProject || !editProjectName.trim()) return

    const { error } = await supabase
      .from('projects')
      .update({
        project_name: editProjectName.trim(),
        status: editProjectStatus,
        phase: editProjectPhase,
        location: editProjectLocation.trim() || null,
        handover_date: editProjectHandoverDate || null,
      })
      .eq('id', editingProject.id)

    if (error) {
      alert(error.message)
      return
    }

    setEditingProject(null)
    setShowEditProjectModal(false)
    loadHub()
  }

  async function createOrganization() {
    if (!canAccessAdmin || !newOrgName.trim()) return

    const { error } = await supabase
      .from('organizations')
      .insert({ name: newOrgName.trim() })

    if (error) {
      alert(error.message)
      return
    }

    setNewOrgName('')
    setShowOrgModal(false)
    loadHub()
  }

  async function createPortfolio() {
    if (!canCreateWorkspaceItems || !newPortfolioName.trim() || !selectedOrgId) return

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
    if (!canCreateWorkspaceItems || !newProjectName.trim()) return

    const { error } = await supabase.from('projects').insert({
      project_name: newProjectName.trim(),
      status: newProjectStatus,
      phase: newProjectPhase,
      organization_id: selectedOrgId || null,
      portfolio_id: selectedPortfolioId || null,
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
    setShowProjectModal(false)
    loadHub()
  }

  const filteredProjects = projects.filter(project => {
    const search = searchTerm.toLowerCase().trim()

    const matchesSearch =
      !search ||
      String(project.project_name || '').toLowerCase().includes(search) ||
      String(project.location || '').toLowerCase().includes(search)

    const matchesOrganization =
      organizationFilter === 'All' ||
      String(project.organization_id || '') === organizationFilter

    const matchesPortfolio =
      portfolioFilter === 'All' ||
      String(project.portfolio_id || '') === portfolioFilter

    const matchesStatus =
      statusFilter === 'All' ||
      String(project.status || 'Planning') === statusFilter

    const matchesPhase =
      phaseFilter === 'All' ||
      String(project.phase || 'Planning') === phaseFilter

    return (
      matchesSearch &&
      matchesOrganization &&
      matchesPortfolio &&
      matchesStatus &&
      matchesPhase
    )
  })

  const totalProjects = filteredProjects.length

  const activeProjects = filteredProjects.filter(
    project => (project.status || 'Planning') === 'Active'
  ).length

  return (
    <div className="min-h-dvh bg-[#0c1014] text-white overflow-x-hidden overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-[calc(10rem+env(safe-area-inset-bottom))] space-y-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-left w-fit"
          >
            <PMOCorexLogo size={42} />
          </button>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-end">
            <button
              onClick={() => navigate('/profile')}
              className="btn-ghost btn-sm btn justify-center"
            >
              <UserCircle size={14} />
              My Profile
            </button>

            {canAccessAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="btn-ghost btn-sm btn justify-center"
              >
                <Shield size={14} />
                Admin Console
              </button>
            )}

            {canAccessAdmin && (
              <button
                onClick={() => setShowOrgModal(true)}
                className="btn-ghost btn-sm btn justify-center"
              >
                <Building2 size={14} />
                New Organization
              </button>
            )}

            {canCreateWorkspaceItems && (
              <button
                onClick={() => setShowPortfolioModal(true)}
                className="btn-ghost btn-sm btn justify-center"
              >
                <Briefcase size={14} />
                New Portfolio
              </button>
            )}

            {canCreateWorkspaceItems && (
              <button
                onClick={() => setShowProjectModal(true)}
                className="btn-gold btn-sm btn justify-center col-span-2 sm:col-span-1"
              >
                <Plus size={14} />
                New Project
              </button>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8 lg:p-10">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#c49e48]/10 blur-3xl" />

          <div className="relative max-w-3xl">
            <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
              Workspace Hub
            </div>

            <h1 className="text-[34px] leading-[1.05] sm:text-4xl lg:text-5xl font-black tracking-tight max-w-3xl">
              Choose your delivery environment.
            </h1>

            <p className="text-slate-400 mt-4 leading-relaxed max-w-2xl text-sm sm:text-base">
              Manage organizations, portfolios, projects, team access, and
              delivery command centres from one workspace hub.
            </p>
          </div>

          <div className="relative mt-8 grid grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard title="Organizations" value={organizations.length} icon={Building2} />
            <MetricCard title="Portfolios" value={portfolios.length} icon={Briefcase} />
            <MetricCard title="Projects" value={totalProjects} icon={FolderKanban} />
            <MetricCard title="Active" value={activeProjects} icon={Activity} />
          </div>
        </div>

        <div className="card p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#ede8de]">
            <Filter size={15} className="text-[#c49e48]" />
            Project Search & Filters
          </div>

          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7d8c]"
            />

            <input
              className="form-control pl-9"
              placeholder="Search by project name or location..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              className="form-control"
              value={organizationFilter}
              onChange={e => setOrganizationFilter(e.target.value)}
            >
              <option value="All">All Organizations</option>
              {organizations.map(org => (
                <option key={org.id} value={String(org.id)}>
                  {org.name}
                </option>
              ))}
            </select>

            <select
              className="form-control"
              value={portfolioFilter}
              onChange={e => setPortfolioFilter(e.target.value)}
            >
              <option value="All">All Portfolios</option>
              {portfolios.map(portfolio => (
                <option key={portfolio.id} value={String(portfolio.id)}>
                  {portfolio.name}
                </option>
              ))}
            </select>

            <select
              className="form-control"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {PROJECT_STATUSES.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              className="form-control"
              value={phaseFilter}
              onChange={e => setPhaseFilter(e.target.value)}
            >
              <option value="All">All Phases</option>
              {PROJECT_PHASES.map(phase => (
                <option key={phase} value={phase}>
                  {phase}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="card p-8 text-slate-400">Loading workspace…</div>
        ) : (
          <div className="space-y-10">
            {organizations.length === 0 ? (
              <EmptyHub
                title="No workspace access"
                message="You do not currently have access to any organization, portfolio, or project."
                action={() => navigate('/mixta-admin-login')}
              />
            ) : (
              organizations.map(org => {
                const orgPortfolios = portfolios.filter(
                  portfolio => portfolio.organization_id === org.id
                )

                const orgProjects = filteredProjects.filter(
                  project => project.organization_id === org.id
                )

                if (orgProjects.length === 0 && searchTerm) return null

                return (
                  <div key={org.id} className="card p-5 sm:p-6 lg:p-7">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 size={18} className="text-[#c49e48]" />

                          <h2 className="text-xl font-bold text-[#ede8de]">
                            {org.name}
                          </h2>
                        </div>

                        <p className="text-sm text-slate-500 mt-1">
                          {orgPortfolios.length} portfolio(s) •{' '}
                          {orgProjects.length} visible project(s)
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {canAccessAdmin && (
                          <button
                            onClick={() => navigate('/admin')}
                            className="btn-ghost btn-sm btn w-fit"
                          >
                            <Shield size={14} />
                            Manage Access
                          </button>
                        )}

                        {canCreateWorkspaceItems && (
                          <button
                            onClick={() => {
                              setSelectedOrgId(org.id)
                              setShowPortfolioModal(true)
                            }}
                            className="btn-ghost btn-sm btn w-fit"
                          >
                            <Briefcase size={14} />
                            Add Portfolio
                          </button>
                        )}

                        {canCreateWorkspaceItems && (
                          <button
                            onClick={() => {
                              setSelectedOrgId(org.id)
                              setShowProjectModal(true)
                            }}
                            className="btn-gold btn-sm btn w-fit"
                          >
                            <Plus size={14} />
                            Add Project
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                      {orgPortfolios.map(portfolio => {
                        const portfolioProjects = filteredProjects.filter(
                          project => project.portfolio_id === portfolio.id
                        )

                        if (portfolioProjects.length === 0 && searchTerm) return null

                        return (
                          <div
                            key={portfolio.id}
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Layers size={16} className="text-[#c49e48]" />

                                  <div className="font-semibold text-white">
                                    {portfolio.name}
                                  </div>
                                </div>

                                <div className="text-xs text-slate-500 mt-1">
                                  {portfolio.description || 'Project delivery portfolio'}
                                </div>
                              </div>

                              <div className="text-xs text-slate-500">
                                {portfolioProjects.length} project(s)
                              </div>
                            </div>

                            <div className="space-y-3">
                              {portfolioProjects.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-sm text-slate-500 text-center">
                                  No projects in this portfolio yet.
                                </div>
                              ) : (
                                portfolioProjects.map(project => (
                                  <ProjectCard
                                    key={project.id}
                                    project={project}
                                    canEdit={canCreateWorkspaceItems}
                                    onClick={() => openProject(project)}
                                    onEdit={() => openEditProject(project)}
                                  />
                                ))
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {orgProjects.filter(project => !project.portfolio_id).length > 0 && (
                      <div className="mt-6">
                        <div className="text-sm font-semibold text-[#ede8de] mb-3">
                          Projects not assigned to a portfolio
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                          {orgProjects
                            .filter(project => !project.portfolio_id)
                            .map(project => (
                              <ProjectCard
                                key={project.id}
                                project={project}
                                canEdit={canCreateWorkspaceItems}
                                onClick={() => openProject(project)}
                                onEdit={() => openEditProject(project)}
                              />
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        <div className="h-40" />
      </div>

      {showOrgModal && canAccessAdmin && (
        <Modal title="Create Organization" onClose={() => setShowOrgModal(false)}>
          <input
            className="form-control mb-4"
            placeholder="Organization name"
            value={newOrgName}
            onChange={e => setNewOrgName(e.target.value)}
          />

          <button className="btn-gold btn w-full justify-center" onClick={createOrganization}>
            Create Organization
          </button>
        </Modal>
      )}

      {showPortfolioModal && canCreateWorkspaceItems && (
        <Modal title="Create Portfolio" onClose={() => setShowPortfolioModal(false)}>
          <select
            className="form-control mb-4"
            value={selectedOrgId}
            onChange={e => setSelectedOrgId(Number(e.target.value))}
          >
            <option value="">Select organization</option>

            {organizations.map(org => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>

          <input
            className="form-control mb-4"
            placeholder="Portfolio name"
            value={newPortfolioName}
            onChange={e => setNewPortfolioName(e.target.value)}
          />

          <button className="btn-gold btn w-full justify-center" onClick={createPortfolio}>
            Create Portfolio
          </button>
        </Modal>
      )}

      {showProjectModal && canCreateWorkspaceItems && (
        <Modal title="Create Project" onClose={() => setShowProjectModal(false)}>
          <select
            className="form-control mb-4"
            value={selectedOrgId}
            onChange={e => {
              setSelectedOrgId(Number(e.target.value))
              setSelectedPortfolioId('')
            }}
          >
            <option value="">Select organization</option>

            {organizations.map(org => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>

          <select
            className="form-control mb-4"
            value={selectedPortfolioId}
            onChange={e => setSelectedPortfolioId(Number(e.target.value))}
          >
            <option value="">Select portfolio</option>

            {portfolios
              .filter(
                portfolio =>
                  !selectedOrgId ||
                  portfolio.organization_id === selectedOrgId
              )
              .map(portfolio => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.name}
                </option>
              ))}
          </select>

          <input
            className="form-control mb-4"
            placeholder="Project name"
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
          />

          <select
            className="form-control mb-4"
            value={newProjectStatus}
            onChange={e => setNewProjectStatus(e.target.value)}
          >
            {PROJECT_STATUSES.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            className="form-control mb-4"
            value={newProjectPhase}
            onChange={e => setNewProjectPhase(e.target.value)}
          >
            {PROJECT_PHASES.map(phase => (
              <option key={phase} value={phase}>
                {phase}
              </option>
            ))}
          </select>

          <button className="btn-gold btn w-full justify-center" onClick={createProject}>
            Create Project
          </button>
        </Modal>
      )}

      {showEditProjectModal && editingProject && canCreateWorkspaceItems && (
        <Modal title="Edit Project" onClose={() => setShowEditProjectModal(false)}>
          <input
            className="form-control mb-4"
            placeholder="Project name"
            value={editProjectName}
            onChange={e => setEditProjectName(e.target.value)}
          />

          <select
            className="form-control mb-4"
            value={editProjectStatus}
            onChange={e => setEditProjectStatus(e.target.value)}
          >
            {PROJECT_STATUSES.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            className="form-control mb-4"
            value={editProjectPhase}
            onChange={e => setEditProjectPhase(e.target.value)}
          >
            {PROJECT_PHASES.map(phase => (
              <option key={phase} value={phase}>
                {phase}
              </option>
            ))}
          </select>

          <input
            className="form-control mb-4"
            placeholder="Location"
            value={editProjectLocation}
            onChange={e => setEditProjectLocation(e.target.value)}
          />

          <input
            className="form-control mb-4"
            type="date"
            value={editProjectHandoverDate}
            onChange={e => setEditProjectHandoverDate(e.target.value)}
          />

          <button className="btn-gold btn w-full justify-center" onClick={updateProject}>
            Save Project Changes
          </button>
        </Modal>
      )}
    </div>
  )
}

function MetricCard({ title, value, icon: Icon }: any) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {value}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {title}
          </div>
        </div>

        <Icon size={20} className="text-[#c49e48]" />
      </div>
    </div>
  )
}

function ProjectCard({ project, onClick, onEdit, canEdit }: any) {
  const status = project.status || 'Planning'
  const phase = project.phase || 'Planning'

  return (
    <div className="group rounded-2xl border border-white/[0.06] bg-[#111820] p-4 sm:p-5 hover:border-[#c49e48]/40 hover:bg-[#141d26] transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div onClick={onClick} className="min-w-0 flex-1 cursor-pointer">
          <div className="font-semibold text-white truncate">
            {project.project_name}
          </div>

          <div className="text-xs text-slate-500 mt-1 truncate">
            {project.location || 'No location set'}
          </div>

          <div className="text-xs text-[#c49e48] mt-2 truncate">
            Phase: {phase}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                onEdit()
              }}
              className="text-slate-500 hover:text-[#c49e48] transition"
              title="Edit project"
            >
              <Pencil size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={onClick}
            className="text-slate-500 group-hover:text-[#c49e48] transition"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 flex-shrink-0">
          {status}
        </span>

        <span className="text-xs text-slate-500 truncate">
          Target: {project.handover_date || 'Not set'}
        </span>
      </div>
    </div>
  )
}

function EmptyHub({ title, message, action }: any) {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-[#c49e48]/10 border border-[#c49e48]/20 flex items-center justify-center">
        <Building2 size={24} className="text-[#c49e48]" />
      </div>

      <div className="text-xl font-bold text-white">{title}</div>

      <div className="text-sm text-slate-500 mt-2">{message}</div>

      <button onClick={action} className="btn-gold btn mt-5">
        Back to Login
      </button>
    </div>
  )
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{title}</h2>

          <button onClick={onClose} className="text-slate-500 hover:text-white">
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
