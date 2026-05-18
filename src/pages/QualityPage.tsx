import { useTasks } from '@/hooks/useTasks'
import type { Task } from '@/types'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useAuthStore } from '@/store/auth'
import { ClipboardCheck, Plus } from 'lucide-react'

export default function QualityPage() {
  const { projectId } = useProjectStore()
  const { user } = useAuthStore()
  const { data: allTasks = [] } = useTasks()

  const tasks: Task[] = (allTasks as Task[]).filter(
    task => task.project_id === projectId
  )

  const [qualityGates, setQualityGates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [projectRole, setProjectRole] = useState('guest')

  const [gateName, setGateName] = useState('')
  const [responsibleTeam, setResponsibleTeam] = useState('')
  const [inspectorName, setInspectorName] = useState('')
  const [inspectionComments, setInspectionComments] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [blocksTaskId, setBlocksTaskId] = useState('')
  const [requiredBeforeTask, setRequiredBeforeTask] = useState('')

  const [rejectingGate, setRejectingGate] = useState<any | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const [resubmittingGate, setResubmittingGate] = useState<any | null>(null)
  const [resubmissionComment, setResubmissionComment] = useState('')

  const [toast, setToast] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  useEffect(() => {
    loadQualityGates()
  }, [projectId])

  useEffect(() => {
    loadProjectRole()
  }, [projectId, user?.email])

  function showSuccess(message: string) {
    setToast(message)
    setToastType('success')
    setTimeout(() => setToast(''), 3000)
  }

  function showError(message: string) {
    setToast(message)
    setToastType('error')
    setTimeout(() => setToast(''), 4000)
  }

  async function loadProjectRole() {
    if (!projectId || !user?.email) {
      setProjectRole('guest')
      return
    }

    const { data, error } = await supabase
      .from('project_team_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('email', user.email)
      .maybeSingle()

    if (error) {
      console.error(error.message)
      setProjectRole('guest')
      return
    }

    setProjectRole((data?.role || 'guest').toLowerCase())
  }

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

  const userRole = projectRole

  const canCreateGate =
    ['admin', 'pmo', 'project', 'consultant', 'design'].includes(userRole)

  const isConsultantOrPMO =
    ['admin', 'pmo', 'project', 'consultant', 'design'].includes(userRole)

  const canRequestOrResubmit =
    ['admin', 'pmo', 'project', 'contractor', 'housebuild', 'mep', 'infrastructure'].includes(userRole)

  const canRequestInspection = (gate: any) =>
    canRequestOrResubmit &&
    (
      gate.inspection_status === 'Not Requested' ||
      gate.inspection_status === 'Rejected'
    )

  const canStartReview = (gate: any) =>
    isConsultantOrPMO &&
    gate.inspection_status === 'Inspection Requested'

  const canApproveOrReject = (gate: any) =>
    isConsultantOrPMO &&
    gate.inspection_status === 'Under Review' &&
    gate.status !== 'Approved' &&
    gate.status !== 'Reapproved'

  const canUploadEvidence = (gate: any) =>
    gate.inspection_status !== 'Approved' &&
    gate.inspection_status !== 'Reapproved'

  async function createGate() {
    if (!canCreateGate) {
      showError('You do not have permission to create quality gates.')
      return
    }

    if (!gateName || !responsibleTeam || !projectId || !blocksTaskId) {
      showError('Please complete all required fields.')
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
          inspector_name: inspectorName || null,
          inspection_comments: inspectionComments || null,
          evidence_photos: uploadedPhotoUrl ? [uploadedPhotoUrl] : [],
          blocks_task_id: blocksTaskId,
          required_before_task: requiredBeforeTask,
          status: 'Pending',
          inspection_status: 'Not Requested',
          was_rejected: false,
        },
      ])

      if (error) {
        showError(error.message)
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
      showSuccess('Quality gate created successfully.')
    } catch (err: any) {
      showError(err.message)
    }
  }

  async function requestInspection(gate: any, comment?: string) {
    if (!canRequestOrResubmit) {
      showError('You do not have permission to request inspections.')
      return
    }

    if (gate.inspection_status === 'Inspection Requested') {
      showError('Inspection already requested.')
      return
    }

    if (gate.status === 'Approved' || gate.status === 'Reapproved') {
      showError('This gate is already approved and locked.')
      return
    }

    const updatePayload: any = {
      inspection_status: 'Inspection Requested',
      requested_by: user?.email || user?.full_name || 'Unknown user',
      requested_at: new Date().toISOString(),
    }

    if (gate.status === 'Rejected') {
      if (!comment?.trim()) {
        showError('Please explain how the rejection has been resolved.')
        return
      }

      updatePayload.status = 'Pending'
      updatePayload.resubmission_comment = comment
    }

    const { error } = await supabase
      .from('quality_gates')
      .update(updatePayload)
      .eq('id', gate.id)

    if (error) {
      showError(error.message)
      return
    }

    setResubmittingGate(null)
    setResubmissionComment('')

    await loadQualityGates()

    showSuccess(
      gate.status === 'Rejected'
        ? 'Inspection re-submitted successfully.'
        : 'Inspection requested successfully.'
    )
  }

  async function startReview(gate: any) {
    if (!isConsultantOrPMO) {
      showError('You do not have permission to review inspections.')
      return
    }

    if (gate.status === 'Approved' || gate.status === 'Reapproved') {
      showError('This gate is already approved and locked.')
      return
    }

    const { error } = await supabase
      .from('quality_gates')
      .update({
        inspection_status: 'Under Review',
      })
      .eq('id', gate.id)

    if (error) {
      showError(error.message)
      return
    }

    await loadQualityGates()
    showSuccess('Inspection review started.')
  }

  async function approveGate(gate: any) {
    if (!isConsultantOrPMO) {
      showError('You do not have permission to approve inspections.')
      return
    }

    if (gate.status === 'Approved' || gate.status === 'Reapproved') {
      showError('This gate is already approved and locked.')
      return
    }

    if (!gate.evidence_photos || gate.evidence_photos.length === 0) {
      showError('Upload evidence before approval.')
      return
    }

    const isReapproval = gate.was_rejected === true

    const { error } = await supabase
      .from('quality_gates')
      .update({
        status: isReapproval ? 'Reapproved' : 'Approved',
        inspection_status: isReapproval ? 'Reapproved' : 'Approved',
        approved_at: new Date().toISOString(),
        reapproved_at: isReapproval ? new Date().toISOString() : null,
        reviewed_by: user?.email || user?.full_name || 'Unknown reviewer',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', gate.id)

    if (error) {
      showError(error.message)
      return
    }

    await loadQualityGates()

    showSuccess(
      isReapproval
        ? 'Inspection reapproved successfully.'
        : 'Inspection approved successfully.'
    )
  }

  async function rejectGate(gate: any, reason: string) {
    if (!isConsultantOrPMO) {
      showError('You do not have permission to reject inspections.')
      return
    }

    if (gate.status === 'Approved' || gate.status === 'Reapproved') {
      showError('This gate is already approved and locked.')
      return
    }

    if (!reason.trim()) {
      showError('Rejection reason is required.')
      return
    }

    const { error } = await supabase
      .from('quality_gates')
      .update({
        status: 'Rejected',
        inspection_status: 'Rejected',
        rejection_reason: reason,
        was_rejected: true,
        reviewed_by: user?.email || user?.full_name || 'Unknown reviewer',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', gate.id)

    if (error) {
      showError(error.message)
      return
    }

    setRejectingGate(null)
    setRejectionReason('')

    await loadQualityGates()
    showSuccess('Inspection rejected.')
  }

  const statusClass = (status: string) => {
    if (status === 'Approved') return 'badge-green'
    if (status === 'Reapproved') return 'badge-green'
    if (status === 'Rejected') return 'badge-red'
    if (status === 'Under Review') return 'badge-blue'
    if (status === 'Inspection Requested') return 'badge-amber'
    return 'badge-muted'
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-fade-in">
          <div
            className={`min-w-[320px] rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-xl ${
              toastType === 'success'
                ? 'border-emerald-500/20 bg-[#08120d]'
                : 'border-red-500/20 bg-[#140909]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                  toastType === 'success' ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />

              <div>
                <div className="text-sm font-semibold text-[#ede8de]">
                  PMOCorex
                </div>

                <div className="mt-1 text-sm text-[#b8c0cc]">
                  {toast}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="text-[#c49e48]" size={22} />
          <h1 className="text-2xl font-bold text-[#ede8de]">
            Quality Gates
          </h1>
        </div>

        <p className="text-sm text-[#6e7d8c] mt-1">
          Site inspection requests, reviews, evidence, and hold-point approvals
        </p>

        <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wider text-[#c49e48]">
          Project Role: {projectRole}
        </div>
      </div>

      {canCreateGate && (
        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="form-control"
              placeholder="Gate Name, e.g. Terrace Drainage Inspection"
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
      )}

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

                <div className="text-sm text-[#6e7d8c]">
                  Requested by: {gate.requested_by || 'Not requested'}
                </div>

                <div className="text-sm text-[#6e7d8c]">
                  Reviewed by: {gate.reviewed_by || 'Not reviewed'}
                </div>

                {gate.rejection_reason && (
                  <div className="text-sm text-red-400 mt-1">
                    Rejection reason: {gate.rejection_reason}
                  </div>
                )}

                {gate.resubmission_comment && (
                  <div className="text-sm text-emerald-400 mt-1">
                    Close-out comment: {gate.resubmission_comment}
                  </div>
                )}

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

                <div className="flex gap-2 mt-3">
                  {gate.was_rejected && (
                    <span className="badge badge-red">Rejected</span>
                  )}

                  <span className={`badge ${statusClass(gate.inspection_status)}`}>
                    {gate.inspection_status || 'Not Requested'}
                  </span>

                  {!gate.was_rejected && (
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
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                {canUploadEvidence(gate) && (
                  <label className="btn btn-sm btn-ghost cursor-pointer">
                    Upload Evidence
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return

                        try {
                          const uploadedPhotoUrl =
                            await uploadEvidencePhoto(file)

                          const updatedPhotos = [
                            ...(gate.evidence_photos || []),
                            uploadedPhotoUrl,
                          ]

                          const { error } = await supabase
                            .from('quality_gates')
                            .update({
                              evidence_photos: updatedPhotos,
                            })
                            .eq('id', gate.id)

                          if (error) {
                            showError(error.message)
                            return
                          }

                          await loadQualityGates()
                          showSuccess('Evidence uploaded successfully.')
                        } catch (err: any) {
                          showError(err.message)
                        }

                        e.target.value = ''
                      }}
                    />
                  </label>
                )}

                {canRequestInspection(gate) && (
                  <button
                    onClick={() => {
                      if (gate.status === 'Rejected') {
                        setResubmittingGate(gate)
                        setResubmissionComment('')
                      } else {
                        requestInspection(gate)
                      }
                    }}
                    className="btn btn-sm btn-ghost"
                  >
                    {gate.status === 'Rejected'
                      ? 'Re-submit Inspection'
                      : 'Request Inspection'}
                  </button>
                )}

                {canStartReview(gate) && (
                  <button
                    onClick={() => startReview(gate)}
                    className="btn btn-sm btn-ghost"
                  >
                    Start Review
                  </button>
                )}

                {canApproveOrReject(gate) && (
                  <>
                    <button
                      onClick={() => approveGate(gate)}
                      className="btn btn-sm btn-success"
                    >
                      {gate.was_rejected ? 'Reapprove' : 'Approve'}
                    </button>

                    <button
                      onClick={() => {
                        setRejectingGate(gate)
                        setRejectionReason('')
                      }}
                      className="btn btn-sm btn-danger"
                    >
                      Reject
                    </button>
                  </>
                )}

                {(gate.inspection_status === 'Approved' ||
                  gate.inspection_status === 'Reapproved') && (
                  <span className="badge badge-green">
                    {gate.inspection_status === 'Reapproved'
                      ? 'Final Reapproved'
                      : 'Final Approved'}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {rejectingGate && (
        <div className="modal-overlay">
          <div className="modal max-w-md">
            <div className="gold-bar" />

            <div className="modal-head">
              <div className="modal-title">Reject Inspection</div>
            </div>

            <div className="p-5 space-y-3">
              <div className="text-sm text-[#bfb9ae]">
                Please state why this inspection is being rejected.
              </div>

              <textarea
                className="form-control"
                rows={4}
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
              />
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setRejectingGate(null)
                  setRejectionReason('')
                }}
              >
                Cancel
              </button>

              <button
                className="btn btn-sm btn-danger"
                onClick={() => rejectGate(rejectingGate, rejectionReason)}
              >
                Reject Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {resubmittingGate && (
        <div className="modal-overlay">
          <div className="modal max-w-md">
            <div className="gold-bar" />

            <div className="modal-head">
              <div className="modal-title">Re-submit Inspection</div>
            </div>

            <div className="p-5 space-y-3">
              <div className="text-sm text-[#bfb9ae]">
                Explain how the rejection issue has been resolved before
                re-submitting.
              </div>

              <textarea
                className="form-control"
                rows={4}
                value={resubmissionComment}
                onChange={e => setResubmissionComment(e.target.value)}
                placeholder="Enter close-out comment..."
              />
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/[0.06]">
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setResubmittingGate(null)
                  setResubmissionComment('')
                }}
              >
                Cancel
              </button>

              <button
                className="btn btn-sm btn-success"
                onClick={() =>
                  requestInspection(resubmittingGate, resubmissionComment)
                }
              >
                Re-submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
