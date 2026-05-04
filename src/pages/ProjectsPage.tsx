import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'

export default function ProjectsPage() {
  const [projects, setProjects] =
    useState<any[]>([])
   const [loading, setLoading] =
    useState (true)
  const [showModal, setShowModal] = useState(false)
const [newProjectName, setNewProjectName] = useState('')

  const navigate = useNavigate()

  const { setProject } =
    useProjectStore()

  useEffect(() => {
    loadProjects()
  }, [])

async function loadProjects() {
  setLoading(true)

  const { data, error } =
    await supabase
      .from('projects')
      .select('*')
      .order('id')

  if (error) {
    console.error('Projects load error:', error)
    alert(error.message)
    setLoading(false)
    return
  }

  setProjects(data || [])
  setLoading(false)
} 

 function openProject(p: any) {
  setProject(
    p.id,
    p.project_name
  )

  navigate('/app')
}
async function createProject() {
  if (!newProjectName) return

  const { error } = await supabase
    .from('projects')
    .insert([
      {
        project_name: newProjectName,
        status: 'Active'
      }
    ])

  if (error) {
    alert(error.message)
    return
  }

  setShowModal(false)
  setNewProjectName('')
  loadProjects()
}
  return (
  <div className="min-h-screen bg-[#0c1014] px-6 py-12">
  <div className="max-w-6xl mx-auto">

      <div className="mb-8 flex items-center justify-between">
  <div>
    <div className="text-3xl font-bold text-white">
      Projects Hub
    </div>

    <div className="text-slate-400 mt-1">
      Select a project to continue
    </div>
  </div>

  <button
    className="btn-gold btn-sm btn"
   onClick={() => setShowModal(true)}
  >
    + New Project
  </button>
</div>

      <div className="grid md:grid-cols-3 gap-5">
        {projects.map(p => (
          <div
            key={p.id}
            onClick={() => openProject(p)}
            className="card p-5 cursor-pointer hover:border-[#c49e48] transition"
          >
            <div className="text-xl font-semibold text-white">
              {p.project_name}
            </div>

            <div className="text-sm text-slate-400 mt-1">
              {p.location || 'Nigeria'}
            </div>

<div className="mt-4 text-sm text-emerald-400">
  {p.status || 'Active'}
</div>

            <div className="mt-4 text-xs text-slate-500">
              Target: {p.handover_date || '-'}
            </div>
          </div>
        ))}
      </div>

      {loading && (
  <div className="card p-8 text-slate-400 text-sm mt-5">
    Loading projects…
  </div>
)}

{!loading && projects.length === 0 && (
  <div className="card p-8 text-slate-400 text-sm mt-5">
    No projects found. Please check Supabase permissions.
  </div>
)}

    </div>
    {showModal && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="card p-6 w-full max-w-sm">
      <h2 className="text-lg font-semibold text-white mb-4">
        Create New Project
      </h2>

      <input
        className="form-control mb-4"
        placeholder="Project Name"
        value={newProjectName}
        onChange={e => setNewProjectName(e.target.value)}
      />

      <div className="flex justify-end gap-2">
        <button
          className="btn"
          onClick={() => setShowModal(false)}
        >
          Cancel
        </button>

        <button
          className="btn-gold btn"
          onClick={createProject}
        >
          Create
        </button>
      </div>
    </div>
  </div>
)}
  </div>
)
}
