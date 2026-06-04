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
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showOrgModal, setShowOrgModal] = useState(false)
  const [showPortfolioModal, setShowPortfolioModal] = useState(false)

  const [newProjectName, setNewProjectName] = useState('')
  const [newOrgName, setNewOrgName] = useState('')
  const [newPortfolioName, setNewPortfolioName] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<number | ''>('')
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | ''>('')

  const navigate = useNavigate()
  const { setProject } = useProjectStore()

  useEffect(() => {
    loadHub()
  }, [])

  async function loadHub() {
    setLoading(true)

    const [{ data: orgs }, { data: ports }, { data: projs, error }] =
      await Promise.all([
        supabase.from('organizations').select('*').order('created_at'),
        supabase.from('portfolios').select('*').order('created_at'),
        supabase.from('projects').select('*').order('id'),
      ])

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setOrganizations(orgs || [])
    setPortfolios(ports || [])
    setProjects(projs || [])
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

  async function createOrganization() {
    if (!newOrgName.trim()) return

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
    if (!newPortfolioName.trim() || !selectedOrgId) return

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
    if (!newProjectName.trim()) return

    const { error } = await supabase.from('projects').insert({
      project_name: newProjectName.trim(),
      status: 'Active',
      organization_id: selectedOrgId || null,
      portfolio_id: selectedPortfolioId || null,
    })

    if (error) {
      alert(error.message)
      return
    }

    setNewProjectName('')
    setSelectedOrgId('')
    setSelectedPortfolioId('')
    setShowProjectModal(false)
    loadHub()
  }

  const totalProjects = projects.length
  const activeProjects = projects.filter(
    project => (project.status || 'Active') === 'Active'
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
              onClick={() => navigate('/admin')}
              className="btn-ghost btn-sm btn justify-center"
            >
              <Shield size={14} />
              Admin Console
            </button>

            <button
              onClick={() => setShowOrgModal(true)}
              className="btn-ghost btn-sm btn justify-center"
            >
              <Building2 size={14} />
              New Organization
            </button>

            <button
              onClick={() => setShowPortfolioModal(true)}
              className="btn-ghost btn-sm btn justify-center"
            >
              <Briefcase size={14} />
              New Portfolio
            </button>

            <button
              onClick={() => setShowProjectModal(true)}
              className="btn-gold btn-sm btn justify-center col-span-2 sm:col-span-1"
            >
              <Plus size={14} />
              New Project
            </button>
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

        {loading ? (
          <div className="card p-8 text-slate-400">
            Loading workspace…
          </div>
        ) : (
          <div className="space-y-10">
            {organizations.length === 0 ? (
              <EmptyHub
                title="No organization yet"
                message="Create your first organization to start grouping portfolios and projects."
                action={() => setShowOrgModal(true)}
              />
            ) : (
              organizations.map(org => {
                const orgPortfolios = portfolios.filter(
                  portfolio => portfolio.organization_id === org.id
                )

                const orgProjects = projects.filter(
                  project => project.organization_id === org.id
                )

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
                          {orgProjects.length} project(s)
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => navigate('/admin')}
                          className="btn-ghost btn-sm btn w-fit"
                        >
                          <Shield size={14} />
                          Manage Access
                        </button>

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
                      </div>
                    </div>

                    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                      {orgPortfolios.map(portfolio => {
                        const portfolioProjects = projects.filter(
                          project => project.portfolio_id === portfolio.id
                        )

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
                                    onClick={() => openProject(project)}
                                  />
                                ))
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {orgPortfolios.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center">
                          <div className="text-white font-semibold">
                            No portfolios yet
                          </div>

                          <div className="text-sm text-slate-500 mt-2">
                            Create portfolios like Affordable, Luxury,
                            Infrastructure, or Commercial.
                          </div>

                          <button
                            onClick={() => {
                              setSelectedOrgId(org.id)
                              setShowPortfolioModal(true)
                            }}
                            className="btn-gold btn mt-5"
                          >
                            Create Portfolio
                          </button>
                        </div>
                      )}
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
                                onClick={() => openProject(project)}
                              />
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {projects.filter(project => !project.organization_id).length > 0 && (
              <div className="card p-5 sm:p-6 lg:p-7">
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-[#ede8de]">
                    Unassigned Projects
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    These projects are not yet linked to an organization or portfolio.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {projects
                    .filter(project => !project.organization_id)
                    .map(project => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onClick={() => openProject(project)}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="h-40" />
      </div>

      {showOrgModal && (
        <Modal title="Create Organization" onClose={() => setShowOrgModal(false)}>
          <input
            className="form-control mb-4"
            placeholder="Organization name"
            value={newOrgName}
            onChange={e => setNewOrgName(e.target.value)}
          />

          <button
            className="btn-gold btn w-full justify-center"
            onClick={createOrganization}
          >
            Create Organization
          </button>
        </Modal>
      )}

      {showPortfolioModal && (
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

          <button
            className="btn-gold btn w-full justify-center"
            onClick={createPortfolio}
          >
            Create Portfolio
          </button>
        </Modal>
      )}

      {showProjectModal && (
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
              .filter(portfolio => !selectedOrgId || portfolio.organization_id === selectedOrgId)
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

          <button
            className="btn-gold btn w-full justify-center"
            onClick={createProject}
          >
            Create Project
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

function ProjectCard({ project, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className="group rounded-2xl border border-white/[0.06] bg-[#111820] p-4 sm:p-5 cursor-pointer hover:border-[#c49e48]/40 hover:bg-[#141d26] transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">
            {project.project_name}
          </div>

          <div className="text-xs text-slate-500 mt-1 truncate">
            {project.location || 'No location set'}
          </div>
        </div>

        <ArrowRight
          size={16}
          className="text-slate-500 group-hover:text-[#c49e48] transition flex-shrink-0"
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 flex-shrink-0">
          {project.status || 'Active'}
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

      <div className="text-xl font-bold text-white">
        {title}
      </div>

      <div className="text-sm text-slate-500 mt-2">
        {message}
      </div>

      <button onClick={action} className="btn-gold btn mt-5">
        Create Organization
      </button>
    </div>
  )
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white"
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
