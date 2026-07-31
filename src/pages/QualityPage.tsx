import { useTasks } from '@/hooks/useTasks'
import type { Task } from '@/types'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { isProjectAdmin } from '@/lib/permissions'
import { ClipboardCheck, Plus, ShieldCheck, AlertTriangle, CheckCircle2, Clock3, ArrowRight, UserRoundCheck } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { EnterpriseMetric, EnterpriseSection } from '@/components/ui/enterprise/EnterprisePage'
import { IntelligencePanel } from '@/components/intelligence/IntelligencePanel'
import { qualityIntelligence } from '@/lib/intelligence'
import { publishQualityGateMutationEvents } from '@/services/events/domainEventPublishers'

export default function QualityPage() {
  const { projectId, projectName } = useProjectStore()
  const { user } = useAuthStore()
  const membershipRole = useMembershipStore(state => state.role)
  const { data: allTasks = [] } = useTasks()

  const tasks: Task[] = (allTasks as Task[]).filter(
    task => task.project_id === projectId
  )

  const [qualityGates, setQualityGates] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [projectTeamRole, setProjectTeamRole] = useState<string | null>(null)

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
    async function loadProjectTeamRole() {
      if (!projectId || !user?.email) {
        setProjectTeamRole(null)
        return
      }

      const email = user.email.trim().toLowerCase()
      const { data, error } = await supabase
        .from('project_team_members')
        .select('role')
        .eq('project_id', projectId)
        .ilike('email', email)
        .maybeSingle()

      if (error) {
        console.warn('Unable to resolve project-specific quality role:', error.message)
        setProjectTeamRole(null)
        return
      }

      setProjectTeamRole(data?.role?.toLowerCase() || null)
    }

    loadProjectTeamRole()
  }, [projectId, user?.email])

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

    const keyword = template.task_keyword?.toLowerCase()

    const matchedTask = tasks.find(task => {
      const taskName = task.name?.toLowerCase() || ''
      const taskPhase = task.phase?.toLowerCase() || ''
      const taskCategory = task.category?.toLowerCase() || ''

      return (
        keyword &&
        (
          taskName.includes(keyword) ||
          taskPhase.includes(keyword) ||
          taskCategory.includes(keyword)
        )
      )
    })

    if (matchedTask) {
      setBlocksTaskId(matchedTask.id)
      setRequiredBeforeTask(matchedTask.name)
    } else {
      setBlocksTaskId('')
      setRequiredBeforeTask('')
      setCustomAlert(
        'No matching task was found for this hold point. Please check the task names or template keyword.'
      )
    }
  }

  async function createGate() {
    if (!gateName || !responsibleTeam || !projectId || !blocksTaskId) {
      setCustomAlert(
        'Please complete gate name, responsible team, and ensure a linked task is detected.'
      )
      return
    }

    let uploadedPhotoUrl: string | null = null
    const passportId = generatePassportId()

    try {
      if (selectedPhoto) {
        uploadedPhotoUrl = await uploadEvidencePhoto(selectedPhoto)
      }

      const gatePayload = {
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
          inspection_status: 'Inspection Requested',
          requested_by: user?.email || user?.full_name || 'Unknown user',
          requested_at: new Date().toISOString(),
      }
      const { data: createdGate, error } = await supabase.from('quality_gates').insert([gatePayload]).select().single()

      if (error) {
        setCustomAlert(error.message)
        return
      }

      if (createdGate) await publishQualityGateMutationEvents({ projectId, before: null, after: createdGate, source: 'ui' })

      setSelectedTemplate('')
      setGateName('')
      setResponsibleTeam('')
      setInspectorName('')
      setInspectionComments('')
      setSelectedPhoto(null)
      setBlocksTaskId('')
      setRequiredBeforeTask('')

      await loadQualityGates()
      setCustomAlert('Inspection request created successfully.')
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
    await publishQualityGateMutationEvents({ projectId: projectId!, before: gate, after: { ...gate, inspection_status: isResubmission ? 'Reinspection Requested' : 'Inspection Requested' }, source: 'ui' })

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
    await publishQualityGateMutationEvents({ projectId: projectId!, before: gate, after: { ...gate, inspection_status: 'Under Review' }, source: 'ui' })

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
    await publishQualityGateMutationEvents({ projectId: projectId!, before: gate, after: { ...gate, status: isReapproved ? 'Reapproved' : 'Approved', inspection_status: isReapproved ? 'Reapproved' : 'Approved' }, source: 'ui' })

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
    await publishQualityGateMutationEvents({ projectId: projectId!, before: selectedGate, after: { ...selectedGate, status: 'Rejected', inspection_status: 'Rejected', rejection_reason: rejectReason }, source: 'ui' })

    setShowRejectModal(false)
    setRejectReason('')
    setSelectedGate(null)

    await loadQualityGates()
    setCustomAlert('Quality gate rejected.')
  }

  async function downloadApprovalCard(gate: any) {
    const element = document.getElementById(`approval-card-${gate.id}`)

    if (!element) {
      setCustomAlert('Approval card not found.')
      return
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#111827',
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const imgHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight)
    pdf.save(`${gate.passport_id || 'approval-record'}.pdf`)
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

  const normalizedMembershipRole = membershipRole?.toLowerCase() || null
  const effectiveRole: string = isProjectAdmin(normalizedMembershipRole)
    ? (normalizedMembershipRole || 'guest')
    : projectTeamRole || normalizedMembershipRole || 'guest'

  const roleLabels: Record<string, string> = {
    workspace_admin: 'Workspace Admin',
    admin: 'Admin',
    pmo: 'PMO',
    portfolio_manager: 'Portfolio Manager',
    overall_project_owner: 'Overall Project Owner',
    project_owner: 'Project Owner',
    housebuild_project_owner: 'Housebuild Project Owner',
    mep_project_owner: 'MEP Project Owner',
    infrastructure_project_owner: 'Infrastructure Project Owner',
    contractor: 'Contractor',
    consultant: 'Consultant',
    design: 'Design',
    housebuild: 'Housebuild',
    infrastructure: 'Infrastructure',
    mep: 'MEP',
    costing: 'Costing',
    viewer: 'Viewer',
    guest: 'Guest',
  }
  const effectiveRoleLabel = roleLabels[effectiveRole] || effectiveRole.split('_').join(' ')

  const canCreateGate =
    isProjectAdmin(effectiveRole) ||
    effectiveRole === 'contractor' ||
    ['overall_project_owner', 'project_owner'].includes(effectiveRole)

  const canReview =
    isProjectAdmin(effectiveRole) ||
    effectiveRole === 'consultant'

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

  const approvedCount = qualityGates.filter(gate => gate.status === 'Approved' || gate.status === 'Reapproved').length
  const rejectedCount = qualityGates.filter(gate => gate.status === 'Rejected').length
  const reviewCount = qualityGates.filter(gate => gate.inspection_status === 'Under Review' || gate.inspection_status === 'Inspection Requested' || gate.inspection_status === 'Reinspection Requested').length
  const intelligence = qualityIntelligence(qualityGates.length, approvedCount, rejectedCount, reviewCount)

  return (
    <div className="min-h-screen bg-[#f6f5f1] text-[#18212b] -m-4 p-4 sm:-m-6 sm:p-6 lg:p-8"><div className="mx-auto max-w-[1600px] space-y-5">
      <IntelligencePanel
        title="Quality Intelligence"
        {...intelligence}
        metrics={[
          { label: 'Total gates', value: qualityGates.length },
          { label: 'Approved', value: approvedCount },
          { label: 'In review', value: reviewCount },
          { label: 'Rejected', value: rejectedCount },
        ]}
      />
      {customAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102943]/45">
          <div className="bg-white border border-[#dfe3e7] rounded-2xl p-6 w-[90%] max-w-md shadow-2xl">
            <div className="text-lg font-semibold text-[#102943] mb-3">
              PMOCorex Notice
            </div>

            <div className="text-sm text-[#65717c]">
              {customAlert}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setCustomAlert('')}
                className="inline-flex items-center gap-2 rounded-xl bg-[#123a60] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102943]/45">
          <div className="bg-white border border-[#dfe3e7] rounded-2xl p-6 w-[90%] max-w-md shadow-2xl">
            <div className="text-lg font-semibold text-[#102943] mb-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102943]/45">
          <div className="bg-white border border-[#dfe3e7] rounded-2xl p-6 w-[90%] max-w-md shadow-2xl">
            <div className="text-lg font-semibold text-[#102943] mb-4">
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

              <div className="rounded-xl border border-[#ffd0c3] bg-[#fff4ef] p-3 text-xs text-[#65717c]">
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

      <section className="overflow-hidden rounded-[28px] border border-[#dbe4ea] bg-white shadow-[0_18px_50px_rgba(16,41,67,0.06)]">
        <div className="grid lg:grid-cols-[1fr_360px]">
          <div className="relative px-6 py-7 sm:px-8 lg:px-10 lg:py-9">
            <div className="absolute right-0 top-0 h-36 w-36 rounded-bl-full bg-[#fff1ec]" aria-hidden="true" />
            <div className="relative max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ffd2c5] bg-[#fff7f3] px-3 py-1.5 text-xs font-semibold text-[#c94f32]">
                <ShieldCheck size={14} /> Quality control
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#102943] sm:text-4xl">Quality Gate Control Centre</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#65717c] sm:text-base">
                Manage inspection requests, consultant reviews, evidence and hold-point release before work proceeds.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full border border-[#dbe4ea] bg-[#f5f8fa] px-3 py-1.5 text-[#536170]">Project: <strong className="text-[#102943]">{projectName || 'Current project'}</strong></span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe0eb] bg-[#edf5f9] px-3 py-1.5 font-semibold text-[#123a60]">
                  <UserRoundCheck size={14} /> {effectiveRoleLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-[#dbe4ea] bg-[#eef5f7] px-6 py-7 lg:border-l lg:border-t-0 lg:px-8 lg:py-9">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d7d88]">Your access</div>
            <div className="mt-3 text-2xl font-semibold text-[#102943]">{effectiveRoleLabel}</div>
            <p className="mt-2 text-sm leading-6 text-[#65717c]">
              {isProjectAdmin(effectiveRole)
                ? 'Full quality-control access for this project, including inspection creation, review, approval and rejection.'
                : effectiveRole === 'consultant'
                  ? 'Review and sign off contractor inspection requests assigned to this project.'
                  : effectiveRole === 'contractor'
                    ? 'Create inspection requests and upload supporting evidence.'
                    : canCreateGate
                      ? 'Create and manage inspection requests within your assigned project responsibility.'
                      : 'View quality-control records for this project.'}
            </p>
            {canCreateGate && (
              <button
                type="button"
                onClick={() => document.getElementById('quality-request-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#123a60] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d2f50]"
              >
                New inspection request <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EnterpriseMetric label="Quality gates" value={qualityGates.length} helper="Total inspection controls" icon={ClipboardCheck}/>
        <EnterpriseMetric label="Awaiting review" value={reviewCount} helper="Requires consultant action" icon={Clock3} tone="amber"/>
        <EnterpriseMetric label="Approved" value={approvedCount} helper="Released to proceed" icon={CheckCircle2} tone="green"/>
        <EnterpriseMetric label="Rejected" value={rejectedCount} helper="Requires corrective action" icon={AlertTriangle} tone={rejectedCount ? 'red' : 'navy'}/>
      </section>

      {canCreateGate && (
        <EnterpriseSection className="scroll-mt-24" title="Request an inspection" description="Create a hold point from an approved template and attach readiness evidence.">
        <div id="quality-request-form" className="space-y-4 scroll-mt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
              <option value="">Select Responsible Consultant</option>
              <option>Architectural Consultant</option>
              <option>Structural Consultant</option>
              <option>MEP Consultant</option>
              <option>Infrastructure Team</option>
              <option>PMO</option>
            </select>

            <div className="form-control">
              {requiredBeforeTask
                ? `Linked Task: ${requiredBeforeTask}`
                : 'Linked Task will auto-fill from template'}
            </div>

            <input
              className="form-control"
              placeholder="Contractor"
              value={inspectorName}
              onChange={e => setInspectorName(e.target.value)}
            />

            <textarea
              className="form-control"
              placeholder="Contractor Comment / Readiness Note"
              value={inspectionComments}
              onChange={e => setInspectionComments(e.target.value)}
            />

            <label className="btn-ghost btn cursor-pointer">
              {selectedPhoto ? selectedPhoto.name : 'Upload Contractor Evidence'}

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
            className="inline-flex items-center gap-2 rounded-xl bg-[#123a60] px-4 py-2.5 text-sm font-semibold text-white flex items-center gap-2"
          >
            <Plus size={14} />
            Request Inspection
          </button>
        </div>
        </EnterpriseSection>
      )}

      <EnterpriseSection title="Inspection register" description="Review current quality gates, evidence and sign-off status.">
      <div className="space-y-3">
        {loading ? (
          <div className="text-[#74818d]">Loading quality gates...</div>
        ) : qualityGates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cfdbe3] bg-white p-8 text-center text-[#74818d]">
            No quality gates created yet.
          </div>
        ) : (
          qualityGates.map(gate => (
            <div
              key={gate.id}
              className="rounded-2xl border border-[#dfe3e7] bg-white p-5 shadow-[0_8px_24px_rgba(18,58,96,0.035)] grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5"
            >
              <div>
                <div className="text-lg font-semibold text-[#102943]">
                  {gate.gate_name}
                </div>

                <div className="text-[11px] text-[#df5f41] font-mono mt-1">
                  Passport ID: {gate.passport_id || 'Not generated'}
                </div>

                <div className="text-sm text-[#74818d]">
                  Responsible: {gate.gate_type || '—'}
                </div>

                <div className="text-sm text-[#74818d]">
                  Auto-blocked Task: {gate.required_before_task || 'No task linked'}
                </div>

                <div className="text-sm text-[#74818d]">
                  Raised by: {gate.inspector_name || '—'}
                </div>

                <div className="text-sm text-[#74818d]">
                  Requested by: {gate.requested_by || 'Not requested'}
                </div>

                <div className="text-sm text-[#74818d]">
                  Reviewed by: {gate.reviewed_by || 'Not reviewed'}
                </div>

                {gate.rejection_reason && (
                  <div className="text-sm text-red-400 mt-2">
                    Rejection Reason: {gate.rejection_reason}
                  </div>
                )}

                <div className="text-sm text-[#74818d] mt-1">
                  {gate.inspection_comments || 'No comments'}
                </div>

                {gate.evidence_photos?.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {gate.evidence_photos.map((photo: string) => (
                      <img
                        key={photo}
                        src={photo}
                        alt="Evidence"
                        className="w-28 h-28 object-cover rounded-lg border border-[#dfe3e7]"
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
                  <div
                    id={`approval-card-${gate.id}`}
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-emerald-400 font-semibold text-sm uppercase tracking-widest">
                          Final Approval Record
                        </div>

                        <div className="text-[11px] text-[#65717c] mt-1">
                          Passport ID: {gate.passport_id}
                        </div>
                      </div>

                      <div className="badge badge-green">{gate.status}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#74818d]">
                          Reviewed By
                        </div>
                        <div className="text-sm text-[#102943]">
                          {gate.reviewed_by || '—'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#74818d]">
                          Company
                        </div>
                        <div className="text-sm text-[#102943]">
                          {gate.reviewer_company || '—'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#74818d]">
                          Digital Signature
                        </div>
                        <div className="text-sm text-[#df5f41] font-semibold">
                          {gate.reviewer_signature || '—'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[#74818d]">
                          Approval Date
                        </div>
                        <div className="text-sm text-[#102943]">
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

                  {(gate.status === 'Approved' || gate.status === 'Reapproved') && (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span className="badge badge-green">
                        FINAL APPROVED
                      </span>

                      <button
                        type="button"
                        onClick={() => downloadApprovalCard(gate)}
                        className="btn btn-sm btn-gold"
                      >
                        Download PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </EnterpriseSection>
      </div>
    </div>
  )
}
