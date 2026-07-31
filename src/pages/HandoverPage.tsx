
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  PackageCheck,
  Plus,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from 'lucide-react'
import { EnterprisePageHero, EnterpriseNotice } from '@/components/ui/enterprise'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'

import { pmoConfirm, pmoPrompt } from '@/lib/notifications'
import { publishHandoverEvent } from '@/services/events/domainEventPublishers'
const TABS = [
  ['dashboard', 'Dashboard'],
  ['checklist', 'Checklist'],
  ['certificates', 'Certificates'],
  ['documents', 'Documents'],
  ['utilities', 'Utilities'],
  ['keys', 'Keys'],
  ['signoffs', 'Sign-offs'],
  ['history', 'History'],
]

const CHECKLIST_DEFAULTS = [
  ['Civil / Finishes', 'Internal Works', 'Internal plastering and wall finish completed'],
  ['Civil / Finishes', 'Internal Works', 'Ceiling works completed'],
  ['Civil / Finishes', 'Internal Works', 'Floor finishes completed'],
  ['Civil / Finishes', 'Internal Works', 'Wall tiles completed'],
  ['Civil / Finishes', 'Internal Works', 'Painting completed and touched up'],
  ['Civil / Finishes', 'Openings', 'Doors, locks and ironmongery installed and functional'],
  ['Civil / Finishes', 'Openings', 'Windows, glazing and accessories installed'],
  ['Civil / Finishes', 'External Works', 'External plastering/rendering completed'],
  ['Civil / Finishes', 'External Works', 'External painting completed'],
  ['Civil / Finishes', 'Cleaning', 'Final deep cleaning completed'],
  ['MEP', 'Electrical', 'DB labelled and tested'],
  ['MEP', 'Electrical', 'Sockets and switches tested'],
  ['MEP', 'Electrical', 'Lighting tested'],
  ['MEP', 'Electrical', 'Earthing test completed'],
  ['MEP', 'Plumbing', 'Water pressure test completed'],
  ['MEP', 'Plumbing', 'WCs, wash hand basins and taps tested'],
  ['MEP', 'Plumbing', 'Drainage flow test completed'],
  ['MEP', 'HVAC', 'AC installation/provision tested'],
  ['MEP', 'ELV', 'Internet/TV/data points tested where applicable'],
  ['Safety', 'Safety', 'No exposed live wires or unsafe openings'],
  ['Safety', 'Safety', 'Handrails, balustrades and guardrails complete'],
  ['QA/QC', 'Snagging', 'Internal snagging completed'],
  ['QA/QC', 'Snagging', 'Consultant snagging completed'],
  ['QA/QC', 'Snagging', 'Client-facing snags closed'],
  ['QA/QC', 'Inspection', 'Final QA/QC inspection passed'],
]

const CERTIFICATE_DEFAULTS = [
  'Practical Completion Certificate',
  'Completion Certificate',
  'Electrical Test Certificate',
  'Plumbing Pressure Test Certificate',
  'Fire Safety Certificate',
  'Waterproofing Warranty',
  'HVAC Commissioning Certificate',
  'Generator Test Certificate',
  'Lift Certificate',
  'Water Treatment Certificate',
  'Sewage / Drainage Test Certificate',
]

const DOCUMENT_DEFAULTS = [
  ['As-built Drawing', 'Architectural As-built Drawings'],
  ['As-built Drawing', 'Structural As-built Drawings'],
  ['As-built Drawing', 'MEP As-built Drawings'],
  ['O&M Manual', 'Operations and Maintenance Manual'],
  ['Warranty', 'Warranty Register'],
  ['Asset Register', 'Asset Register'],
  ['Test Report', 'Testing and Commissioning Reports'],
  ['Maintenance Schedule', 'Maintenance Schedule'],
  ['Client Guide', 'Client User Guide'],
]

const UTILITY_DEFAULTS = [
  'Power',
  'Water',
  'Drainage',
  'Sewage',
  'External Lighting',
  'Internet / ELV',
  'Fire Alarm',
  'HVAC',
  'Generator',
]

const KEY_DEFAULTS = [
  ['Main Entrance Keys', 2],
  ['Bedroom Keys', 1],
  ['Utility / Service Keys', 1],
  ['Meter / DB Keys', 1],
  ['Access Cards / Remotes', 1],
]

const SIGNOFF_DEFAULTS = [
  'Contractor',
  'Architect',
  'Structural Engineer',
  'MEP Engineer',
  'HSE',
  'QA/QC',
  'Project Manager',
  'PMO',
  'Project Owner',
  'Client',
]

function canEditHandover(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'portfolio_manager',
    'housebuild',
    'mep',
    'infrastructure',
    'hse',
  ].includes(role || '')
}

function canReviewHandover(role?: string | null) {
  return [
    'workspace_admin',
    'admin',
    'pmo',
    'project_owner',
    'portfolio_manager',
  ].includes(role || '')
}

function fdate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

function calcPercent(done: number, total: number) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

function statusBadge(status?: string | null) {
  if (['Passed', 'Approved', 'Uploaded', 'Handed Over', 'Issued'].includes(status || '')) {
    return 'badge-green'
  }

  if (['Failed', 'Rejected', 'Blocked', 'Missing', 'Not Issued'].includes(status || '')) {
    return 'badge-red'
  }

  if (['Pending', 'In Progress', 'Ready For Review'].includes(status || '')) {
    return 'badge-amber'
  }

  return 'badge-muted'
}

function hasEvidence(row: any) {
  return Boolean(row.file_url || row.evidence_url)
}

