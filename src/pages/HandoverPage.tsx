import { useEffect, useMemo, useState } from 'react'
import { PackageCheck, Plus, ShieldCheck, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'

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

function canEditHandover(role?: string | null) {
  return ['workspace_admin', 'admin', 'pmo', 'project_owner', 'housebuild', 'mep', 'infrastructure'].includes(role || '')
}

function canApproveHandover(role?: string | null) {
  return ['workspace_admin', 'admin', 'pmo', 'project_owner'].includes(role || '')
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

export default function HandoverPage() {
  const { user } = useAuthStore()
  const role = useMembershipStore(state => state.role)
  const { projectId, projectName, organizationId, portfolioId } = useProjectStore()

  const canEdit = canEditHandover(role)
  const canApprove = canApproveHandover(role)

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
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)

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
    const checklistDone = requiredChecklist.filter(item => ['Passed', 'N/A'].includes(item.status)).length
    const failedChecklist = checklist.filter(item => item.status === 'Failed').length
    const certDone = certificates.filter(item => item.status === 'Approved').length
    const certMissing = certificates.filter(item => ['Missing', 'Rejected'].includes(item.status)).length
    const docDone = documents.filter(item => item.status === 'Approved').length
    const docMissing = documents.filter(item => ['Missing', 'Rejected'].includes(item.status)).length
    const utilityDone = utilities.filter(item => ['Passed', 'N/A'].includes(item.status)).length
    const utilityFailed = utilities.filter(item => item.status === 'Failed').length
    const keysIssued = keys.filter(item => item.issued).length
    const signoffsDone = signoffs.filter(item => item.status === 'Approved').length
    const signoffsRejected = signoffs.filter(item => item.status === 'Rejected').length

    const readiness = Math.round([
      calcPercent(checklistDone, requiredChecklist.length),
      calcPercent(certDone, certificates.length),
      calcPercent(docDone, documents.length),
      calcPercent(utilityDone, utilities.length),
      calcPercent(keysIssued, keys.length),
      calcPercent(signoffsDone, signoffs.length),
    ].reduce((sum, value) => sum + value, 0) / 6)

    const blockers = [
      failedChecklist > 0 ? `${failedChecklist} failed checklist item(s)` : null,
      certMissing > 0 ? `${certMissing} missing/rejected certificate(s)` : null,
      docMissing > 0 ? `${docMissing} missing/rejected document(s)` : null,
      utilityFailed > 0 ? `${utilityFailed} failed utility item(s)` : null,
      keysIssued < keys.length ? `${keys.length - keysIssued} key item(s) not issued` : null,
      signoffsRejected > 0 ? `${signoffsRejected} rejected sign-off(s)` : null,
      signoffsDone < signoffs.length ? `${signoffs.length - signoffsDone} pending sign-off(s)` : null,
      checklistDone < requiredChecklist.length ? `${requiredChecklist.length - checklistDone} checklist item(s) pending` : null,
    ].filter(Boolean)

    return {
      readiness,
      checklistDone,
      requiredChecklist: requiredChecklist.length,
      certDone,
      certTotal: certificates.length,
      docDone,
      docTotal: documents.length,
      utilityDone,
      utilityTotal: utilities.length,
      keysIssued,
      keysTotal: keys.length,
      signoffsDone,
      signoffsTotal: signoffs.length,
      blockers,
      isReady: blockers.length === 0 && readiness === 100,
    }
  }, [checklist, certificates, documents, utilities, keys, signoffs])

  async function loadPackages() {
    if (!projectId) {
      setPackages([])
      setLoading(false)
      return
    }

    setLoading(true)
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
    if (!selectedPackageId && data && data.length) setSelectedPackageId(data[0].id)
    setLoading(false)
  }

  async function loadPackageDetails(packageId: string) {
    const [a, b, c, d, e, f, g] = await Promise.all([
      supabase.from('handover_checklist_items').select('*').eq('package_id', packageId).order('discipline'),
      supabase.from('handover_certificates').select('*').eq('package_id', packageId).order('certificate_type'),
      supabase.from('handover_documents').select('*').eq('package_id', packageId).order('document_type'),
      supabase.from('handover_utilities').select('*').eq('package_id', packageId).order('utility_name'),
      supabase.from('handover_keys').select('*').eq('package_id', packageId).order('key_name'),
      supabase.from('handover_signoffs').select('*').eq('package_id', packageId).order('role'),
      supabase.from('handover_history').select('*').eq('package_id', packageId).order('created_at', { ascending: false }),
    ])
    setChecklist(a.data || [])
    setCertificates(b.data || [])
    setDocuments(c.data || [])
    setUtilities(d.data || [])
    setKeys(e.data || [])
    setSignoffs(f.data || [])
    setHistory(g.data || [])
  }

  async function createPackage() {
    if (!canEdit) return setNotice('View only. You cannot create handover packages.')
    if (!projectId) return setNotice('No project selected.')
    if (!packageForm.package_name.trim()) return setNotice('Package name is required.')

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

    if (error) return setNotice(error.message)

    await supabase.rpc('seed_handover_package_defaults', { target_package_id: data.id })
    setPackageForm({ package_name: '', package_type: 'Unit', block_name: '', unit_name: '', target_handover_date: '' })
    await loadPackages()
    setSelectedPackageId(data.id)
    setNotice('Handover package created with default checklist.')
  }

  async function logHistory(action: string, details?: string) {
    if (!selectedPackageId) return
    await supabase.from('handover_history').insert({
      package_id: selectedPackageId,
      action,
      details,
      created_by: user?.id || null,
      created_by_name: user?.full_name || user?.email || null,
    })
  }

  async function updateRow(table: string, id: string, updates: Record<string, any>, action: string) {
    if (!canEdit) return setNotice('View only. You cannot update handover records.')
    const { error } = await supabase.from(table).update(updates).eq('id', id)
    if (error) return setNotice(error.message)
    await logHistory(action)
    await loadPackageDetails(selectedPackageId)
  }

  async function approvePackage() {
    if (!canApprove) return setNotice('Only PMO/Admin/Project Owner can approve handover.')
    if (!selectedPackageId) return

    if (!stats.isReady) {
      await supabase.from('handover_packages').update({ status: 'Blocked', readiness_score: stats.readiness }).eq('id', selectedPackageId)
      await logHistory('HANDOVER BLOCKED', stats.blockers.join('; '))
      await loadPackages()
      return setNotice(`Handover blocked: ${stats.blockers.join(', ')}`)
    }

    const { error } = await supabase
      .from('handover_packages')
      .update({ status: 'Handed Over', readiness_score: 100, actual_handover_date: new Date().toISOString().slice(0, 10) })
      .eq('id', selectedPackageId)

    if (error) return setNotice(error.message)
    await logHistory('HANDOVER APPROVED', 'Package marked as handed over.')
    await loadPackages()
    await loadPackageDetails(selectedPackageId)
    setNotice('Handover approved successfully.')
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">Handover Gate</div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">Handover</h1>
        <p className="text-slate-400 mt-3 max-w-3xl">Control unit, block and project handover by closing checklist items, certificates, documents, utilities, keys and sign-offs before final release.</p>
        <div className="text-xs text-[#6e7d8c] mt-4">Project: <span className="text-[#c49e48]">{projectName || 'No project selected'}</span></div>
      </section>

      {notice && <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">{notice}</div>}

      <div className="card p-4 grid grid-cols-1 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className="form-label">Select Handover Package</label>
          <select className="form-control" value={selectedPackageId} onChange={e => setSelectedPackageId(e.target.value)}>
            <option value="">Select package</option>
            {packages.map(item => <option key={item.id} value={item.id}>{item.package_name} · {item.package_type}</option>)}
          </select>
        </div>
        <input className="form-control" placeholder="Package name e.g. Block A - Unit 01" value={packageForm.package_name} disabled={!canEdit} onChange={e => setPackageForm({ ...packageForm, package_name: e.target.value })} />
        <select className="form-control" value={packageForm.package_type} disabled={!canEdit} onChange={e => setPackageForm({ ...packageForm, package_type: e.target.value })}>
          <option>Unit</option><option>Block</option><option>Project</option>
        </select>
        <input type="date" className="form-control" value={packageForm.target_handover_date} disabled={!canEdit} onChange={e => setPackageForm({ ...packageForm, target_handover_date: e.target.value })} />
        <button className="btn btn-gold" disabled={!canEdit} onClick={createPackage}><Plus size={15} /> New Package</button>
      </div>

      {loading ? (
        <div className="card p-6 text-slate-400">Loading handover data…</div>
      ) : !selectedPackage ? (
        <div className="card p-8 text-center text-[#6e7d8c]">No handover package selected. Create a unit, block or project handover package to begin.</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {TABS.map(([value, label]) => <button key={value} onClick={() => setActiveTab(value)} className={`btn btn-sm ${activeTab === value ? 'btn-gold' : 'btn-ghost'}`}>{label}</button>)}
          </div>

          {activeTab === 'dashboard' && <DashboardTab selectedPackage={selectedPackage} stats={stats} canApprove={canApprove} approvePackage={approvePackage} />}
          {activeTab === 'checklist' && <ChecklistTab checklist={checklist} updateRow={updateRow} canEdit={canEdit} />}
          {activeTab === 'certificates' && <CertificatesTab certificates={certificates} updateRow={updateRow} canEdit={canEdit} />}
          {activeTab === 'documents' && <DocumentsTab documents={documents} updateRow={updateRow} canEdit={canEdit} />}
          {activeTab === 'utilities' && <UtilitiesTab utilities={utilities} updateRow={updateRow} canEdit={canEdit} />}
          {activeTab === 'keys' && <KeysTab keys={keys} updateRow={updateRow} canEdit={canEdit} />}
          {activeTab === 'signoffs' && <SignoffsTab signoffs={signoffs} updateRow={updateRow} canEdit={canEdit} user={user} />}
          {activeTab === 'history' && <HistoryTab history={history} />}
        </>
      )}
    </div>
  )
}

