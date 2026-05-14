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

  const [gateName, setGateName] = useState('')
  const [responsibleTeam, setResponsibleTeam] = useState('')
  const [inspectorName, setInspectorName] = useState('')
  const [inspectionComments, setInspectionComments] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
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

  async function uploadEvidencePhoto(file: File) {
    const fileName = `${projectId}/${Date.now()}-${file.name}`

    const { error } = await supabase.storage
      .from('quality-evidence')
      .upload(fileName, file)

    if (error) throw error

    const { data } = supabase.storage
      .from('quality-evidence')
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  async function createGate() {
    if (!gateName || !responsibleTeam || !projectId || !inspectorName || !blocksTaskId) {
      alert('Please complete gate name, responsible team, inspector name, and blocked task.')
      return
    }

    let uploadedPhotoUrl: string | null = null

    try {
      if (selectedPhoto) {
        uploadedPhotoUrl = await uploadEvidencePhoto(selectedPhoto)
      }

      const { error } = await supabase.from('quality_gates').insert([
        {
          project_id: projectId,
          gate_name: gateName,
          gate_type: responsibleTeam,
          inspector_name: inspectorName,
          inspection_comments: inspectionComments,
          evidence_photos: uploadedPhotoUrl ? [uploadedPhotoUrl] : [],
          blocks_task_id: blocksTaskId,
          required_before_task: requiredBeforeTask,
          status: 'Pending',
        },
      ])

      if (error) {
        alert(error.message)
        return
      }

      setGateName('')
      setResponsibleTeam('')
      setInspectorName('')
      setInspectionComments('')
      setSelectedPhoto(null)
      setBlocksTaskId('')
      setRequiredBeforeTask('')

      await loadQualityGates()
      alert('Quality gate created successfully.')
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function approveGate(gate: any) {
    if (!gate.evidence_photos || gate.evidence_photos.length === 0) {
      alert('Upload evidence before approval.')
      return
    }

    const { error } = await supabase
      .from('quality_gates')
      .update({
        status: 'Approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', gate.id)

    if (error) {
      alert(error.message)
      return
    }

    await loadQualityGates()
  }

  async function rejectGate(id: string) {
    const { error } = await supabase
      .from('quality_gates')
      .update({ status: 'Rejected' })
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
          <h1 className="text-2xl font-bold text-[#ede8de]">Quality Gates</h1>
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
            value={gateName}
            onChange={e => setGateName(e.target.value)}
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

          <input
            className="form-control"
            placeholder="Inspector Name"
            value={inspectorName}
            onChange={e => setInspectorName(e.target.value)}
          />

          <textarea
            className="form-control"
            placeholder="Inspection Comments"
            value={inspectionComments}
            onChange={e => setInspectionComments(e.target.value)}
          />

          <label className="btn-ghost btn cursor-pointer">
            {selectedPhoto ? selectedPhoto.name : 'Upload Evidence Photo'}
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={e => setSelectedPhoto(e.target.files?.[0] || null)}
            />
          </label>
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
              className="card p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4"
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

                <div className="text-sm text-[#6e7d8c]">
                  Inspector: {gate.inspector_name || '—'}
                </div>

                <div className="text-sm text-[#6e7d8c] mt-1">
                  {gate.inspection_comments || 'No comments'}
                </div>

                {gate.evidence_photos?.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {gate.evidence_photos.map((photo: string) => (
                      <img
                        key={photo}
                        src={photo}
                        alt="Evidence"
                        className="w-28 h-28 object-cover rounded-lg border border-white/10"
                      />
                    ))}
                  </div>
                )}

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
                  onClick={() => approveGate(gate)}
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