async function requireComment(message = 'Please enter a comment/reason.') {
  const comment = await pmoPrompt({ title: 'Add required details', message, inputLabel: 'Comment or reason', required: true })
  return comment?.trim() || ''
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function uploadHandoverFile({
  file,
  projectId,
  packageId,
  folder,
}: {
  file: File
  projectId: string | number
  packageId: string
  folder: string
}) {
  const bucketName = 'project-files'
  const safeName = sanitizeFileName(file.name)
  const filePath = `handover/${projectId}/${packageId}/${folder}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    console.error('Handover upload error:', uploadError)
    throw new Error(
      uploadError.message ||
        'Upload failed. Confirm the project-files bucket exists and storage policies allow authenticated uploads.'
    )
  }

  const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filePath)

  if (publicData?.publicUrl) {
    return publicData.publicUrl
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(filePath, 60 * 60 * 24 * 7)

  if (signedError) {
    console.error('Handover signed URL error:', signedError)
    throw new Error(
      signedError.message ||
        'File uploaded, but PMOCorex could not generate a view link for it.'
    )
  }

  return signedData.signedUrl
}

export default function HandoverPage() {
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const { projectId, projectName, organizationId, portfolioId } = useProjectStore()

  const canEdit = canEditHandover(role)
  const canReview = canReviewHandover(role)

  const [activeTab, setActiveTab] = useState('dashboard')
  const [packages, setPackages] = useState<any[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [checklist, setChecklist] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [utilities, setUtilities] = useState<any[]>([])
  const [keys, setKeys] = useState<any[]>([])
  const [signoffs, setSignoffs] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [projectSnags, setProjectSnags] = useState<any[]>([])
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState('')

  const [packageForm, setPackageForm] = useState({
    package_name: '',
    package_type: 'Unit',
    block_name: '',
    unit_name: '',
    target_handover_date: '',
  })

  useEffect(() => {
    loadPackages()
  }, [projectId])

  useEffect(() => {
    if (selectedPackageId) loadPackageDetails(selectedPackageId)
  }, [selectedPackageId])

  const selectedPackage = packages.find(item => item.id === selectedPackageId)

  const stats = useMemo(() => {
    const requiredChecklist = checklist.filter(item => item.is_required)
    const applicableChecklist = requiredChecklist.filter(item => item.status !== 'N/A')
    const checklistDone = applicableChecklist.filter(item => item.status === 'Passed').length
    const failedChecklist = applicableChecklist.filter(item => item.status === 'Failed').length

    const applicableCertificates = certificates.filter(item => item.status !== 'N/A')
    const certDone = applicableCertificates.filter(item => item.status === 'Approved').length
    const certMissing = applicableCertificates.filter(item =>
      ['Missing', 'Rejected'].includes(item.status)
    ).length
    const certWithoutEvidence = applicableCertificates.filter(item =>
      ['Uploaded', 'Approved'].includes(item.status) && !hasEvidence(item)
    ).length

    const applicableDocuments = documents.filter(item => item.status !== 'N/A')
    const docDone = applicableDocuments.filter(item => item.status === 'Approved').length
    const docMissing = applicableDocuments.filter(item =>
      ['Missing', 'Rejected'].includes(item.status)
    ).length
    const docWithoutEvidence = applicableDocuments.filter(item =>
      ['Uploaded', 'Approved'].includes(item.status) && !hasEvidence(item)
    ).length

    const applicableUtilities = utilities.filter(item => item.status !== 'N/A')
    const utilityDone = applicableUtilities.filter(item => item.status === 'Passed').length
    const utilityFailed = applicableUtilities.filter(item => item.status === 'Failed').length

    const keysIssued = keys.filter(item => item.issued).length

    const signoffsDone = signoffs.filter(item => item.status === 'Approved').length
    const signoffsRejected = signoffs.filter(item => item.status === 'Rejected').length

    const openSnags = projectSnags.filter(item => {
      const status = String(item.status || '').toLowerCase()
      return !['closed', 'resolved', 'completed', 'done'].includes(status)
    })

    const criticalOpenSnags = openSnags.filter(item => {
      const severity = String(item.severity || item.priority || '').toLowerCase()
      return ['critical', 'high'].includes(severity)
    })

    const categories = [
      calcPercent(checklistDone, applicableChecklist.length),
      calcPercent(certDone, applicableCertificates.length),
      calcPercent(docDone, applicableDocuments.length),
      calcPercent(utilityDone, applicableUtilities.length),
      calcPercent(keysIssued, keys.length),
      calcPercent(signoffsDone, signoffs.length),
      openSnags.length === 0 ? 100 : 0,
    ]

    const readiness = Math.round(
      categories.reduce((sum, value) => sum + value, 0) / categories.length
    )

    const blockers = [
      failedChecklist > 0 ? `${failedChecklist} failed checklist item(s)` : null,
      checklistDone < applicableChecklist.length
        ? `${applicableChecklist.length - checklistDone} checklist item(s) pending`
        : null,
      certMissing > 0 ? `${certMissing} missing/rejected certificate(s)` : null,
      certWithoutEvidence > 0 ? `${certWithoutEvidence} certificate(s) marked uploaded/approved without file evidence` : null,
      docMissing > 0 ? `${docMissing} missing/rejected document(s)` : null,
      docWithoutEvidence > 0 ? `${docWithoutEvidence} document(s) marked uploaded/approved without file evidence` : null,
      utilityFailed > 0 ? `${utilityFailed} failed utility item(s)` : null,
      keysIssued < keys.length ? `${keys.length - keysIssued} key item(s) not issued` : null,
      signoffsRejected > 0 ? `${signoffsRejected} rejected sign-off(s)` : null,
      signoffsDone < signoffs.length ? `${signoffs.length - signoffsDone} pending sign-off(s)` : null,
      criticalOpenSnags.length > 0
        ? `${criticalOpenSnags.length} critical/high snag(s) still open`
        : null,
      openSnags.length > 0 ? `${openSnags.length} total open snag(s) still unresolved` : null,
    ].filter(Boolean)

    return {
      readiness,
      checklistDone,
      requiredChecklist: applicableChecklist.length,
      certDone,
      certTotal: applicableCertificates.length,
      docDone,
      docTotal: applicableDocuments.length,
      utilityDone,
      utilityTotal: applicableUtilities.length,
      keysIssued,
      keysTotal: keys.length,
      signoffsDone,
      signoffsTotal: signoffs.length,
      openSnags: openSnags.length,
      criticalOpenSnags: criticalOpenSnags.length,
      blockers,
      isReady: blockers.length === 0 && readiness === 100,
    }
  }, [checklist, certificates, documents, utilities, keys, signoffs, projectSnags])

  async function loadPackages() {
    if (!projectId) {
      setPackages([])
      setLoading(false)
      return
    }

    setLoading(true)
    setNotice('')

    const { data, error } = await supabase
      .from('handover_packages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      setLoading(false)
      return
    }

    setPackages(data || [])

    if (!selectedPackageId && data && data.length) {
      setSelectedPackageId(data[0].id)
    }

    setLoading(false)
  }

  async function loadPackageDetails(packageId: string) {
    const [
      checklistResult,
      certificatesResult,
      documentsResult,
      utilitiesResult,
      keysResult,
      signoffsResult,
      historyResult,
      snagResult,
    ] = await Promise.all([
      supabase.from('handover_checklist_items').select('*').eq('package_id', packageId).order('discipline'),
      supabase.from('handover_certificates').select('*').eq('package_id', packageId).order('certificate_type'),
      supabase.from('handover_documents').select('*').eq('package_id', packageId).order('document_type'),
      supabase.from('handover_utilities').select('*').eq('package_id', packageId).order('utility_name'),
      supabase.from('handover_keys').select('*').eq('package_id', packageId).order('key_name'),
      supabase.from('handover_signoffs').select('*').eq('package_id', packageId).order('role'),
      supabase.from('handover_history').select('*').eq('package_id', packageId).order('created_at', { ascending: false }),
      supabase.from('snags').select('*').eq('project_id', projectId),
    ])

    if (checklistResult.error) setNotice(checklistResult.error.message)
    if (certificatesResult.error) setNotice(certificatesResult.error.message)
    if (documentsResult.error) setNotice(documentsResult.error.message)
    if (utilitiesResult.error) setNotice(utilitiesResult.error.message)
    if (keysResult.error) setNotice(keysResult.error.message)
    if (signoffsResult.error) setNotice(signoffsResult.error.message)

    setChecklist(checklistResult.data || [])
    setCertificates(certificatesResult.data || [])
    setDocuments(documentsResult.data || [])
    setUtilities(utilitiesResult.data || [])
    setKeys(keysResult.data || [])
    setSignoffs(signoffsResult.data || [])
    setHistory(historyResult.data || [])
    setProjectSnags(snagResult.data || [])
  }

  async function logHistory(action: string, details?: string, packageId = selectedPackageId) {
    if (!packageId) return

    await supabase.from('handover_history').insert({
      package_id: packageId,
      action,
      details,
      created_by: user?.id || null,
      created_by_name: user?.full_name || user?.email || null,
    })
  }

  async function createDefaultRequirements(packageId: string) {
    const actor = user?.full_name || user?.email || null

    const checklistRows = CHECKLIST_DEFAULTS.map(([discipline, category, item_title]) => ({
      package_id: packageId,
      discipline,
      category,
      item_title,
      is_required: true,
      status: 'Pending',
    }))

    const certificateRows = CERTIFICATE_DEFAULTS.map(certificate_type => ({
      package_id: packageId,
      certificate_type,
      status: 'Missing',
      uploaded_by: null,
      uploaded_by_name: null,
    }))

    const documentRows = DOCUMENT_DEFAULTS.map(([document_type, title]) => ({
      package_id: packageId,
      document_type,
      title,
      status: 'Missing',
      uploaded_by: null,
      uploaded_by_name: null,
    }))

    const utilityRows = UTILITY_DEFAULTS.map(utility_name => ({
      package_id: packageId,
      utility_name,
      status: 'Pending',
    }))

    const keyRows = KEY_DEFAULTS.map(([key_name, quantity]) => ({
      package_id: packageId,
      key_name,
      quantity,
      issued: false,
    }))

    const signoffRows = SIGNOFF_DEFAULTS.map(role => ({
      package_id: packageId,
      role,
      status: 'Pending',
    }))

    const inserts = await Promise.all([
      supabase.from('handover_checklist_items').insert(checklistRows),
      supabase.from('handover_certificates').insert(certificateRows),
      supabase.from('handover_documents').insert(documentRows),
      supabase.from('handover_utilities').insert(utilityRows),
      supabase.from('handover_keys').insert(keyRows),
      supabase.from('handover_signoffs').insert(signoffRows),
      supabase.from('handover_history').insert({
        package_id: packageId,
        action: 'PACKAGE CREATED',
        details: 'Default checklist, certificates, documents, utilities, keys and sign-offs generated.',
        created_by: user?.id || null,
        created_by_name: actor,
      }),
    ])

    const firstError = inserts.find(result => result.error)?.error
    if (firstError) throw firstError
  }

  async function backfillDefaults() {
    if (!selectedPackageId) return

    if (!canEdit) {
      setNotice('View only. You cannot generate handover requirements.')
      return
    }

    const confirmed = await pmoConfirm(
      'Generate default handover requirements for this package? Existing records will not be deleted.'
    )

    if (!confirmed) return

    try {
      await createDefaultRequirements(selectedPackageId)
      await loadPackageDetails(selectedPackageId)
      setNotice('Default handover requirements generated.')
    } catch (error: any) {
      setNotice(error.message || 'Could not generate default handover requirements.')
    }
  }

  async function createPackage() {
    if (!canEdit) {
      setNotice('View only. You cannot create handover packages.')
      return
    }

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    if (!packageForm.package_name.trim()) {
      setNotice('Package name is required.')
      return
    }

    const { data, error } = await supabase
      .from('handover_packages')
      .insert({
        organization_id: organizationId,
        portfolio_id: portfolioId,
        project_id: projectId,
        package_name: packageForm.package_name.trim(),
        package_type: packageForm.package_type,
        block_name: packageForm.block_name.trim() || null,
        unit_name: packageForm.unit_name.trim() || null,
        target_handover_date: packageForm.target_handover_date || null,
        created_by: user?.id || null,
        created_by_name: user?.full_name || user?.email || null,
      })
      .select()
      .single()

    if (error) {
      setNotice(error.message)
      return
    }

    try {
      await createDefaultRequirements(data.id)
    } catch (seedError: any) {
      setNotice(seedError.message || 'Package created, but default requirements were not generated.')
    }

    setPackageForm({
      package_name: '',
      package_type: 'Unit',
      block_name: '',
      unit_name: '',
      target_handover_date: '',
    })

    await loadPackages()
    setSelectedPackageId(data.id)
    await loadPackageDetails(data.id)
    setNotice('Handover package created with default requirements.')
  }

  async function updateRow(
    table: string,
    id: string,
    updates: Record<string, any>,
    action: string
  ) {
    if (!canEdit) {
      setNotice('View only. You cannot update handover records.')
      return
    }

    const { error } = await supabase.from(table).update(updates).eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await logHistory(action)
    await loadPackageDetails(selectedPackageId)
  }

  async function uploadEvidence(table: string, row: any, file: File, type: 'document' | 'certificate' | 'checklist' | 'utility') {
    if (!canEdit) {
      setNotice('You do not have permission to upload evidence.')
      return
    }

    if (!projectId || !selectedPackageId) {
      setNotice('Select a project and handover package before uploading evidence.')
      return
    }

    try {
      setNotice('')
      setUploadingId(row.id)

      const publicUrl = await uploadHandoverFile({
        file,
        projectId,
        packageId: selectedPackageId,
        folder: type,
      })

      const now = new Date().toISOString()
      const actorName = user?.full_name || user?.email || null

      const updates: Record<string, any> = {}

      if (type === 'document' || type === 'certificate') {
        updates.file_url = publicUrl
        updates.status = 'Uploaded'
        updates.uploaded_by = user?.id || null
        updates.uploaded_by_name = actorName
        updates.uploaded_at = now
      } else {
        updates.evidence_url = publicUrl
      }

      const { error: updateError } = await supabase
        .from(table)
        .update(updates)
        .eq('id', row.id)

      if (updateError) {
        console.error('Handover evidence DB update error:', updateError)
        throw new Error(updateError.message || 'Evidence uploaded but record could not be updated.')
      }

      await logHistory(
        `${type.toUpperCase()} EVIDENCE UPLOADED`,
        `${row.title || row.certificate_type || row.item_title || row.utility_name} evidence uploaded.`
      )

      await loadPackageDetails(selectedPackageId)
      setNotice('Evidence uploaded successfully.')
    } catch (error: any) {
      console.error('Handover evidence upload failed:', error)
      setNotice(error.message || 'Could not upload evidence. Check the project-files bucket and storage policies.')
    } finally {
      setUploadingId('')
    }
  }

  async function reviewEvidence(table: string, row: any, status: 'Approved' | 'Rejected') {
    if (!canReview) {
      setNotice('Only PMO/Admin/Project Owner can approve or reject evidence.')
      return
    }

    if (!hasEvidence(row)) {
      setNotice('You cannot approve this item until evidence has been uploaded.')
      return
    }

    let remarks = row.remarks || null

    if (status === 'Rejected') {
      const comment = await requireComment('Why is this being rejected?')
      if (!comment) {
        setNotice('Rejection comment is required.')
        return
      }
      remarks = comment
    }

    const { error } = await supabase
      .from(table)
      .update({
        status,
        remarks,
      })
      .eq('id', row.id)

    if (error) {
      setNotice(error.message)
      return
    }

    await logHistory(
      `${status.toUpperCase()}`,
      `${row.title || row.certificate_type || row.item_title || row.utility_name} ${status.toLowerCase()}.`
    )

    await loadPackageDetails(selectedPackageId)
  }

  async function approvePackage() {
    if (!canReview) {
      setNotice('Only PMO/Admin/Project Owner can approve handover.')
      return
    }

    if (!selectedPackageId) return

    if (!stats.isReady) {
      await supabase
        .from('handover_packages')
        .update({
          status: 'Blocked',
          readiness_score: stats.readiness,
        })
        .eq('id', selectedPackageId)

      await logHistory('HANDOVER BLOCKED', stats.blockers.join('; '))
      await publishHandoverEvent({ projectId: projectId!, packageId: selectedPackageId, type: 'HANDOVER_BLOCKED', priority: 'high', payload: { readiness: stats.readiness, blockers: stats.blockers } })
      await loadPackages()
      setNotice(`Handover blocked: ${stats.blockers.join(', ')}`)
      return
    }

    const { error } = await supabase
      .from('handover_packages')
      .update({
        status: 'Handed Over',
        readiness_score: 100,
        actual_handover_date: new Date().toISOString().slice(0, 10),
      })
      .eq('id', selectedPackageId)

    if (error) {
      setNotice(error.message)
      return
    }

    await logHistory('HANDOVER APPROVED', 'Package marked as handed over.')
    await publishHandoverEvent({ projectId: projectId!, packageId: selectedPackageId, type: 'HANDOVER_APPROVED', payload: { readiness: 100, actualHandoverDate: new Date().toISOString().slice(0, 10) } })
    await loadPackages()
    await loadPackageDetails(selectedPackageId)
    setNotice('Handover approved successfully.')
  }

  const hasEmptyRequirements =
    selectedPackage &&
    checklist.length === 0 &&
    certificates.length === 0 &&
    documents.length === 0 &&
    utilities.length === 0 &&
    keys.length === 0 &&
    signoffs.length === 0

  return (
    <div className="space-y-6">
      <EnterprisePageHero
        eyebrow="Digital handover"
        title="Digital Handover Centre"
        description="Control unit, block and project handover by closing checklist items, certificates, documents, utilities, keys and sign-offs before final release."
        projectName={projectName || 'No project selected'}
      >
        <div className="mt-5 rounded-xl border border-[#dbe4ea] bg-[#f7f9fa] px-4 py-3 text-xs leading-5 text-[#65717c]">Evidence rule: users upload proof first, status becomes Uploaded, and only PMO, Admin or the Project Owner can approve or reject.</div>
      </EnterprisePageHero>

      {notice && <EnterpriseNotice>{notice}</EnterpriseNotice>}

      <div className="card p-4 grid grid-cols-1 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className="form-label">Select Handover Package</label>
          <select
            className="form-control"
            value={selectedPackageId}
            onChange={e => setSelectedPackageId(e.target.value)}
          >
            <option value="">Select package</option>
            {packages.map(item => (
              <option key={item.id} value={item.id}>
                {item.package_name} · {item.package_type}
              </option>
            ))}
          </select>
        </div>

        <input
          className="form-control"
          placeholder="Package name e.g. Block A - Unit 01"
          value={packageForm.package_name}
          disabled={!canEdit}
          onChange={e => setPackageForm({ ...packageForm, package_name: e.target.value })}
        />

        <select
          className="form-control"
          value={packageForm.package_type}
          disabled={!canEdit}
          onChange={e => setPackageForm({ ...packageForm, package_type: e.target.value })}
        >
          <option>Unit</option>
          <option>Block</option>
          <option>Project</option>
        </select>

        <input
          type="date"
          className="form-control"
          value={packageForm.target_handover_date}
          disabled={!canEdit}
          onChange={e =>
            setPackageForm({ ...packageForm, target_handover_date: e.target.value })
          }
        />

        <button className="btn btn-gold" disabled={!canEdit} onClick={createPackage}>
          <Plus size={15} />
          New Package
        </button>
      </div>

      {hasEmptyRequirements && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            This package has no generated handover requirements yet. Generate defaults so the
            checklist, certificates, documents, utilities, keys and sign-offs are no longer empty.
          </div>

          <button className="btn btn-gold" onClick={backfillDefaults}>
            Generate Requirements
          </button>
        </div>
      )}

      {loading ? (
        <div className="card p-6 text-slate-400">Loading handover data…</div>
      ) : !selectedPackage ? (
        <div className="card p-8 text-center text-[#6e7d8c]">
          No handover package selected. Create a unit, block or project handover package to begin.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {TABS.map(([value, label]) => (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={`btn btn-sm ${activeTab === value ? 'btn-gold' : 'btn-ghost'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'dashboard' && (
            <DashboardTab
              selectedPackage={selectedPackage}
              stats={stats}
              canApprove={canReview}
              approvePackage={approvePackage}
            />
          )}

          {activeTab === 'checklist' && (
            <ChecklistTab
              checklist={checklist}
              updateRow={updateRow}
              uploadEvidence={uploadEvidence}
              canEdit={canEdit}
              uploadingId={uploadingId}
            />
          )}

          {activeTab === 'certificates' && (
            <CertificatesTab
              certificates={certificates}
              uploadEvidence={uploadEvidence}
              reviewEvidence={reviewEvidence}
              updateRow={updateRow}
              canEdit={canEdit}
              canReview={canReview}
              uploadingId={uploadingId}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsTab
              documents={documents}
              uploadEvidence={uploadEvidence}
              reviewEvidence={reviewEvidence}
              updateRow={updateRow}
              canEdit={canEdit}
              canReview={canReview}
              uploadingId={uploadingId}
            />
          )}

          {activeTab === 'utilities' && (
            <UtilitiesTab
              utilities={utilities}
              updateRow={updateRow}
              uploadEvidence={uploadEvidence}
              canEdit={canEdit}
              uploadingId={uploadingId}
            />
          )}

          {activeTab === 'keys' && (
            <KeysTab keys={keys} updateRow={updateRow} canEdit={canEdit} />
          )}

          {activeTab === 'signoffs' && (
            <SignoffsTab
              signoffs={signoffs}
              updateRow={updateRow}
              canEdit={canEdit}
              user={user}
            />
          )}

          {activeTab === 'history' && <HistoryTab history={history} />}
        </>
      )}
    </div>
  )
}