function DashboardTab({ selectedPackage, stats, canApprove, approvePackage }: any) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Metric title="Readiness" value={`${stats.readiness}%`} />
        <Metric title="Checklist" value={`${stats.checklistDone}/${stats.requiredChecklist}`} />
        <Metric title="Certificates" value={`${stats.certDone}/${stats.certTotal}`} />
        <Metric title="Sign-offs" value={`${stats.signoffsDone}/${stats.signoffsTotal}`} />
      </div>
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row gap-5 lg:items-center lg:justify-between">
          <div><h2 className="text-xl font-bold text-[#ede8de]">{selectedPackage.package_name}</h2><p className="text-sm text-[#6e7d8c] mt-1">{selectedPackage.package_type} · Status: {selectedPackage.status}</p></div>
          <div className="text-center"><div className={`text-5xl font-black ${stats.isReady ? 'text-emerald-400' : 'text-red-400'}`}>{stats.isReady ? 'READY' : 'BLOCKED'}</div><div className="text-xs text-[#6e7d8c] mt-1">Handover Gate</div></div>
          <button className="btn btn-gold" disabled={!canApprove} onClick={approvePackage}><ShieldCheck size={15} /> Approve Handover</button>
        </div>
      </div>
      {!stats.isReady && <div className="card p-5 border border-red-500/20"><h3 className="font-bold text-red-400 mb-3">Handover Blockers</h3><div className="space-y-2">{stats.blockers.map((item: string) => <div key={item} className="flex items-center gap-2 text-sm text-slate-300"><XCircle size={14} className="text-red-400" />{item}</div>)}</div></div>}
    </div>
  )
}

