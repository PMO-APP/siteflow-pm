import { useEffect, useState } from 'react'
import {
  Building2,
  Briefcase,
  FolderKanban,
  Plus,
  ArrowRight,
  Layers,
  Activity,
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

  function openProject(p: any) {
    setProject(
  p.id,
  p.project_name,
  p.organization_id || null,
  p.portfolio_id || null
)
    navigate('/app')
  }

  async function createOrganization() {
    if (!newOrgName.trim()) return

    const { error } = await supabase
      .from('organizations')
      .insert({ name: newOrgName })

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
      name: newPortfolioName,
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
      project_name: newProjectName,
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
  const activeProjects = projects.filter(p => (p.status || 'Active') === 'Active').length

  return (
    <div className="min-h-screen bg-[#0c1014] text-white px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <PMOCorexLogo size={40} />

          <div className="flex gap-3">
            <button
              onClick={() => setShowOrgModal(true)}
              className="btn-ghost btn-sm btn"
            >
              <Building2 size={14} />
              New Organization
            </button>

            <button
              onClick={() => setShowPortfolioModal(true)}
              className="btn-ghost btn-sm btn"
            >
              <Briefcase size={14} />
              New Portfolio
            </button>

            <button
              onClick={() => setShowProjectModal(true)}
              className="btn-gold btn-sm btn"
            >
              <Plus size={14} />
              New Project
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-[#c49e48]/20 bg-gradient-to-r from-[#111820] via-[#162230] to-[#111820] p-8">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#c49e48]/10 blur-3xl" />

          <div className="relative max-w-3xl">
            <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
              Workspace Hub
            </div>

            <h1 className="text-4xl font-black">
              Choose your delivery environment.
            </h1>

            <p className="text-slate-400 mt-3 leading-relaxed">
              Create organizations, group projects into portfolios, and manage each
              project from its own PMOCorex command centre.
            </p>
          </div>

          <div className="relative mt-8 grid md:grid-cols-4 gap-4">
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
          <div className="space-y-8">
            {organizations.length === 0 ? (
              <EmptyHub
                title="No organization yet"
                message="Create your first organization to start grouping portfolios and projects."
                action={() => setShowOrgModal(true)}
              />
            ) : (
              organizations.map(org => {
                const orgPortfolios = portfolios.filter(
                  p => p.organization_id === org.id
                )

                const orgProjects = projects.filter(
                  p => p.organization_id === org.id || !p.organization_id
                )

                return (
                  <div key={org.id} className="card p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 size={18} className="text-[#c49e48]" />
                          <h2 className="text-xl font-bold text-[#ede8de]">
                            {org.name}
                          </h2>
                        </div>

                        <p className="text-sm text-slate-500 mt-1">
                          {orgPortfolios.length} portfolio(s) • {orgProjects.length} project(s)
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedOrgId(org.id)
                          setShowProjectModal(true)
                        }}
                        className="btn-gold btn-sm btn"
                      >
                        <Plus size={14} />
                        Add Project
                      </button>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-5">
                      {orgPortfolios.map(portfolio => {
                        const portfolioProjects = projects.filter(
                          p => p.portfolio_id === portfolio.id
                        )

                        return (
                          <div
                            key={portfolio.id}
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
                          >
                            <div className="flex items-center justify-between mb-4">
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
                                {portfolioProjects.length} projects
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
                            Create portfolios like Affordable, Luxury, Infrastructure, or Commercial.
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
                  </div>
                )
              })
            )}

            {projects.filter(p => !p.organization_id).length > 0 && (
              <div className="card p-5">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-[#ede8de]">
                    Unassigned Projects
                  </h2>
                  <p className="text-sm text-slate-500">
                    These projects are not yet linked to an organization or portfolio.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {projects
                    .filter(p => !p.organization_id)
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
      </div>

      {showOrgModal && (
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
            placeholder="Portfolio name, e.g. Affordable Projects"
            value={newPortfolioName}
            onChange={e => setNewPortfolioName(e.target.value)}
          />

          <button className="btn-gold btn w-full justify-center" onClick={createPortfolio}>
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
              .filter(p => !selectedOrgId || p.organization_id === selectedOrgId)
              .map(port => (
                <option key={port.id} value={port.id}>
                  {port.name}
                </option>
              ))}
          </select>

          <input
            className="form-control mb-4"
            placeholder="Project name"
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
          />

          <button className="btn-gold btn w-full justify-center" onClick={createProject}>
            Create Project
          </button>
        </Modal>
      )}
    </div>
  )
}

function MetricCard({ title, value, icon: Icon }: any) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-black text-white">
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
      className="group rounded-2xl border border-white/[0.06] bg-[#111820] p-4 cursor-pointer hover:border-[#c49e48]/40 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-white">
            {project.project_name}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {project.location || 'No location set'}
          </div>
        </div>

        <ArrowRight
          size={16}
          className="text-slate-500 group-hover:text-[#c49e48] transition"
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1">
          {project.status || 'Active'}
        </span>

        <span className="text-xs text-slate-500">
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