function DashboardTab({ selectedPackage, stats, canApprove, approvePackage }: any) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Metric title="Readiness" value={`${stats.readiness}%`} />
        <Metric title="Checklist" value={`${stats.checklistDone}/${stats.requiredChecklist}`} />
        <Metric title="Certificates" value={`${stats.certDone}/${stats.certTotal}`} />
        <Metric title="Documents" value={`${stats.docDone}/${stats.docTotal}`} />
        <Metric title="Open Snags" value={stats.openSnags} />
      </div>

      <div className="card p-6">
        <div className="flex flex-col lg:flex-row gap-5 lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#102943]">
              {selectedPackage.package_name}
            </h2>
            <p className="text-sm text-[#6e7d8c] mt-1">
              {selectedPackage.package_type} · Status: {selectedPackage.status}
            </p>
          </div>

          <div className="text-center">
            <div
              className={`text-5xl font-black ${
                stats.isReady ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {stats.isReady ? 'READY' : 'BLOCKED'}
            </div>
            <div className="text-xs text-[#6e7d8c] mt-1">Handover Gate</div>
          </div>

          <button
            className="btn btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canApprove || !stats.isReady}
            onClick={approvePackage}
            title={
              !canApprove
                ? 'Only PMO, Admin or Project Owner can approve handover.'
                : !stats.isReady
                ? 'Resolve all handover blockers before approval.'
                : 'Approve handover'
            }
          >
            <ShieldCheck size={15} />
            Approve Handover
          </button>
        </div>
      </div>

      {!stats.isReady && (
        <div className="card p-5 border border-red-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-400" />
            <h3 className="font-bold text-red-400">Handover Blockers</h3>
          </div>

          {stats.blockers.length === 0 ? (
            <div className="text-sm text-slate-400">
              No blockers were detected, but readiness is not yet 100%.
            </div>
          ) : (
            <div className="space-y-2">
              {stats.blockers.map((item: string) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                  <XCircle size={14} className="text-red-400" />
                  {item}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
            Approval is locked until all required evidence, approvals, sign-offs and project snags are closed.
          </div>
        </div>
      )}
    </div>
  )
}

function EvidenceCell({ row, table, type, canEdit, uploadEvidence, uploadingId }: any) {
  if (row.status === 'N/A') {
    return <span className="badge-muted">N/A</span>
  }

  return (
    <div className="flex items-center gap-2">
      {hasEvidence(row) ? (
        <a
          href={row.file_url || row.evidence_url}
          target="_blank"
          rel="noreferrer"
          className="btn btn-sm btn-ghost"
        >
          <Eye size={13} />
          View
        </a>
      ) : (
        <span className="text-xs text-red-400">No evidence</span>
      )}

      {canEdit && (
        <label className="btn btn-sm btn-gold cursor-pointer">
          <UploadCloud size={13} />
          {uploadingId === row.id ? 'Uploading…' : 'Upload'}
          <input
            type="file"
            className="hidden"
            disabled={uploadingId === row.id}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) uploadEvidence(table, row, file, type)
              e.currentTarget.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}

function ReviewButtons({ row, table, canReview, reviewEvidence }: any) {
  if (!canReview) {
    return <span className="text-xs text-[#6e7d8c]">Reviewer only</span>
  }

  return (
    <div className="flex gap-2">
      <button
        className="btn btn-sm btn-gold"
        disabled={!hasEvidence(row) || row.status !== 'Uploaded'}
        onClick={() => reviewEvidence(table, row, 'Approved')}
      >
        <CheckCircle size={13} />
        Approve
      </button>

      <button
        className="btn btn-sm btn-ghost"
        disabled={!hasEvidence(row) || row.status !== 'Uploaded'}
        onClick={() => reviewEvidence(table, row, 'Rejected')}
      >
        Reject
      </button>
    </div>
  )
}

function ChecklistTab({ checklist, updateRow, uploadEvidence, canEdit, uploadingId }: any) {
  return (
    <GenericTable
      title="Handover Checklist"
      rows={checklist}
      columns={['Discipline', 'Category', 'Item', 'Required', 'Evidence', 'Status', 'Action', 'Remarks']}
      renderRow={(item: any) => [
        item.discipline,
        item.category,
        item.item_title,
        item.is_required ? 'Yes' : 'No',
        <EvidenceCell
          row={item}
          table="handover_checklist_items"
          type="checklist"
          canEdit={canEdit}
          uploadEvidence={uploadEvidence}
          uploadingId={uploadingId}
        />,
        <span className={statusBadge(item.status)}>{item.status}</span>,
        <div className="flex flex-wrap gap-2">
          {item.status === 'Passed' ? (
            <span className="text-xs text-emerald-400">✓ Passed</span>
          ) : item.status === 'N/A' ? (
            <button
              className="btn btn-sm btn-ghost"
              disabled={!canEdit}
              onClick={() =>
                updateRow(
                  'handover_checklist_items',
                  item.id,
                  {
                    status: 'Pending',
                    remarks: null,
                    closed_at: null,
                  },
                  `Checklist N/A reversed: ${item.item_title}`
                )
              }
            >
              Undo N/A
            </button>
          ) : (
            <>
              <button
                className="btn btn-sm btn-gold"
                disabled={!canEdit || !hasEvidence(item)}
                onClick={async () => {
                  const comment = await requireComment('Add inspection comment for passing this item.')
                  if (!comment) return
                  updateRow(
                    'handover_checklist_items',
                    item.id,
                    {
                      status: 'Passed',
                      remarks: comment,
                      closed_at: new Date().toISOString(),
                    },
                    `Checklist passed: ${item.item_title}`
                  )
                }}
              >
                Pass
              </button>

              <button
                className="btn btn-sm btn-ghost"
                disabled={!canEdit}
                onClick={async () => {
                  const comment = await requireComment('Why did this checklist item fail?')
                  if (!comment) return
                  updateRow(
                    'handover_checklist_items',
                    item.id,
                    {
                      status: 'Failed',
                      remarks: comment,
                      closed_at: new Date().toISOString(),
                    },
                    `Checklist failed: ${item.item_title}`
                  )
                }}
              >
                Fail
              </button>

              <button
                className="btn btn-sm btn-ghost"
                disabled={!canEdit}
                onClick={async () => {
                  const comment = await requireComment('Why is this item not applicable?')
                  if (!comment) return
                  updateRow(
                    'handover_checklist_items',
                    item.id,
                    {
                      status: 'N/A',
                      remarks: comment,
                      closed_at: new Date().toISOString(),
                    },
                    `Checklist marked N/A: ${item.item_title}`
                  )
                }}
              >
                N/A
              </button>
            </>
          )}
        </div>,
        item.remarks || '—',
      ]}
    />
  )
}

function CertificatesTab({ certificates, uploadEvidence, reviewEvidence, canEdit, canReview, uploadingId, updateRow }: any) {
  return (
    <GenericTable
      title="Certificates"
      rows={certificates}
      columns={['Certificate', 'Status', 'Evidence', 'Review', 'N/A', 'Issued By', 'Remarks']}
      renderRow={(item: any) => [
        item.certificate_type,
        <span className={statusBadge(item.status)}>{item.status}</span>,
        <EvidenceCell
          row={item}
          table="handover_certificates"
          type="certificate"
          canEdit={canEdit}
          uploadEvidence={uploadEvidence}
          uploadingId={uploadingId}
        />,
        <ReviewButtons
          row={item}
          table="handover_certificates"
          canReview={canReview}
          reviewEvidence={reviewEvidence}
        />,
        item.status === 'N/A' ? (
          <button
            className="btn btn-sm btn-ghost"
            disabled={!canEdit}
            onClick={() =>
              updateRow(
                'handover_certificates',
                item.id,
                { status: 'Missing', remarks: null },
                `Certificate N/A reversed: ${item.certificate_type}`
              )
            }
          >
            Undo N/A
          </button>
        ) : (
          <button
            className="btn btn-sm btn-ghost"
            disabled={!canEdit}
            onClick={async () => {
              const comment = await requireComment('Why is this certificate not applicable?')
              if (!comment) return
              updateRow(
                'handover_certificates',
                item.id,
                { status: 'N/A', remarks: comment },
                `Certificate marked N/A: ${item.certificate_type}`
              )
            }}
          >
            N/A
          </button>
        ),
        item.issued_by || '—',
        item.remarks || '—',
      ]}
    />
  )
}

function DocumentsTab({ documents, uploadEvidence, reviewEvidence, canEdit, canReview, uploadingId, updateRow }: any) {
  return (
    <GenericTable
      title="Handover Documents"
      rows={documents}
      columns={['Type', 'Title', 'Status', 'Evidence', 'Review', 'N/A', 'Remarks']}
      renderRow={(item: any) => [
        item.document_type,
        item.title,
        <span className={statusBadge(item.status)}>{item.status}</span>,
        <EvidenceCell
          row={item}
          table="handover_documents"
          type="document"
          canEdit={canEdit}
          uploadEvidence={uploadEvidence}
          uploadingId={uploadingId}
        />,
        <ReviewButtons
          row={item}
          table="handover_documents"
          canReview={canReview}
          reviewEvidence={reviewEvidence}
        />,
        item.status === 'N/A' ? (
          <button
            className="btn btn-sm btn-ghost"
            disabled={!canEdit}
            onClick={() =>
              updateRow(
                'handover_documents',
                item.id,
                { status: 'Missing', remarks: null },
                `Document N/A reversed: ${item.title}`
              )
            }
          >
            Undo N/A
          </button>
        ) : (
          <button
            className="btn btn-sm btn-ghost"
            disabled={!canEdit}
            onClick={async () => {
              const comment = await requireComment('Why is this document not applicable?')
              if (!comment) return
              updateRow(
                'handover_documents',
                item.id,
                { status: 'N/A', remarks: comment },
                `Document marked N/A: ${item.title}`
              )
            }}
          >
            N/A
          </button>
        ),
        item.remarks || '—',
      ]}
    />
  )
}

function UtilitiesTab({ utilities, updateRow, uploadEvidence, canEdit, uploadingId }: any) {
  return (
    <GenericTable
      title="Utilities & Commissioning"
      rows={utilities}
      columns={['Utility', 'Evidence', 'Action', 'Status', 'Remarks']}
      renderRow={(item: any) => [
        item.utility_name,
        <EvidenceCell
          row={item}
          table="handover_utilities"
          type="utility"
          canEdit={canEdit}
          uploadEvidence={uploadEvidence}
          uploadingId={uploadingId}
        />,
        <div className="flex flex-wrap gap-2">
          {item.status === 'Passed' ? (
            <span className="text-xs text-emerald-400">✓ Passed</span>
          ) : item.status === 'N/A' ? (
            <button
              className="btn btn-sm btn-ghost"
              disabled={!canEdit}
              onClick={() =>
                updateRow(
                  'handover_utilities',
                  item.id,
                  { status: 'Pending', remarks: null, verified_at: null },
                  `Utility N/A reversed: ${item.utility_name}`
                )
              }
            >
              Undo N/A
            </button>
          ) : (
            <>
              <button
                className="btn btn-sm btn-gold"
                disabled={!canEdit || !hasEvidence(item)}
                onClick={async () => {
                  const comment = await requireComment('Add commissioning/utility test comment.')
                  if (!comment) return
                  updateRow(
                    'handover_utilities',
                    item.id,
                    {
                      status: 'Passed',
                      remarks: comment,
                      verified_at: new Date().toISOString(),
                    },
                    `Utility passed: ${item.utility_name}`
                  )
                }}
              >
                Pass
              </button>

              <button
                className="btn btn-sm btn-ghost"
                disabled={!canEdit}
                onClick={async () => {
                  const comment = await requireComment('Why did this utility fail?')
                  if (!comment) return
                  updateRow(
                    'handover_utilities',
                    item.id,
                    {
                      status: 'Failed',
                      remarks: comment,
                      verified_at: new Date().toISOString(),
                    },
                    `Utility failed: ${item.utility_name}`
                  )
                }}
              >
                Fail
              </button>

              <button
                className="btn btn-sm btn-ghost"
                disabled={!canEdit}
                onClick={async () => {
                  const comment = await requireComment('Why is this utility not applicable?')
                  if (!comment) return
                  updateRow(
                    'handover_utilities',
                    item.id,
                    {
                      status: 'N/A',
                      remarks: comment,
                      verified_at: new Date().toISOString(),
                    },
                    `Utility marked N/A: ${item.utility_name}`
                  )
                }}
              >
                N/A
              </button>
            </>
          )}
        </div>,
        <span className={statusBadge(item.status)}>{item.status}</span>,
        item.remarks || '—',
      ]}
    />
  )
}

function KeysTab({ keys, updateRow, canEdit }: any) {
  return (
    <GenericTable
      title="Keys"
      rows={keys}
      columns={['Key', 'Quantity', 'Issued', 'Issued To / Comment', 'Action']}
      renderRow={(item: any) => [
        item.key_name,
        item.quantity,
        item.issued ? 'Yes' : 'No',
        item.issued_to || item.remarks || '—',
        <button
          className={`btn btn-sm ${item.issued ? 'btn-gold' : 'btn-ghost'}`}
          disabled={!canEdit}
          onClick={async () => {
            if (!item.issued) {
              const recipient = await requireComment('Who received this key/item?')
              if (!recipient) return
              updateRow(
                'handover_keys',
                item.id,
                {
                  issued: true,
                  issued_to: recipient,
                  issued_at: new Date().toISOString(),
                },
                `Key issued: ${item.key_name} to ${recipient}`
              )
              return
            }

            const comment = await requireComment('Why are you reversing this key issuance?')
            if (!comment) return
            updateRow(
              'handover_keys',
              item.id,
              {
                issued: false,
                remarks: comment,
                issued_to: null,
                issued_at: null,
              },
              `Key issuance reversed: ${item.key_name}`
            )
          }}
        >
          {item.issued ? 'Reverse' : 'Issue'}
        </button>,
      ]}
    />
  )
}

function SignoffsTab({ signoffs, updateRow, canEdit, user }: any) {
  return (
    <GenericTable
      title="Sign-offs"
      rows={signoffs}
      columns={['Role', 'Status', 'Signed By', 'Signed At', 'Action', 'Comments']}
      renderRow={(item: any) => [
        item.role,
        <span className={statusBadge(item.status)}>{item.status}</span>,
        item.signed_by_name || '—',
        fdate(item.signed_at),
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-gold"
            disabled={!canEdit || item.status === 'Approved'}
            onClick={async () => {
              const comment = await requireComment('Add sign-off comment.')
              if (!comment) return
              updateRow(
                'handover_signoffs',
                item.id,
                {
                  status: 'Approved',
                  signed_by: user?.id || null,
                  signed_by_name: user?.full_name || user?.email || null,
                  signed_at: new Date().toISOString(),
                  comments: comment,
                },
                `Sign-off approved: ${item.role}`
              )
            }}
          >
            Approve
          </button>

          <button
            className="btn btn-sm btn-ghost"
            disabled={!canEdit}
            onClick={async () => {
              const comment = await requireComment('Why is this sign-off rejected?')
              if (!comment) return
              updateRow(
                'handover_signoffs',
                item.id,
                {
                  status: 'Rejected',
                  signed_by: user?.id || null,
                  signed_by_name: user?.full_name || user?.email || null,
                  signed_at: new Date().toISOString(),
                  comments: comment,
                },
                `Sign-off rejected: ${item.role}`
              )
            }}
          >
            Reject
          </button>
        </div>,
        item.comments || '—',
      ]}
    />
  )
}

function HistoryTab({ history }: any) {
  return (
    <GenericTable
      title="Handover History"
      rows={history}
      columns={['Action', 'Details', 'By', 'Date']}
      renderRow={(item: any) => [
        item.action,
        item.details || '—',
        item.created_by_name || '—',
        fdate(item.created_at),
      ]}
    />
  )
}

function GenericTable({ title, rows, columns, renderRow }: any) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="font-bold text-[#102943]">{title}</div>
      </div>

      {rows.length === 0 ? (
        <div className="p-6 text-sm text-[#6e7d8c]">No records found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="tbl min-w-[1200px]">
            <thead>
              <tr>
                {columns.map((column: string) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => (
                <tr key={row.id}>
                  {renderRow(row).map((cell: any, index: number) => (
                    <td key={index}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Metric({ title, value }: { title: string; value: any }) {
  return (
    <div className="card p-4">
      <PackageCheck size={18} className="text-[#df5f41]" />
      <div className="text-2xl font-black text-white mt-3">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-[#6e7d8c] mt-1">
        {title}
      </div>
    </div>
  )
}