function ChecklistTab({ checklist, updateRow, canEdit }: any) {
  return <GenericTable title="Handover Checklist" rows={checklist} columns={['Discipline', 'Category', 'Item', 'Required', 'Status', 'Remarks']} renderRow={(item: any) => [item.discipline, item.category, item.item_title, item.is_required ? 'Yes' : 'No', <StatusSelect value={item.status} options={['Pending', 'Passed', 'Failed', 'N/A']} disabled={!canEdit} onChange={(status: string) => updateRow('handover_checklist_items', item.id, { status, closed_at: ['Passed', 'Failed', 'N/A'].includes(status) ? new Date().toISOString() : null }, `Checklist updated: ${item.item_title} → ${status}`)} />, item.remarks || '—']} />
}

function CertificatesTab({ certificates, updateRow, canEdit }: any) {
  return <GenericTable title="Certificates" rows={certificates} columns={['Certificate', 'Number', 'Issued By', 'Issue Date', 'Expiry', 'Status']} renderRow={(item: any) => [item.certificate_type, item.certificate_number || '—', item.issued_by || '—', fdate(item.issue_date), fdate(item.expiry_date), <StatusSelect value={item.status} options={['Missing', 'Uploaded', 'Approved', 'Rejected']} disabled={!canEdit} onChange={(status: string) => updateRow('handover_certificates', item.id, { status }, `Certificate updated: ${item.certificate_type} → ${status}`)} />]} />
}

