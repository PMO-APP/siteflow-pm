import { useTasks } from '@/hooks/useTasks'
import type { Task } from '@/types'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useAuthStore } from '@/store/auth'
import { ClipboardCheck, Plus } from 'lucide-react'

export default function QualityPage() {
  const { projectId, projectName } = useProjectStore()
  const { user } = useAuthStore()
  const { data: allTasks = [] } = useTasks()

  const tasks: Task[] = (allTasks as Task[]).filter(
    task => task.project_id === projectId
  )

  const [qualityGates, setQualityGates] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [projectRole, setProjectRole] = useState('guest')

  const [selectedTemplate, setSelectedTemplate] = useState('')
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

  const [showApproveModal, setShowApproveModal] = useState(false)
  const [reviewerCompany, setReviewerCompany] = useState('')
  const [reviewerSignature, setReviewerSignature] = useState('')
  const [approvalGate, setApprovalGate] = useState<any>(null)

  useEffect(() => {
    loadQualityGates()
  }, [projectId])

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    async function loadUserRole() {
      if (!projectId || !user?.email) {
        setProjectRole('guest')
        return
      }

      const email = user.email.trim().toLowerCase()

      const { data, error } = await supabase
        .from('project_team_members')
        .select('role')
        .eq('project_id', projectId)
        .ilike('email', email)
        .maybeSingle()

      if (error || !data) {
        setProjectRole('guest')
        return
      }

      setProjectRole(data.role.toLowerCase())
    }

    loadUserRole()
  }, [projectId, user])

  async function loadTemplates() {
    const { data, error } = await supabase
      .from('hold_point_templates')
      .select('*')
      .order('category', { ascending: true })
      .order('sequence_no', { ascending: true })

    if (!error) {
      setTemplates(data || [])
    }
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

  function generatePassportId() {
    const projectCode =
      projectName
        ?.split(' ')
        .filter(Boolean)
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'PRJ'

    const disciplineMap: Record<string, string> = {
      'Structural Consultant': 'STR',
      'Architectural Consultant': 'ARC',
      'MEP Consultant': 'MEP',
      'Infrastructure Team': 'INF',
      PMO: 'PMO',
      'Design Team': 'ARC',
      'MEP Team': 'MEP',
      'Housebuild Team': 'BLD',
    }

    const issueMap: Record<string, string> = {
      slab: 'STR',
      column: 'STR',
      beam: 'STR',
      reinforcement: 'STR',
      concrete: 'STR',
      blockwork: 'ARC',
      block: 'ARC',
      plaster: 'ARC',
      tile: 'ARC',
      waterproofing: 'ARC',
      roof: 'ARC',
      paint: 'ARC',
      electrical: 'MEP',
      plumbing: 'MEP',
      pipe: 'MEP',
      drainage: 'MEP',
      stormwater: 'INF',
      road: 'INF',
      manhole: 'INF',
      landscape: 'INF',
    }

    const lowerGateName = gateName.toLowerCase()

    const matchedIssue = Object.keys(issueMap).find(key =>
      lowerGateName.includes(key)
    )

    const disciplineCode = matchedIssue
      ? issueMap[matchedIssue]
      : disciplineMap[responsibleTeam] || 'GEN'

    const passportNumber = qualityGates.length + 1

    return `QG-${projectCode}-${disciplineCode}-${String(
      passportNumber
    ).padStart(4, '0')}`
  }

  function handleTemplateChange(templateId: string) {
    setSelectedTemplate(templateId)

    const template = templates.find(t => t.id === templateId)

    if (!template) return

    setGateName(template.gate_name)

    if (template.discipline === 'STR') {
      setResponsibleTeam('Structural Consultant')
    }

    if (template.discipline === 'ARC') {
      setResponsibleTeam('Architectural Consultant')
    }

    if (template.discipline === 'MEP') {
      setResponsibleTeam('MEP Consultant')
    }

    if (template.discipline === 'INF') {
      setResponsibleTeam('Infrastructure Team')
    }
  }

  async function createGate() {
    if (!gateName || !responsibleTeam || !projectId || !blocksTaskId) {
      setCustomAlert('Please complete gate name, responsible team, and blocked task.')
      return
    }

    let uploadedPhotoUrl: string | null = null
    const passportId = generatePassportId()

    try {
      if (selectedPhoto) {
        uploadedPhotoUrl = await uploadEvidencePhoto(selectedPhoto)
      }

      const { error } = await supabase.from('quality_gates').insert([
        {
          project_id: projectId,
          passport_id: passportId,
          gate_name: gateName,
          gate_type: responsibleTeam,
          inspector_name: inspectorName || null,
          inspection_comments: inspectionComments || null,
          evidence_photos: uploadedPhotoUrl ? [uploadedPhotoUrl] : [],
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

      setSelectedTemplate('')
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
    const isResubmission = gate.inspection_status === 'Rejected'

    const { error } = await supabase
      .from('quality_gates')
      .update({
        inspection_status: isResubmission
          ? 'Reinspection Requested'
          : 'Inspection Requested',
        requested_by: user?.email || user?.full_name || 'Unknown user',
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
    if (!gate) return

    if (!gate.evidence_photos || gate.evidence_photos.length === 0) {
      setCustomAlert('Upload evidence before approval.')
      return
    }

    if (!reviewerCompany.trim()) {
      setCustomAlert('Consultant company is required.')
      return
    }

    if (!reviewerSignature.trim()) {
      setCustomAlert('Digital signature is required.')
      return
    }

    const isReapproved =
      gate.rejection_reason && gate.rejection_reason !== ''

    const { error } = await supabase
      .from('quality_gates')
      .update({
        status: isReapproved ? 'Reapproved' : 'Approved',
        inspection_status: isReapproved ? 'Reapproved' : 'Approved',
        approved_at: new Date().toISOString(),
        reviewed_by: user?.email || user?.full_name || 'Unknown reviewer',
        reviewed_at: new Date().toISOString(),
        reviewer_company: reviewerCompany,
        reviewer_signature: reviewerSignature,
        digitally_signed: true,
      })
      .eq('id', gate.id)

    if (error) {
      setCustomAlert(error.message)
      return
    }

    setShowApproveModal(false)
    setReviewerCompany('')
    setReviewerSignature('')
    setApprovalGate(null)

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
      setCustomAlert('Rejection reason is required.')
      return
    }

    const { error } = await supabase
      .from('quality_gates')
      .update({
        status: 'Rejected',
        inspection_status: 'Rejected',
        rejection_reason: rejectReason,
        reviewed_by: user?.email || user?.full_name || 'Unknown reviewer',
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
    if (status === 'Approved' || status === 'Reapproved') return 'badge-green'
    if (status === 'Rejected') return 'badge-red'
    if (status === 'Under Review') return 'badge-blue'
    if (
      status === 'Inspection Requested' ||
      status === 'Reinspection Requested'
    ) return 'badge-amber'

    return 'badge-muted'
  }

  const canCreateGate = projectRole === 'admin' || projectRole === 'pmo'

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
      gate.inspection_status === 'Inspection Requested' ||
      gate.inspection_status === 'Reinspection Requested'
    )

  const canApproveOrReject = (gate: any) =>
    canReview && gate.inspection_status === 'Under Review'

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
              onChange={e => setRejectReason(e.target.value)}
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

      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#111827] border border-white/10 rounded-2xl p-6 w-[90%] max-w-md shadow-2xl">
            <div className="text-lg font-semibold text-[#ede8de] mb-4">
              Final Approval Signoff
            </div>

            <div className="space-y-4">
              <input
                className="form-control w-full"
                placeholder="Consultant / Company Name"
                value={reviewerCompany}
                onChange={e => setReviewerCompany(e.target.value)}
              />

              <input
                className="form-control w-full"
                placeholder="Digital Signature / Reviewer Name"
                value={reviewerSignature}
                onChange={e => setReviewerSignature(e.target.value)}
              />

              <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/5 p-3 text-xs text-[#bfb9ae]">
                By approving, you confirm this inspection has been reviewed and
                meets the required quality standards.
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowApproveModal(false)
                  setReviewerCompany('')
                  setReviewerSignature('')
                  setApprovalGate(null)
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>

              <button
                onClick={() => approveGate(approvalGate)}
                className="btn btn-success"
              >
                Approve & Sign
              </button>
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

        <div className="mt-3">
          <span className="badge badge-amber uppercase">
            Project Role: {projectRole}
          </span>
        </div>
      </div>

      {canCreateGate && (
        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              className="form-control"
              value={selectedTemplate}
              onChange={e => handleTemplateChange(e.target.value)}
            >
              <option value="">Select Hold Point Template</option>

              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  [{template.category}] {template.gate_name}
                </option>
              ))}
            </select>

            <input
              className="form-control"
              placeholder="Gate Name"
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
                const selectedTask = tasks.find(
                  task => task.id === e.target.value
                )

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
              className="card p-4 grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5"
            >
              <div>
                <div className="text-lg font-semibold text-[#ede8de]">
                  {gate.gate_name}
                </div>

                <div className="text-[11px] text-[#c49e48] font-mono mt-1">
                  Passport ID: {gate.passport_id || 'Not generated'}
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
                  <div className="text-sm text-red-400 mt-2">
                    Rejection Reason: {gate.rejection_reason}
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

                <div className="flex gap-2 mt-3 flex-wrap">
                  <span className={`badge ${statusClass(gate.inspection_status)}`}>
                    {gate.inspection_status}
                  </span>

                  <span className={`badge ${statusClass(gate.status)}`}>
                    {gate.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 items-stretch">
                {(gate.status === 'Approved' || gate.status === 'Reapproved') && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-emerald-400 font-semibold text-sm uppercase tracking-widest">
                          Final Approval Record
                        </div>

                        <div className="text-[11px] text-[#9ca3af] mt-1">
                          Passport ID: {gate.passport_id}
                        </div>
                      </div>

                      <div className="badge badge-green">{gate.status}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#6e7d8c]">
                          Reviewed By
                        </div>
                        <div className="text-sm text-[#ede8de]">
                          {gate.reviewed_by || '—'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#6e7d8c]">
                          Company
                        </div>
                        <div className="text-sm text-[#ede8de]">
                          {gate.reviewer_company || '—'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#6e7d8c]">
                          Digital Signature
                        </div>
                        <div className="text-sm text-[#c49e48] font-semibold">
                          {gate.reviewer_signature || '—'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#6e7d8c]">
                          Approval Date
                        </div>
                        <div className="text-sm text-[#ede8de]">
                          {gate.approved_at
                            ? new Date(gate.approved_at).toLocaleString('en-GB')
                            : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                            const uploadedPhotoUrl = await uploadEvidencePhoto(file)

                            const updatedPhotos = [
                              ...(gate.evidence_photos || []),
                              uploadedPhotoUrl,
                            ]

                            const { error } = await supabase
                              .from('quality_gates')
                              .update({ evidence_photos: updatedPhotos })
                              .eq('id', gate.id)

                            if (error) {
                              setCustomAlert(error.message)
                              return
                            }

                            await loadQualityGates()
                            setCustomAlert('Evidence uploaded successfully.')
                          } catch (err: any) {
                            setCustomAlert(err.message)
                          }

                          e.target.value = ''
                        }}
                      />
                    </label>
                  )}

                  {canRequestInspection(gate) && (
                    <button
                      onClick={() => requestInspection(gate)}
                      className="btn btn-sm btn-ghost"
                    >
                      {gate.inspection_status === 'Rejected'
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
                        onClick={() => {
                          setApprovalGate(gate)
                          setShowApproveModal(true)
                        }}
                        className="btn btn-sm btn-success"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => {
                          setSelectedGate(gate)
                          setShowRejectModal(true)
                        }}
                        className="btn btn-sm btn-danger"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {(gate.inspection_status === 'Approved' ||
                    gate.inspection_status === 'Reapproved') && (
                    <span className="badge badge-green">FINAL APPROVED</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
