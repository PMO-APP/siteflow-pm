import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { openProject, type ProjectNavigationTarget } from '@/lib/openProject'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

type Project = ProjectNavigationTarget & { project_name: string; status?: string | null }
const units = ['Housebuild', 'Mechanical', 'Electrical', 'Infrastructure']

export default function WorkspaceReportsPage() {
  const { section } = useParams()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [discipline, setDiscipline] = useState('Housebuild')
  const valid = section === 'design' || section === 'ipd'
  useEffect(() => {
    if (!valid) return
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    void supabase.from('projects')
      .select('id,project_name,status,organization_id,portfolio_id,overall_owner_email,housebuild_owner_email,mep_owner_email,infrastructure_owner_email')
      .is('archived_at', null).order('project_name').abortSignal(controller.signal).then(result => {
        if (controller.signal.aborted) return
        setProjects(result.data ?? [])
        setError(!!result.error)
        setLoading(false)
      })
    return () => controller.abort()
  }, [valid])

  const filtered = projects.filter(project => project.project_name.toLowerCase().includes(search.trim().toLowerCase()))
  if (!valid) return <div className="p-8">Unknown report section. <button onClick={() => navigate('/projects')}>Back to workspace</button></div>
  return <div className="min-h-screen bg-[#f7f8f6] text-[#173f5f]">
    <header className="border-b border-[#d8e4ee] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <PMOCorexLogo size={38} />
        <button className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold" onClick={() => navigate('/projects')}><ArrowLeft size={16} /> Workspace Hub</button>
      </div>
    </header>
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#05969B]">Workspace / Reports</p>
        <h1 className="mt-2 text-3xl font-black">{section === 'design' ? 'Design Reports' : 'IPD Reports'}</h1>
        <p className="mt-2 text-sm text-slate-600">Choose a project to open its departmental reporting page.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4">
        <input aria-label="Find project" className="rounded-lg border p-2" placeholder="Search projects" value={search} onChange={event => setSearch(event.target.value)} />
        {section === 'ipd' && <label className="text-sm">Discipline <select className="ml-2 rounded-lg border p-2" value={discipline} onChange={event => setDiscipline(event.target.value)}>
          {units.map(unit => <option key={unit}>{unit}</option>)}
        </select></label>}
      </div>
      {loading && <p role="status">Loading projects…</p>}
      {error && <p role="alert" className="text-red-800">Projects could not be loaded.</p>}
      {!loading && !error && <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-4 text-lg font-bold">Select project {section === 'ipd' ? `· ${discipline}` : ''}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(project => <button key={project.id} onClick={() => openProject(navigate, project, section === 'design' ? '/app/design-reports' : '/app/reports/ipd')}
            className="flex items-center justify-between rounded-xl border p-4 text-left hover:border-teal-500 hover:bg-teal-50">
            <span><strong className="block">{project.project_name}</strong><span className="text-xs text-slate-500">{project.status || 'Status unavailable'}</span></span>
            <FileText size={20} aria-hidden />
          </button>)}
        </div>
        {!filtered.length && <p>No accessible projects match your search.</p>}
      </section>}
    </main>
  </div>
}
