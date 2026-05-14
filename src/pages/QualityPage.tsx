import { useTasks } from '@/hooks/useTasks'
import type { Task } from '@/types'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { ClipboardCheck, Plus } from 'lucide-react'

export default function QualityPage() {
  const { projectId } = useProjectStore()
  const { data: allTasks = [] } = useTasks()

  const tasks: Task[] = (allTasks as Task[]).filter(
    task => task.project_id === projectId
  )

  const [qualityGates, setQualityGates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [stage, setStage] = useState('')
  const [responsibleTeam, setResponsibleTeam] = useState('')
  const [blocksTaskId, setBlocksTaskId] = useState('')
  const [requiredBeforeTask, setRequiredBeforeTask] = useState('')

  useEffect(() => {
    loadQualityGates()
  }, [projectId])

  async function loadQualityGates() {
    if (!projectId) return

    setLoading(true)

    const { data, error } = await supabase
      .from('quality_gates')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) console.error(error.message)
    else setQualityGates(data || [])

    setLoading(false)
  }

  async function createGate() {
    if (!stage || !responsibleTeam || !blocksTaskId || !projectId) {
      alert('Please complete stage, responsible team, and blocked task.')
      return
    }

    const { error } = await supabase.from('quality_gates').insert([
      {
        project_id: projectId,
        gate_name: stage,
        gate_type: responsibleTeam,
        status: 'Pending',
        blocks_task_id: blocksTaskId,
        required_before_task: requiredBeforeTask,
      },
    ])

    if (error) {
      alert(error.message)
      return
    }

    setStage('')
    setResponsibleTeam('')
    setBlocksTaskId('')
    setRequiredBeforeTask('')

    await loadQualityGates()
  }

  async function approveGate(id: string) {
    const { error } = await supabase
      .from('quality_gates')
      .update({
        status: 'Approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    await loadQualityGates()
  }

  async function rejectGate(id: string) {
    const { error } = await supabase
      .from('quality_gates')
      .update({
        status: 'Rejected',
      })
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    await loadQualityGates()
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="text-[#c49e48]" size={22} />
          <h1 className="text-2xl font-bold text-[#ede8de]">
            Quality Gates
          </h1>
        </div>

        <p className="text-sm text-[#6e7d8c] mt-1">
          Construction stage approvals and hold-point control
        </p>
      </div>

      <div className="card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="form-control"
            placeholder="Gate Name, e.g. Slab Casting Sign-Off"
            value={stage}
            onChange={e => setStage(e.target.value)}
          />

          <select
            className="form-control"
            value={responsibleTeam}
            onChange={e => setResponsibleTeam(e.target.value)}
          >
            <option value="">Select Responsible Team</option>
            <option>Architectural Consultant</option>
            <option>Structural Consultant</option>
            <option>MEP Consultant</option>
            <option>Infrastructure Team</option>
            <option>PMO</option>
            <option>Design Team</option>
            <option>MEP Team</option>
            <option>Housebuild Team</option>
          </select>

          <select
            className="form-control"
            value={blocksTaskId}
            onChange={e => {
              const selectedTask = tasks.find(task => task.id === e.target.value)

              setBlocksTaskId(e.target.value)
              setRequiredBeforeTask(selectedTask?.name || '')
            }}
          >
            <option value="">Select task this gate blocks</option>

            {tasks.map(task => (
              <option key={task.id} value={task.id}>
                #{task.task_number} — {task.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={createGate}
          className="btn-gold btn flex items-center gap-2"
        >
          <Plus size={14} />
          Create Quality Gate
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-[#6e7d8c]">Loading quality gates...</div>
        ) : qualityGates.length === 0 ? (
          <div className="card p-6 text-center text-[#6e7d8c]">
            No quality gates created yet.
          </div>
        ) : (
          qualityGates.map(gate => (
            <div
              key={gate.id}
              className="card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <div className="text-lg font-semibold text-[#ede8de]">
                  {gate.gate_name}
                </div>

                <div className="text-sm text-[#6e7d8c]">
                  Responsible: {gate.gate_type || '—'}
                </div>

                <div className="text-sm text-[#6e7d8c]">
                  Blocks: {gate.required_before_task || 'No task linked'}
                </div>

                <div className="mt-2">
                  <span
                    className={`badge ${
                      gate.status === 'Approved'
                        ? 'badge-green'
                        : gate.status === 'Rejected'
                        ? 'badge-red'
                        : 'badge-amber'
                    }`}
                  >
                    {gate.status}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => approveGate(gate.id)}
                  className="btn btn-sm btn-success"
                >
                  Approve
                </button>

                <button
                  onClick={() => rejectGate(gate.id)}
                  className="btn btn-sm btn-danger"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
