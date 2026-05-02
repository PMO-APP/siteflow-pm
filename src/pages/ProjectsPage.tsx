import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'

export default function ProjectsPage() {
  const [projects, setProjects] =
    useState<any[]>([])

  const navigate = useNavigate()

  const { setProject } =
    useProjectStore()

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    const { data } =
      await supabase
        .from('projects')
        .select('*')
        .order('id')

    setProjects(data || [])
  }

  function openProject(p: any) {
    setProject(
      p.id,
      p.project_name
    )

    navigate('/')
  }

  return (
    <div className="min-h-screen bg-[#0c1014] p-6">

      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <div className="text-3xl font-bold text-white">
            Projects Hub
          </div>

          <div className="text-slate-400 mt-1">
            Select a project to continue
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">

          {projects.map(p => (
            <div
              key={p.id}
              onClick={() =>
                openProject(p)
              }
              className="card p-5 cursor-pointer hover:border-[#c49e48] transition"
            >
              <div className="text-xl font-semibold text-white">
                {p.project_name}
              </div>

              <div className="text-sm text-slate-400 mt-1">
                {p.location || 'Nigeria'}
              </div>

              <div className="mt-4 flex justify-between text-sm">
                <span>
                  {p.status || 'Active'}
                </span>

                <span>
                  {p.completion_percent || 0}%
                </span>
              </div>

              <div className="mt-3 h-2 bg-slate-800 rounded">
                <div
                  className="h-2 bg-[#c49e48] rounded"
                  style={{
                    width: `${p.completion_percent || 0}%`
                  }}
                />
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Target:
                {' '}
                {p.handover_date || '-'}
              </div>
            </div>
          ))}

        </div>

      </div>
    </div>
  )
}
