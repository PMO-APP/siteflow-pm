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

  const [customAlert, setCustomAlert] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedGate, setSelectedGate] = useState<any>(null)

  useEffect(() => {
    loadQualityGates()
  }, [projectId])

  useEffect(() => {
    async function loadUserRole() {
      if (!projectId || !user?.email) {
        setProjectRole('guest')
        return
      }

      const email = user.email.trim().toLowerCase()

      console.log('Current User Email:', email)
      console.log('Current Project ID:', projectId)

     const { data, error } = await supabase
  .from('project_team_members')
  .select('role')
  .eq('project_id', projectId)
  .ilike('email', email)
  .maybeSingle()

      console.log('Role Query Result:', data)
      console.log('Role Query Error:', error)

      if (error || !data) {
        setProjectRole('guest')
        return
      }

      setProjectRole(data.role.toLowerCase())
    }

    loadUserRole()
  }, [projectId, user])

  async function loadQualityGates() {
    if (!projectId) return

    setLoading(true)

    const { data, error } = await supabase
      .from('quality_gates')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error.message)
    } else {
      setQualityGates(data || [])
    }

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
    if (
      !gateName ||
      !responsibleTeam ||
      !projectId ||
      !blocksTaskId
    ) {
      setCustomAlert(
        'Please complete gate name, responsible team, and blocked task.'
      )
      return
    }

    let uploadedPhotoUrl: string | null = null

    try {
      if (selectedPhoto) {
        uploadedPhotoUrl = await uploadEvidencePhoto(selectedPhoto)
      }

      const { error } = await supabase
        .from('quality_gates')
        .insert([
          {
            project_id: projectId,
            gate_name: gateName,
            gate_type: responsibleTeam,
            inspector_name: inspectorName || null,
            inspection_comments: inspectionComments || null,
            evidence_photos: uploadedPhotoUrl
              ? [uploadedPhotoUrl]
              : [],
            blocks_task_id: blocksTaskId,
            required_before_task: requiredBeforeTask,
            status: 'Pending',
            inspection_status: 'Not Requested',
          },
        ])

      if (error) {
        setCustomAlert(error.message)
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

      setCustomAlert('Quality gate created successfully.')
    } catch (err: any) {
      setCustomAlert(err.message)
    }
  }

  async function requestInspection(gate: any) {
    const isResubmission =
      gate.inspection_status === 'Rejected'

    const { error } = await supabase
      .from('quality_gates')
      .update({
        inspection_status: isResubmission
          ? 'Reinspection Requested'
          : 'Inspection Requested',
        requested_by:
          user?.email ||
          user?.full_name ||
          'Unknown user',
        requested_at: new Date().toISOString(),
      })
      .eq('id', gate.id)

    if (error) {
      setCustomAlert(error.message)
      return
    }

    await loadQualityGates()
  }

  async function startReview(gate: any) {
    const { error } = await supabase
      .from('quality_gates')
      .update({
        inspection_status: 'Under Review',
      })
      .eq('id', gate.id)

    if (error) {
      setCustomAlert(error.message)
      return
    }

    await loadQualityGates()
  }

  async function approveGate(gate: any) {
    if (
      !gate.evidence_photos ||
      gate.evidence_photos.length === 0
    ) {
      setCustomAlert(
        'Upload evidence before approval.'
      )
      return
    }

    const isReapproved =
      gate.rejection_reason &&
      gate.rejection_reason !== ''

    const { error } = await supabase
      .from('quality_gates')
      .update({
        status: isReapproved
          ? 'Reapproved'
          : 'Approved',
        inspection_status: isReapproved
          ? 'Reapproved'
          : 'Approved',
        approved_at: new Date().toISOString(),
        reviewed_by:
          user?.email ||
          user?.full_name ||
          'Unknown reviewer',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', gate.id)

    if (error) {
      setCustomAlert(error.message)
      return
    }

    await loadQualityGates()

    setCustomAlert(
      isReapproved
        ? 'Quality gate reapproved.'
        : 'Quality gate approved.'
    )
  }

  async function confirmRejectGate() {
    if (!selectedGate) return

    if (!rejectReason.trim()) {
      setCustomAlert(
        'Rejection reason is required.'
      )
      return
    }

    const { error } = await supabase
      .from('quality_gates')
      .update({
        status: 'Rejected',
        inspection_status: 'Rejected',
        rejection_reason: rejectReason,
        reviewed_by:
          user?.email ||
          user?.full_name ||
          'Unknown reviewer',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', selectedGate.id)

    if (error) {
      setCustomAlert(error.message)
      return
    }

    setShowRejectModal(false)
    setRejectReason('')
    setSelectedGate(null)

    await loadQualityGates()

    setCustomAlert('Quality gate rejected.')
  }

  const statusClass = (status: string) => {
    if (
      status === 'Approved' ||
      status === 'Reapproved'
    )
      return 'badge-green'

    if (status === 'Rejected')
      return 'badge-red'

    if (status === 'Under Review')
      return 'badge-blue'

    if (
      status === 'Inspection Requested' ||
      status === 'Reinspection Requested'
    )
      return 'badge-amber'

    return 'badge-muted'
  }

  const canCreateGate =
    projectRole === 'admin' ||
    projectRole === 'pmo'

  const canReview =
    projectRole === 'admin' ||
    projectRole === 'consultant' ||
    projectRole === 'pmo'

  const canRequestInspection = (gate: any) =>
    gate.inspection_status === 'Not Requested' ||
    gate.inspection_status === 'Rejected'

  const canStartReview = (gate: any) =>
    canReview &&
    (
      gate.inspection_status ===
        'Inspection Requested' ||
      gate.inspection_status ===
        'Reinspection Requested'
    )

  const canApproveOrReject = (gate: any) =>
    canReview &&
    gate.inspection_status === 'Under Review'

  const canUploadEvidence = (gate: any) =>
    gate.inspection_status !== 'Approved' &&
    gate.inspection_status !== 'Reapproved'

  return (
    <div className="space-y-6">
      {customAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-[90%] max-w-md shadow-2xl">
            <div className="text-lg font-semibold text-[#ede8de] mb-3">
              PMOCorex Notice
            </div>

            <div className="text-sm text-[#9ca3af]">
              {customAlert}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setCustomAlert('')}
                className="btn-gold btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-[90%] max-w-md shadow-2xl">
            <div className="text-lg font-semibold text-[#ede8de] mb-4">
              Reject Inspection
            </div>

            <textarea
              className="form-control w-full"
              placeholder="Why is this inspection rejected?"
              value={rejectReason}
              onChange={e =>
                setRejectReason(e.target.value)
              }
            />

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>

              <button
                onClick={confirmRejectGate}
                className="btn btn-danger"
              >
                Reject Gate
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2">
          <ClipboardCheck
            className="text-[#c49e48]"
            size={22}
          />

          <h1 className="text-2xl font-bold text-[#ede8de]">
            Quality Gates
          </h1>
        </div>

        <p className="text-sm text-[#6e7d8c] mt-1">
          Site inspection requests, reviews,
          evidence, and hold-point approvals
        </p>

        <div className="mt-3">
          <span className="badge badge-amber uppercase">
            Project Role: {projectRole}
          </span>
        </div>
      </div>

      {canCreateGate && (
        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="form-control"
              placeholder="Gate Name"
              value={gateName}
              onChange={e =>
                setGateName(e.target.value)
              }
            />

            <select
              className="form-control"
              value={responsibleTeam}
              onChange={e =>
                setResponsibleTeam(e.target.value)
              }
            >
              <option value="">
                Select Responsible Team
              </option>

              <option>
                Architectural Consultant
              </option>

              <option>
                Structural Consultant
              </option>

              <option>MEP Consultant</option>

              <option>
                Infrastructure Team
              </option>

              <option>PMO</option>

              <option>Design Team</option>

              <option>MEP Team</option>

              <option>Housebuild Team</option>
            </select>

            <select
              className="form-control"
              value={blocksTaskId}
              onChange={e => {
                const selectedTask = tasks.find(
                  task => task.id === e.target.value
                )

                setBlocksTaskId(e.target.value)

                setRequiredBeforeTask(
                  selectedTask?.name || ''
                )
              }}
            >
              <option value="">
                Select task this gate blocks
              </option>

              {tasks.map(task => (
                <option
                  key={task.id}
                  value={task.id}
                >
                  #{task.task_number} — {task.name}
                </option>
              ))}
            </select>

            <input
              className="form-control"
              placeholder="Inspector Name"
              value={inspectorName}
              onChange={e =>
                setInspectorName(e.target.value)
              }
            />

            <textarea
              className="form-control"
              placeholder="Inspection Comments"
              value={inspectionComments}
              onChange={e =>
                setInspectionComments(
                  e.target.value
                )
              }
            />

            <label className="btn-ghost btn cursor-pointer">
              {selectedPhoto
                ? selectedPhoto.name
                : 'Upload Evidence Photo'}

              <input
                type="file"
                hidden
                accept="image/*"
                onChange={e =>
                  setSelectedPhoto(
                    e.target.files?.[0] || null
                  )
                }
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
          <div className="text-[#6e7d8c]">
            Loading quality gates...
          </div>
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
                  Responsible:{' '}
                  {gate.gate_type || '—'}
                </div>

                <div className="text-sm text-[#6e7d8c]">
                  Blocks:{' '}
                  {gate.required_before_task ||
                    'No task linked'}
                </div>

                <div className="text-sm text-[#6e7d8c]">
                  Inspector:{' '}
                  {gate.inspector_name || '—'}
                </div>

                <div className="text-sm text-[#6e7d8c]">
                  Requested by:{' '}
                  {gate.requested_by ||
                    'Not requested'}
                </div>

                <div className="text-sm text-[#6e7d8c]">
                  Reviewed by:{' '}
                  {gate.reviewed_by ||
                    'Not reviewed'}
                </div>

                {gate.rejection_reason && (
                  <div className="text-sm text-red-400 mt-2">
                    Rejection Reason:{' '}
                    {gate.rejection_reason}
                  </div>
                )}

                <div className="text-sm text-[#6e7d8c] mt-1">
                  {gate.inspection_comments ||
                    'No comments'}
                </div>

                {gate.evidence_photos?.length >
                  0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {gate.evidence_photos.map(
                      (photo: string) => (
                        <img
                          key={photo}
                          src={photo}
                          alt="Evidence"
                          className="w-28 h-28 object-cover rounded-lg border border-white/10"
                        />
                      )
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-3 flex-wrap">
                  <span
                    className={`badge ${statusClass(
                      gate.inspection_status
                    )}`}
                  >
                    {gate.inspection_status}
                  </span>

                  <span
                    className={`badge ${statusClass(
                      gate.status
                    )}`}
                  >
                    {gate.status}
                  </span>
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
                        const file =
                          e.target.files?.[0]

                        if (!file) return

                        try {
                          const uploadedPhotoUrl =
                            await uploadEvidencePhoto(
                              file
                            )

                          const updatedPhotos = [
                            ...(gate.evidence_photos ||
                              []),
                            uploadedPhotoUrl,
                          ]

                          const { error } =
                            await supabase
                              .from(
                                'quality_gates'
                              )
                              .update({
                                evidence_photos:
                                  updatedPhotos,
                              })
                              .eq(
                                'id',
                                gate.id
                              )

                          if (error) {
                            setCustomAlert(
                              error.message
                            )
                            return
                          }

                          await loadQualityGates()

                          setCustomAlert(
                            'Evidence uploaded successfully.'
                          )
                        } catch (err: any) {
                          setCustomAlert(
                            err.message
                          )
                        }

                        e.target.value = ''
                      }}
                    />
                  </label>
                )}

                {canRequestInspection(gate) && (
                  <button
                    onClick={() =>
                      requestInspection(gate)
                    }
                    className="btn btn-sm btn-ghost"
                  >
                    {gate.inspection_status ===
                    'Rejected'
                      ? 'Re-submit Inspection'
                      : 'Request Inspection'}
                  </button>
                )}

                {canStartReview(gate) && (
                  <button
                    onClick={() =>
                      startReview(gate)
                    }
                    className="btn btn-sm btn-ghost"
                  >
                    Start Review
                  </button>
                )}

                {canApproveOrReject(gate) && (
                  <>
                    <button
                      onClick={() =>
                        approveGate(gate)
                      }
                      className="btn btn-sm btn-success"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => {
                        setSelectedGate(gate)
                        setShowRejectModal(
                          true
                        )
                      }}
                      className="btn btn-sm btn-danger"
                    >
                      Reject
                    </button>
                  </>
                )}

                {(gate.inspection_status ===
                  'Approved' ||
                  gate.inspection_status ===
                    'Reapproved') && (
                  <span className="badge badge-green">
                    FINAL APPROVED
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