function DocumentsTab({ documents, updateRow, canEdit }: any) {
  return <GenericTable title="Handover Documents" rows={documents} columns={['Type', 'Title', 'Revision', 'Status', 'Remarks']} renderRow={(item: any) => [item.document_type, item.title, item.revision || '—', <StatusSelect value={item.status} options={['Missing', 'Uploaded', 'Approved', 'Rejected']} disabled={!canEdit} onChange={(status: string) => updateRow('handover_documents', item.id, { status }, `Document updated: ${item.title} → ${status}`)} />, item.remarks || '—']} />
}

function UtilitiesTab({ utilities, updateRow, canEdit }: any) {
  return <GenericTable title="Utilities & Commissioning" rows={utilities} columns={['Utility', 'Status', 'Remarks']} renderRow={(item: any) => [item.utility_name, <StatusSelect value={item.status} options={['Pending', 'Passed', 'Failed', 'N/A']} disabled={!canEdit} onChange={(status: string) => updateRow('handover_utilities', item.id, { status }, `Utility updated: ${item.utility_name} → ${status}`)} />, item.remarks || '—']} />
}

function KeysTab({ keys, updateRow, canEdit }: any) {
  return <GenericTable title="Keys" rows={keys} columns={['Key', 'Quantity', 'Issued', 'Issued To', 'Remarks']} renderRow={(item: any) => [item.key_name, item.quantity, <button className={`btn btn-sm ${item.issued ? 'btn-gold' : 'btn-ghost'}`} disabled={!canEdit} onClick={() => updateRow('handover_keys', item.id, { issued: !item.issued, issued_at: !item.issued ? new Date().toISOString() : null }, `Key status updated: ${item.key_name}`)}>{item.issued ? 'Issued' : 'Not Issued'}</button>, item.issued_to || '—', item.remarks || '—']} />
}

function SignoffsTab({ signoffs, updateRow, canEdit, user }: any) {
  return <GenericTable title="Sign-offs" rows={signoffs} columns={['Role', 'Status', 'Signed By', 'Signed At', 'Comments']} renderRow={(item: any) => [item.role, <StatusSelect value={item.status} options={['Pending', 'Approved', 'Rejected']} disabled={!canEdit} onChange={(status: string) => updateRow('handover_signoffs', item.id, { status, signed_by: status === 'Pending' ? null : user?.id || null, signed_by_name: status === 'Pending' ? null : user?.full_name || user?.email || null, signed_at: status === 'Pending' ? null : new Date().toISOString() }, `Sign-off updated: ${item.role} → ${status}`)} />, item.signed_by_name || '—', fdate(item.signed_at), item.comments || '—']} />
}

function HistoryTab({ history }: any) {
  return <GenericTable title="Handover History" rows={history} columns={['Action', 'Details', 'By', 'Date']} renderRow={(item: any) => [item.action, item.details || '—', item.created_by_name || '—', fdate(item.created_at)]} />
}

function StatusSelect({ value, options, onChange, disabled }: any) {
  return <select className={`form-control min-w-[140px] ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>{options.map((option: string) => <option key={option}>{option}</option>)}</select>
}

function GenericTable({ title, rows, columns, renderRow }: any) {
  return <div className="card overflow-hidden"><div className="px-4 py-3 border-b border-white/[0.06]"><div className="font-bold text-[#ede8de]">{title}</div></div>{rows.length === 0 ? <div className="p-6 text-sm text-[#6e7d8c]">No records found.</div> : <div className="overflow-x-auto"><table className="tbl min-w-[1000px]"><thead><tr>{columns.map((column: string) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row: any) => <tr key={row.id}>{renderRow(row).map((cell: any, index: number) => <td key={index}>{cell}</td>)}</tr>)}</tbody></table></div>}</div>
}

function Metric({ title, value }: { title: string; value: any }) {
  return <div className="card p-4"><PackageCheck size={18} className="text-[#c49e48]" /><div className="text-2xl font-black text-white mt-3">{value}</div><div className="text-[9px] uppercase tracking-widest text-[#6e7d8c] mt-1">{title}</div></div>
}
