import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Printer, Trash2, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useProjectStore } from '@/store/project'

const SECTIONS = [
  'Pre-Contract',
  'Tender',
  'Contracts',
  'Post Contract',
  'Payments',
  'Procurement',
]

const STATUSES = [
  'Open',
  'In Progress',
  'Pending',
  'Approved',
  'Paid',
  'Completed',
  'Delayed',
]

const CONTRACT_TYPES = [
  'Main Contract',
  'Subcontract',
  'Consultancy',
  'Supply',
  'Service',
  'Variation',
]

const CONTRACT_STATUSES = [
  'Active',
  'Pending',
  'Completed',
  'Terminated',
  'On Hold',
]

const PAYMENT_CATEGORIES = [
  'Contract Payment',
  'Consultant Payment',
  'Supplier Payment',
  'Variation Payment',
  'Procurement Payment',
  'Retention',
]

const PAYMENT_STATUSES = ['Pending', 'Approved', 'Paid', 'Rejected', 'On Hold']

const VARIATION_TYPES = [
  'Client Change',
  'Design Change',
  'Site Condition',
  'Regulatory Requirement',
  'Value Engineering',
  'Contractor Claim',
]

const VARIATION_STATUSES = ['Pending', 'Approved', 'Rejected', 'Implemented']

const PROCUREMENT_CATEGORIES = [
  'Materials',
  'Equipment',
  'Furniture',
  'Finishes',
  'MEP',
  'Infrastructure',
  'Consultancy',
]

const PROCUREMENT_STATUSES = [
  'Pending',
  'Ordered',
  'Delivered',
  'Installed',
  'Cancelled',
]

const TABS = [
  ['report', 'Cost Report'],
  ['overview', 'Overview'],
  ['weekly', 'Weekly Updates'],
  ['contracts', 'Contracts'],
  ['payments', 'Payments'],
  ['variations', 'Variations'],
  ['procurement', 'Procurement'],
]

function formatCurrency(value: any) {
  return `₦${Number(value || 0).toLocaleString()}`
}

function fdate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB')
}

function statusBadge(status?: string | null) {
  if (['Approved', 'Paid', 'Completed', 'Delivered', 'Installed', 'Active'].includes(status || '')) {
    return 'badge-green'
  }

  if (['Rejected', 'Delayed', 'Terminated', 'Cancelled'].includes(status || '')) {
    return 'badge-red'
  }

  if (['Pending', 'Open', 'In Progress', 'On Hold', 'Ordered'].includes(status || '')) {
    return 'badge-amber'
  }

  return 'badge-muted'
}

export default function CostingPage() {
  const { user } = useAuthStore()
  const { projectId, projectName, organizationId, portfolioId } =
    useProjectStore()

  const reportRef = useRef<HTMLDivElement>(null)

  const [activeTab, setActiveTab] = useState('report')
  const [items, setItems] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [variations, setVariations] = useState<any[]>([])
  const [procurements, setProcurements] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [contractsLoading, setContractsLoading] = useState(true)
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const [reportWeek, setReportWeek] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [form, setForm] = useState({
    section: 'Pre-Contract',
    item_title: '',
    description: '',
    amount: '',
    status: 'Open',
  })

  const [contractForm, setContractForm] = useState({
    contract_title: '',
    contractor_name: '',
    contract_type: 'Main Contract',
    contract_value: '',
    amount_paid: '',
    start_date: '',
    end_date: '',
    status: 'Active',
    remarks: '',
  })

  const [paymentForm, setPaymentForm] = useState({
    payment_title: '',
    vendor_name: '',
    payment_category: 'Contract Payment',
    amount: '',
    payment_status: 'Pending',
    request_date: '',
    due_date: '',
    paid_date: '',
    remarks: '',
  })

  const [variationForm, setVariationForm] = useState({
    variation_title: '',
    contractor_name: '',
    variation_type: 'Client Change',
    amount: '',
    status: 'Pending',
    request_date: '',
    approval_date: '',
    reason: '',
    remarks: '',
  })

  const [procurementForm, setProcurementForm] = useState({
    item_name: '',
    vendor_name: '',
    procurement_category: 'Materials',
    estimated_cost: '',
    actual_cost: '',
    status: 'Pending',
    request_date: '',
    expected_delivery_date: '',
    actual_delivery_date: '',
    remarks: '',
  })

  useEffect(() => {
    loadCostReports()
    loadContracts()
    loadPayments()
    loadVariations()
    loadProcurements()
  }, [projectId, reportWeek])

  async function loadCostReports() {
    if (!projectId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('cost_reports')
      .select('*')
      .eq('project_id', projectId)
      .eq('report_week', reportWeek)
      .order('section')
      .order('created_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      setLoading(false)
      return
    }

    setItems(data || [])
    setLoading(false)
  }

  async function loadContracts() {
    if (!projectId) {
      setContractsLoading(false)
      return
    }

    setContractsLoading(true)

    const { data, error } = await supabase
      .from('cost_contracts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      setContractsLoading(false)
      return
    }

    setContracts(data || [])
    setContractsLoading(false)
  }

  async function loadPayments() {
    if (!projectId) {
      setPaymentsLoading(false)
      return
    }

    setPaymentsLoading(true)

    const { data, error } = await supabase
      .from('cost_payments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      setPaymentsLoading(false)
      return
    }

    setPayments(data || [])
    setPaymentsLoading(false)
  }

  async function loadVariations() {
    if (!projectId) return

    const { data, error } = await supabase
      .from('cost_variations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      return
    }

    setVariations(data || [])
  }

  async function loadProcurements() {
    if (!projectId) return

    const { data, error } = await supabase
      .from('cost_procurements')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) {
      setNotice(error.message)
      return
    }

    setProcurements(data || [])
  }

  async function addItem() {
    setNotice('')

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    if (!form.item_title.trim()) {
      setNotice('Item title is required.')
      return
    }

    const { error } = await supabase.from('cost_reports').insert({
      organization_id: organizationId,
      portfolio_id: portfolioId,
      project_id: projectId,
      report_week: reportWeek,
      section: form.section,
      item_title: form.item_title.trim(),
      description: form.description.trim() || null,
      amount: Number(form.amount || 0),
      status: form.status,
      created_by: user?.id || null,
      created_by_name: user?.full_name || user?.email || null,
    })

    if (error) {
      setNotice(error.message)
      return
    }

    setForm({
      section: 'Pre-Contract',
      item_title: '',
      description: '',
      amount: '',
      status: 'Open',
    })

    await loadCostReports()
  }

  async function addContract() {
    setNotice('')

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    if (!contractForm.contract_title.trim()) {
      setNotice('Contract title is required.')
      return
    }

    const { error } = await supabase.from('cost_contracts').insert({
      organization_id: organizationId,
      portfolio_id: portfolioId,
      project_id: projectId,
      contract_title: contractForm.contract_title.trim(),
      contractor_name: contractForm.contractor_name.trim() || null,
      contract_type: contractForm.contract_type,
      contract_value: Number(contractForm.contract_value || 0),
      amount_paid: Number(contractForm.amount_paid || 0),
      start_date: contractForm.start_date || null,
      end_date: contractForm.end_date || null,
      status: contractForm.status,
      remarks: contractForm.remarks.trim() || null,
      created_by: user?.id || null,
      created_by_name: user?.full_name || user?.email || null,
    })

    if (error) {
      setNotice(error.message)
      return
    }

    setContractForm({
      contract_title: '',
      contractor_name: '',
      contract_type: 'Main Contract',
      contract_value: '',
      amount_paid: '',
      start_date: '',
      end_date: '',
      status: 'Active',
      remarks: '',
    })

    await loadContracts()
  }

  async function addPayment() {
    setNotice('')

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    if (!paymentForm.payment_title.trim()) {
      setNotice('Payment title is required.')
      return
    }

    const { error } = await supabase.from('cost_payments').insert({
      organization_id: organizationId,
      portfolio_id: portfolioId,
      project_id: projectId,
      payment_title: paymentForm.payment_title.trim(),
      vendor_name: paymentForm.vendor_name.trim() || null,
      payment_category: paymentForm.payment_category,
      amount: Number(paymentForm.amount || 0),
      payment_status: paymentForm.payment_status,
      request_date: paymentForm.request_date || null,
      due_date: paymentForm.due_date || null,
      paid_date: paymentForm.paid_date || null,
      remarks: paymentForm.remarks.trim() || null,
      created_by: user?.id || null,
      created_by_name: user?.full_name || user?.email || null,
    })

    if (error) {
      setNotice(error.message)
      return
    }

    setPaymentForm({
      payment_title: '',
      vendor_name: '',
      payment_category: 'Contract Payment',
      amount: '',
      payment_status: 'Pending',
      request_date: '',
      due_date: '',
      paid_date: '',
      remarks: '',
    })

    await loadPayments()
  }

  async function addVariation() {
    setNotice('')

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    if (!variationForm.variation_title.trim()) {
      setNotice('Variation title is required.')
      return
    }

    const { error } = await supabase.from('cost_variations').insert({
      organization_id: organizationId,
      portfolio_id: portfolioId,
      project_id: projectId,
      variation_title: variationForm.variation_title.trim(),
      contractor_name: variationForm.contractor_name.trim() || null,
      variation_type: variationForm.variation_type,
      amount: Number(variationForm.amount || 0),
      status: variationForm.status,
      request_date: variationForm.request_date || null,
      approval_date: variationForm.approval_date || null,
      reason: variationForm.reason.trim() || null,
      remarks: variationForm.remarks.trim() || null,
      created_by: user?.id || null,
      created_by_name: user?.full_name || user?.email || null,
    })

    if (error) {
      setNotice(error.message)
      return
    }

    setVariationForm({
      variation_title: '',
      contractor_name: '',
      variation_type: 'Client Change',
      amount: '',
      status: 'Pending',
      request_date: '',
      approval_date: '',
      reason: '',
      remarks: '',
    })

    await loadVariations()
  }

  async function addProcurement() {
    setNotice('')

    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    if (!procurementForm.item_name.trim()) {
      setNotice('Procurement item name is required.')
      return
    }

    const { error } = await supabase.from('cost_procurements').insert({
      organization_id: organizationId,
      portfolio_id: portfolioId,
      project_id: projectId,
      item_name: procurementForm.item_name.trim(),
      vendor_name: procurementForm.vendor_name.trim() || null,
      procurement_category: procurementForm.procurement_category,
      estimated_cost: Number(procurementForm.estimated_cost || 0),
      actual_cost: Number(procurementForm.actual_cost || 0),
      status: procurementForm.status,
      request_date: procurementForm.request_date || null,
      expected_delivery_date:
        procurementForm.expected_delivery_date || null,
      actual_delivery_date: procurementForm.actual_delivery_date || null,
      remarks: procurementForm.remarks.trim() || null,
      created_by: user?.id || null,
      created_by_name: user?.full_name || user?.email || null,
    })

    if (error) {
      setNotice(error.message)
      return
    }

    setProcurementForm({
      item_name: '',
      vendor_name: '',
      procurement_category: 'Materials',
      estimated_cost: '',
      actual_cost: '',
      status: 'Pending',
      request_date: '',
      expected_delivery_date: '',
      actual_delivery_date: '',
      remarks: '',
    })

    await loadProcurements()
  }

  async function deleteItem(id: string) {
    const confirmed = window.confirm('Delete this cost report item?')
    if (!confirmed) return

    const { error } = await supabase.from('cost_reports').delete().eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadCostReports()
  }

  async function deleteContract(id: string) {
    const confirmed = window.confirm('Delete this contract?')
    if (!confirmed) return

    const { error } = await supabase.from('cost_contracts').delete().eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadContracts()
  }

  async function deletePayment(id: string) {
    const confirmed = window.confirm('Delete this payment record?')
    if (!confirmed) return

    const { error } = await supabase.from('cost_payments').delete().eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadPayments()
  }

  async function deleteVariation(id: string) {
    const confirmed = window.confirm('Delete this variation?')
    if (!confirmed) return

    const { error } = await supabase.from('cost_variations').delete().eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadVariations()
  }

  async function deleteProcurement(id: string) {
    const confirmed = window.confirm('Delete this procurement item?')
    if (!confirmed) return

    const { error } = await supabase
      .from('cost_procurements')
      .delete()
      .eq('id', id)

    if (error) {
      setNotice(error.message)
      return
    }

    await loadProcurements()
  }

  async function submitReport() {
    if (!projectId) {
      setNotice('No project selected.')
      return
    }

    const { error } = await supabase.from('cost_report_submissions').insert({
      organization_id: organizationId,
      portfolio_id: portfolioId,
      project_id: projectId,
      report_week: reportWeek,
      submitted_by: user?.id || null,
      submitted_by_name: user?.full_name || user?.email || null,
      status: 'Submitted',
    })

    if (error) {
      setNotice(error.message)
      return
    }

    setNotice('Weekly cost report submitted successfully.')
  }

  function printReport() {
    if (!reportRef.current) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Cost Report</title>
          <style>
            body { margin: 0; background: white; }
            @page { size: A4; margin: 0; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>${reportRef.current.innerHTML}</body>
      </html>
    `)

    printWindow.document.close()

    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }, 700)
  }

  const groupedItems = useMemo(() => {
    return SECTIONS.map(section => ({
      section,
      items: items.filter(item => item.section === section),
    }))
  }, [items])

  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  )

  const pendingAmount = items
    .filter(item => ['Open', 'Pending', 'In Progress'].includes(item.status))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const paidAmount = items
    .filter(item => item.status === 'Paid')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const totalContractValue = contracts.reduce(
    (sum, item) => sum + Number(item.contract_value || 0),
    0
  )

  const totalPaidOnContracts = contracts.reduce(
    (sum, item) => sum + Number(item.amount_paid || 0),
    0
  )

  const outstandingContractValue = totalContractValue - totalPaidOnContracts

  const totalPayments = payments.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  )

  const pendingPayments = payments
    .filter(item => item.payment_status === 'Pending')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const paidPayments = payments
    .filter(item => item.payment_status === 'Paid')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const approvedVariationValue = variations
    .filter(item => item.status === 'Approved')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const pendingVariationValue = variations
    .filter(item => item.status === 'Pending')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const forecastFinalCost =
    totalContractValue + approvedVariationValue + pendingVariationValue

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          Cost Control
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Costing
        </h1>

        <p className="text-slate-400 mt-3 max-w-2xl">
          Weekly cost reports, payments, contracts, variations and procurement
          updates for PMO executive reporting.
        </p>

        <div className="text-xs text-[#6e7d8c] mt-4">
          Project:{' '}
          <span className="text-[#c49e48]">
            {projectName || 'No project selected'}
          </span>
        </div>
      </section>

      {notice && (
        <div className="rounded-xl border border-[#c49e48]/20 bg-[#c49e48]/10 p-3 text-sm text-[#ede8de]">
          {notice}
        </div>
      )}

      <div className="card p-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <label className="form-label">Report Week</label>
          <input
            type="date"
            className="form-control"
            value={reportWeek}
            onChange={e => setReportWeek(e.target.value)}
          />
        </div>

        <button className="btn btn-gold" onClick={printReport}>
          <Printer size={15} />
          Print / Download Cost Report
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`btn btn-sm ${
              activeTab === value ? 'btn-gold' : 'btn-ghost'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'report' && (
        <div ref={reportRef}>
          <CostReportDocument
            projectName={projectName}
            reportWeek={reportWeek}
            preparedBy={user?.full_name || user?.email || '—'}
            groupedItems={groupedItems}
            items={items}
            contracts={contracts}
            payments={payments}
            variations={variations}
            procurements={procurements}
            totalAmount={totalAmount}
            pendingAmount={pendingAmount}
            paidAmount={paidAmount}
            totalContractValue={totalContractValue}
            totalPaidOnContracts={totalPaidOnContracts}
            outstandingContractValue={outstandingContractValue}
            totalPayments={totalPayments}
            pendingPayments={pendingPayments}
            paidPayments={paidPayments}
            approvedVariationValue={approvedVariationValue}
            pendingVariationValue={pendingVariationValue}
            forecastFinalCost={forecastFinalCost}
          />
        </div>
      )}

      {activeTab === 'overview' && (
        <CostOverviewTab
          totalContractValue={totalContractValue}
          totalPaidOnContracts={totalPaidOnContracts}
          outstandingContractValue={outstandingContractValue}
          pendingPayments={pendingPayments}
          paidPayments={paidPayments}
          contracts={contracts}
          payments={payments}
          approvedVariationValue={approvedVariationValue}
          pendingVariationValue={pendingVariationValue}
          forecastFinalCost={forecastFinalCost}
        />
      )}

      {activeTab === 'weekly' && (
        <>
          <MetricGrid
            values={[
              ['Total Items', items.length],
              ['Total Amount', formatCurrency(totalAmount)],
              ['Pending Amount', formatCurrency(pendingAmount)],
              ['Paid Amount', formatCurrency(paidAmount)],
            ]}
          />

          <WeeklyReportTab
            reportWeek={reportWeek}
            setReportWeek={setReportWeek}
            form={form}
            setForm={setForm}
            groupedItems={groupedItems}
            loading={loading}
            onAdd={addItem}
            onDelete={deleteItem}
            onSubmit={submitReport}
          />
        </>
      )}

      {activeTab === 'contracts' && (
        <>
          <MetricGrid
            values={[
              ['Contracts', contracts.length],
              ['Contract Value', formatCurrency(totalContractValue)],
              ['Amount Paid', formatCurrency(totalPaidOnContracts)],
              ['Outstanding', formatCurrency(outstandingContractValue)],
            ]}
          />

          <ContractsTab
            contracts={contracts}
            loading={contractsLoading}
            form={contractForm}
            setForm={setContractForm}
            onAdd={addContract}
            onDelete={deleteContract}
          />
        </>
      )}

      {activeTab === 'payments' && (
        <>
          <MetricGrid
            values={[
              ['Payments', payments.length],
              ['Total Value', formatCurrency(totalPayments)],
              ['Pending', formatCurrency(pendingPayments)],
              ['Paid', formatCurrency(paidPayments)],
            ]}
          />

          <PaymentsTab
            payments={payments}
            loading={paymentsLoading}
            form={paymentForm}
            setForm={setPaymentForm}
            onAdd={addPayment}
            onDelete={deletePayment}
          />
        </>
      )}

      {activeTab === 'variations' && (
        <VariationsTab
          variations={variations}
          form={variationForm}
          setForm={setVariationForm}
          onAdd={addVariation}
          onDelete={deleteVariation}
        />
      )}

      {activeTab === 'procurement' && (
        <ProcurementTab
          procurements={procurements}
          form={procurementForm}
          setForm={setProcurementForm}
          onAdd={addProcurement}
          onDelete={deleteProcurement}
        />
      )}
    </div>
  )
}

function CostReportDocument({
  projectName,
  reportWeek,
  preparedBy,
  groupedItems,
  items,
  contracts,
  payments,
  variations,
  procurements,
  totalAmount,
  pendingAmount,
  paidAmount,
  totalContractValue,
  totalPaidOnContracts,
  outstandingContractValue,
  totalPayments,
  pendingPayments,
  paidPayments,
  approvedVariationValue,
  pendingVariationValue,
  forecastFinalCost,
}: any) {
  const activeContracts = contracts.filter((item: any) => item.status === 'Active')
  const pendingPaymentRows = payments.filter((item: any) => item.payment_status === 'Pending')
  const pendingVariations = variations.filter((item: any) => item.status === 'Pending')
  const pendingProcurements = procurements.filter((item: any) => item.status === 'Pending' || item.status === 'Ordered')

  return (
    <div className="cost-report-document">
      <style>{`
        .cost-report-document {
          background: white;
          color: #111827;
          width: 210mm;
          min-height: 297mm;
          padding: 16mm;
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.45;
          box-sizing: border-box;
        }

        .cr-border {
          border: 2px solid #c49e48;
          padding: 12px;
          margin-bottom: 16px;
        }

        .cr-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #d6c38a;
          padding-bottom: 10px;
          margin-bottom: 14px;
          letter-spacing: 0.12em;
          font-weight: 800;
        }

        .cr-title {
          text-align: center;
          font-size: 26px;
          font-weight: 900;
          margin: 16px 0;
          text-transform: uppercase;
        }

        .cr-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .cr-info {
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 8px;
        }

        .cr-label {
          font-size: 9px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .cr-value {
          font-weight: 700;
          margin-top: 3px;
        }

        .cr-section {
          margin-top: 16px;
          page-break-inside: avoid;
        }

        .cr-section-title {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7a5a12;
          border-bottom: 1px solid #d6c38a;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }

        .cr-table {
          width: 100%;
          border-collapse: collapse;
        }

        .cr-table th,
        .cr-table td {
          border: 1px solid #333;
          padding: 6px;
          vertical-align: top;
          font-size: 11px;
        }

        .cr-table th {
          background: #f3f4f6;
          font-weight: 800;
        }

        .cr-box {
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 10px;
          min-height: 36px;
          white-space: pre-wrap;
        }

        .cr-footer {
          border-top: 1px solid #ddd;
          margin-top: 24px;
          padding-top: 8px;
          font-size: 10px;
          color: #666;
        }

        @media print {
          .cost-report-document {
            width: auto;
            min-height: auto;
            padding: 14mm;
          }
        }
      `}</style>

      <div className="cr-border">
        <div className="cr-top">
          <div>MIXTA AFRICA</div>
          <div>PMOCOREX</div>
        </div>

        <div className="cr-title">{projectName || 'Project'}</div>

        <div className="cr-grid">
          <CostInfo label="Report Type" value="Cost Weekly Report" />
          <CostInfo label="Report Week" value={fdate(reportWeek)} />
          <CostInfo label="Prepared By" value={preparedBy} />
        </div>
      </div>

      <CostSection title="Executive Cost Summary">
        <div className="cr-grid">
          <CostInfo label="Contract Value" value={formatCurrency(totalContractValue)} />
          <CostInfo label="Paid on Contracts" value={formatCurrency(totalPaidOnContracts)} />
          <CostInfo label="Outstanding Contract Balance" value={formatCurrency(outstandingContractValue)} />
          <CostInfo label="Approved Variations" value={formatCurrency(approvedVariationValue)} />
          <CostInfo label="Pending Variations" value={formatCurrency(pendingVariationValue)} />
          <CostInfo label="Forecast Final Cost" value={formatCurrency(forecastFinalCost)} />
          <CostInfo label="Weekly Report Items" value={items.length} />
          <CostInfo label="Weekly Pending Amount" value={formatCurrency(pendingAmount)} />
          <CostInfo label="Weekly Paid Amount" value={formatCurrency(paidAmount)} />
          <CostInfo label="Payment Records" value={payments.length} />
          <CostInfo label="Pending Payments" value={formatCurrency(pendingPayments)} />
          <CostInfo label="Paid Payments" value={formatCurrency(paidPayments)} />
        </div>
      </CostSection>

      <CostSection title="Weekly Cost Updates">
        {groupedItems.every((group: any) => group.items.length === 0) ? (
          <div className="cr-box">No weekly cost update recorded.</div>
        ) : (
          groupedItems.map((group: any) =>
            group.items.length === 0 ? null : (
              <div key={group.section} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  {group.section}
                </div>

                <CostSimpleTable
                  columns={['Item', 'Description', 'Amount', 'Status']}
                  rows={group.items.map((item: any) => [
                    item.item_title || '—',
                    item.description || '—',
                    formatCurrency(item.amount),
                    item.status || '—',
                  ])}
                />
              </div>
            )
          )
        )}
      </CostSection>

      <CostSimpleTableSection
        title="Contracts"
        empty="No contract records available."
        columns={['Contract', 'Contractor', 'Type', 'Value', 'Paid', 'Status']}
        rows={contracts.map((item: any) => [
          item.contract_title || '—',
          item.contractor_name || '—',
          item.contract_type || '—',
          formatCurrency(item.contract_value),
          formatCurrency(item.amount_paid),
          item.status || '—',
        ])}
      />

      <CostSimpleTableSection
        title="Pending Payments"
        empty="No pending payment records."
        columns={['Payment', 'Vendor', 'Category', 'Amount', 'Due Date', 'Status']}
        rows={pendingPaymentRows.map((item: any) => [
          item.payment_title || '—',
          item.vendor_name || '—',
          item.payment_category || '—',
          formatCurrency(item.amount),
          fdate(item.due_date),
          item.payment_status || '—',
        ])}
      />

      <CostSimpleTableSection
        title="Variations"
        empty="No variation records available."
        columns={['Variation', 'Contractor', 'Type', 'Amount', 'Status']}
        rows={variations.map((item: any) => [
          item.variation_title || '—',
          item.contractor_name || '—',
          item.variation_type || '—',
          formatCurrency(item.amount),
          item.status || '—',
        ])}
      />

      <CostSimpleTableSection
        title="Pending / Ordered Procurement"
        empty="No pending procurement records."
        columns={['Item', 'Vendor', 'Category', 'Estimated', 'Actual', 'Status']}
        rows={pendingProcurements.map((item: any) => [
          item.item_name || '—',
          item.vendor_name || '—',
          item.procurement_category || '—',
          formatCurrency(item.estimated_cost),
          formatCurrency(item.actual_cost),
          item.status || '—',
        ])}
      />

      <CostSection title="Sign-off">
        <div className="cr-grid">
          <CostInfo label="Prepared By" value={preparedBy} />
          <CostInfo label="Reviewed By" value="—" />
          <CostInfo label="Approved By" value="—" />
        </div>
      </CostSection>

      <div className="cr-footer">
        Mixta Africa · Generated by PMOCorex · Confidential ·{' '}
        {new Date().toLocaleDateString('en-GB')}
      </div>
    </div>
  )
}

function CostSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="cr-section">
      <div className="cr-section-title">{title}</div>
      {children}
    </section>
  )
}

function CostInfo({ label, value }: { label: string; value: any }) {
  return (
    <div className="cr-info">
      <div className="cr-label">{label}</div>
      <div className="cr-value">{value ?? '—'}</div>
    </div>
  )
}

function CostSimpleTableSection({
  title,
  empty,
  columns,
  rows,
}: {
  title: string
  empty: string
  columns: string[]
  rows: any[][]
}) {
  return (
    <CostSection title={title}>
      {rows.length === 0 ? (
        <div className="cr-box">{empty}</div>
      ) : (
        <CostSimpleTable columns={columns} rows={rows} />
      )}
    </CostSection>
  )
}

function CostSimpleTable({
  columns,
  rows,
}: {
  columns: string[]
  rows: any[][]
}) {
  return (
    <table className="cr-table">
      <thead>
        <tr>
          {columns.map(column => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}


function CostOverviewTab({
  totalContractValue,
  totalPaidOnContracts,
  outstandingContractValue,
  pendingPayments,
  paidPayments,
  contracts,
  payments,
  approvedVariationValue,
  pendingVariationValue,
  forecastFinalCost,
}: any) {
  const activeContracts = contracts.filter(
    (item: any) => item.status === 'Active'
  ).length

  const pendingPaymentCount = payments.filter(
    (item: any) => item.payment_status === 'Pending'
  ).length

  return (
    <div className="space-y-6">
      <MetricGrid
        values={[
          ['Contract Value', `₦${totalContractValue.toLocaleString()}`],
          ['Approved Variations', `₦${approvedVariationValue.toLocaleString()}`],
          ['Pending Variations', `₦${pendingVariationValue.toLocaleString()}`],
          ['Forecast Final Cost', `₦${forecastFinalCost.toLocaleString()}`],
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h2 className="font-bold text-[#ede8de] mb-4">
            Costing Executive Summary
          </h2>

          <div className="space-y-3 text-sm text-slate-400">
            <p>
              Total contract exposure is{' '}
              <span className="text-[#c49e48] font-semibold">
                ₦{totalContractValue.toLocaleString()}
              </span>.
            </p>

            <p>
              Total paid to date is{' '}
              <span className="text-emerald-400 font-semibold">
                ₦{totalPaidOnContracts.toLocaleString()}
              </span>.
            </p>

            <p>
              Outstanding contractual balance is{' '}
              <span className="text-amber-400 font-semibold">
                ₦{outstandingContractValue.toLocaleString()}
              </span>.
            </p>

            <p>
              Pending payment requests currently stand at{' '}
              <span className="text-red-400 font-semibold">
                ₦{pendingPayments.toLocaleString()}
              </span>.
            </p>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-[#ede8de] mb-4">Costing Workload</h2>

          <div className="grid grid-cols-2 gap-3">
            <MiniMetric title="Active Contracts" value={activeContracts} />
            <MiniMetric title="Payment Records" value={payments.length} />
            <MiniMetric title="Pending Payments" value={pendingPaymentCount} />
            <MiniMetric
              title="Paid Payments"
              value={`₦${paidPayments.toLocaleString()}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function WeeklyReportTab({
  reportWeek,
  setReportWeek,
  form,
  setForm,
  groupedItems,
  loading,
  onAdd,
  onDelete,
  onSubmit,
}: any) {
  return (
    <>
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div>
          <label className="form-label">Report Week</label>
          <input
            type="date"
            className="form-control"
            value={reportWeek}
            onChange={e => setReportWeek(e.target.value)}
          />
        </div>

        <button className="btn btn-gold ml-auto" onClick={onSubmit}>
          Submit Weekly Report
        </button>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={17} className="text-[#c49e48]" />
          <h2 className="font-bold text-[#ede8de]">Add Cost Report Item</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            className="form-control"
            value={form.section}
            onChange={e => setForm({ ...form, section: e.target.value })}
          >
            {SECTIONS.map(section => (
              <option key={section}>{section}</option>
            ))}
          </select>

          <input
            className="form-control"
            placeholder="Item title"
            value={form.item_title}
            onChange={e => setForm({ ...form, item_title: e.target.value })}
          />

          <input
            className="form-control"
            placeholder="Amount"
            type="number"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
          />

          <select
            className="form-control"
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}
          >
            {STATUSES.map(status => (
              <option key={status}>{status}</option>
            ))}
          </select>

          <button className="btn btn-gold" onClick={onAdd}>
            Add Item
          </button>
        </div>

        <textarea
          className="form-control mt-3"
          rows={2}
          placeholder="Description / update"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />
      </div>

      {loading ? (
        <div className="card p-6 text-slate-400">Loading cost report…</div>
      ) : (
        <div className="space-y-5">
          {groupedItems.map((group: any) => (
            <div key={group.section} className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <div className="font-bold text-[#ede8de]">
                  {group.section}
                </div>

                <div className="text-xs text-[#6e7d8c]">
                  {group.items.length} item(s)
                </div>
              </div>

              {group.items.length === 0 ? (
                <div className="p-5 text-sm text-[#6e7d8c]">
                  No entries for this section.
                </div>
              ) : (
                <ReportTable items={group.items} onDelete={onDelete} />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function ReportTable({
  items,
  onDelete,
}: {
  items: any[]
  onDelete: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead>
          <tr>
            <th>Item</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td className="font-medium text-[#ede8de]">
                {item.item_title}
              </td>

              <td className="max-w-[360px] text-slate-400">
                {item.description || '—'}
              </td>

              <td className="text-[#c49e48] font-semibold">
                ₦{Number(item.amount || 0).toLocaleString()}
              </td>

              <td>
                <span className="badge badge-muted">
                  {item.status || 'Open'}
                </span>
              </td>

              <td>
                <button
                  className="tbl-action text-red-400"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ContractsTab({
  contracts,
  loading,
  form,
  setForm,
  onAdd,
  onDelete,
}: any) {
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={17} className="text-[#c49e48]" />
          <h2 className="font-bold text-[#ede8de]">Add Contract</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="form-control"
            placeholder="Contract title"
            value={form.contract_title}
            onChange={e => setForm({ ...form, contract_title: e.target.value })}
          />

          <input
            className="form-control"
            placeholder="Contractor / consultant"
            value={form.contractor_name}
            onChange={e => setForm({ ...form, contractor_name: e.target.value })}
          />

          <select
            className="form-control"
            value={form.contract_type}
            onChange={e => setForm({ ...form, contract_type: e.target.value })}
          >
            {CONTRACT_TYPES.map(type => (
              <option key={type}>{type}</option>
            ))}
          </select>

          <select
            className="form-control"
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}
          >
            {CONTRACT_STATUSES.map(status => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <input
            className="form-control"
            placeholder="Contract value"
            type="number"
            value={form.contract_value}
            onChange={e => setForm({ ...form, contract_value: e.target.value })}
          />

          <input
            className="form-control"
            placeholder="Amount paid"
            type="number"
            value={form.amount_paid}
            onChange={e => setForm({ ...form, amount_paid: e.target.value })}
          />

          <input
            type="date"
            className="form-control"
            value={form.start_date}
            onChange={e => setForm({ ...form, start_date: e.target.value })}
          />

          <input
            type="date"
            className="form-control"
            value={form.end_date}
            onChange={e => setForm({ ...form, end_date: e.target.value })}
          />
        </div>

        <textarea
          className="form-control mt-3"
          rows={2}
          placeholder="Remarks"
          value={form.remarks}
          onChange={e => setForm({ ...form, remarks: e.target.value })}
        />

        <button className="btn btn-gold mt-3" onClick={onAdd}>
          Add Contract
        </button>
      </div>

      {loading ? (
        <div className="card p-6 text-slate-400">Loading contracts…</div>
      ) : contracts.length === 0 ? (
        <div className="card p-6 text-slate-400">
          No contracts recorded for this project.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th>Contract</th>
                <th>Contractor</th>
                <th>Type</th>
                <th>Value</th>
                <th>Paid</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {contracts.map((contract: any) => (
                <tr key={contract.id}>
                  <td className="font-medium text-[#ede8de]">
                    {contract.contract_title}
                  </td>
                  <td>{contract.contractor_name || '—'}</td>
                  <td>{contract.contract_type || '—'}</td>
                  <td className="text-[#c49e48] font-semibold">
                    ₦{Number(contract.contract_value || 0).toLocaleString()}
                  </td>
                  <td>₦{Number(contract.amount_paid || 0).toLocaleString()}</td>
                  <td>
                    <span className="badge badge-muted">
                      {contract.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="tbl-action text-red-400"
                      onClick={() => onDelete(contract.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PaymentsTab({
  payments,
  loading,
  form,
  setForm,
  onAdd,
  onDelete,
}: any) {
  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={17} className="text-[#c49e48]" />
          <h2 className="font-bold text-[#ede8de]">Add Payment</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="form-control"
            placeholder="Payment title"
            value={form.payment_title}
            onChange={e => setForm({ ...form, payment_title: e.target.value })}
          />

          <input
            className="form-control"
            placeholder="Vendor / contractor"
            value={form.vendor_name}
            onChange={e => setForm({ ...form, vendor_name: e.target.value })}
          />

          <select
            className="form-control"
            value={form.payment_category}
            onChange={e =>
              setForm({ ...form, payment_category: e.target.value })
            }
          >
            {PAYMENT_CATEGORIES.map(category => (
              <option key={category}>{category}</option>
            ))}
          </select>

          <select
            className="form-control"
            value={form.payment_status}
            onChange={e => setForm({ ...form, payment_status: e.target.value })}
          >
            {PAYMENT_STATUSES.map(status => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <input
            className="form-control"
            placeholder="Amount"
            type="number"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
          />

          <input
            type="date"
            className="form-control"
            value={form.request_date}
            onChange={e => setForm({ ...form, request_date: e.target.value })}
          />

          <input
            type="date"
            className="form-control"
            value={form.due_date}
            onChange={e => setForm({ ...form, due_date: e.target.value })}
          />

          <input
            type="date"
            className="form-control"
            value={form.paid_date}
            onChange={e => setForm({ ...form, paid_date: e.target.value })}
          />
        </div>

        <textarea
          className="form-control mt-3"
          rows={2}
          placeholder="Remarks"
          value={form.remarks}
          onChange={e => setForm({ ...form, remarks: e.target.value })}
        />

        <button className="btn btn-gold mt-3" onClick={onAdd}>
          Add Payment
        </button>
      </div>

      {loading ? (
        <div className="card p-6 text-slate-400">Loading payments…</div>
      ) : payments.length === 0 ? (
        <div className="card p-6 text-slate-400">
          No payments recorded for this project.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th>Payment</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {payments.map((payment: any) => (
                <tr key={payment.id}>
                  <td className="font-medium text-[#ede8de]">
                    {payment.payment_title}
                  </td>
                  <td>{payment.vendor_name || '—'}</td>
                  <td>{payment.payment_category || '—'}</td>
                  <td className="text-[#c49e48] font-semibold">
                    ₦{Number(payment.amount || 0).toLocaleString()}
                  </td>
                  <td>
                    <span className="badge badge-muted">
                      {payment.payment_status || 'Pending'}
                    </span>
                  </td>
                  <td>{payment.due_date || '—'}</td>
                  <td>
                    <button
                      className="tbl-action text-red-400"
                      onClick={() => onDelete(payment.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function VariationsTab({
  variations,
  form,
  setForm,
  onAdd,
  onDelete,
}: any) {
  return (
    <div className="space-y-5">
      <MetricGrid
        values={[
          ['Variations', variations.length],
          [
            'Approved Value',
            `₦${variations
              .filter((item: any) => item.status === 'Approved')
              .reduce(
                (sum: number, item: any) => sum + Number(item.amount || 0),
                0
              )
              .toLocaleString()}`,
          ],
          [
            'Pending Value',
            `₦${variations
              .filter((item: any) => item.status === 'Pending')
              .reduce(
                (sum: number, item: any) => sum + Number(item.amount || 0),
                0
              )
              .toLocaleString()}`,
          ],
          [
            'Implemented',
            variations.filter((item: any) => item.status === 'Implemented')
              .length,
          ],
        ]}
      />

      <div className="card p-5">
        <h2 className="font-bold text-white mb-4">Add Variation</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="form-control"
            placeholder="Variation title"
            value={form.variation_title}
            onChange={e =>
              setForm({ ...form, variation_title: e.target.value })
            }
          />

          <input
            className="form-control"
            placeholder="Contractor"
            value={form.contractor_name}
            onChange={e =>
              setForm({ ...form, contractor_name: e.target.value })
            }
          />

          <select
            className="form-control"
            value={form.variation_type}
            onChange={e =>
              setForm({ ...form, variation_type: e.target.value })
            }
          >
            {VARIATION_TYPES.map(type => (
              <option key={type}>{type}</option>
            ))}
          </select>

          <input
            type="number"
            className="form-control"
            placeholder="Amount"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <select
            className="form-control"
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}
          >
            {VARIATION_STATUSES.map(status => (
              <option key={status}>{status}</option>
            ))}
          </select>

          <input
            type="date"
            className="form-control"
            value={form.request_date}
            onChange={e => setForm({ ...form, request_date: e.target.value })}
          />

          <input
            type="date"
            className="form-control"
            value={form.approval_date}
            onChange={e => setForm({ ...form, approval_date: e.target.value })}
          />
        </div>

        <textarea
          className="form-control mt-3"
          rows={3}
          placeholder="Reason for variation"
          value={form.reason}
          onChange={e => setForm({ ...form, reason: e.target.value })}
        />

        <textarea
          className="form-control mt-3"
          rows={2}
          placeholder="Remarks"
          value={form.remarks}
          onChange={e => setForm({ ...form, remarks: e.target.value })}
        />

        <button onClick={onAdd} className="btn btn-gold mt-4">
          Save Variation
        </button>
      </div>

      {variations.length > 0 && (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th>Variation</th>
                <th>Type</th>
                <th>Contractor</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {variations.map((variation: any) => (
                <tr key={variation.id}>
                  <td className="font-medium text-[#ede8de]">
                    {variation.variation_title}
                  </td>
                  <td>{variation.variation_type}</td>
                  <td>{variation.contractor_name || '—'}</td>
                  <td className="text-[#c49e48] font-semibold">
                    ₦{Number(variation.amount || 0).toLocaleString()}
                  </td>
                  <td>
                    <span className="badge badge-muted">
                      {variation.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="tbl-action text-red-400"
                      onClick={() => onDelete(variation.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ProcurementTab({
  procurements,
  form,
  setForm,
  onAdd,
  onDelete,
}: any) {
  return (
    <div className="space-y-5">
      <MetricGrid
        values={[
          ['Items', procurements.length],
          [
            'Delivered',
            procurements.filter((item: any) => item.status === 'Delivered')
              .length,
          ],
          [
            'Ordered',
            procurements.filter((item: any) => item.status === 'Ordered')
              .length,
          ],
          [
            'Pending',
            procurements.filter((item: any) => item.status === 'Pending')
              .length,
          ],
        ]}
      />

      <div className="card p-5">
        <h2 className="font-bold text-white mb-4">Add Procurement Item</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="form-control"
            placeholder="Item name"
            value={form.item_name}
            onChange={e => setForm({ ...form, item_name: e.target.value })}
          />

          <input
            className="form-control"
            placeholder="Vendor"
            value={form.vendor_name}
            onChange={e => setForm({ ...form, vendor_name: e.target.value })}
          />

          <select
            className="form-control"
            value={form.procurement_category}
            onChange={e =>
              setForm({ ...form, procurement_category: e.target.value })
            }
          >
            {PROCUREMENT_CATEGORIES.map(category => (
              <option key={category}>{category}</option>
            ))}
          </select>

          <select
            className="form-control"
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value })}
          >
            {PROCUREMENT_STATUSES.map(status => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <input
            type="number"
            className="form-control"
            placeholder="Estimated cost"
            value={form.estimated_cost}
            onChange={e =>
              setForm({ ...form, estimated_cost: e.target.value })
            }
          />

          <input
            type="number"
            className="form-control"
            placeholder="Actual cost"
            value={form.actual_cost}
            onChange={e => setForm({ ...form, actual_cost: e.target.value })}
          />

          <input
            type="date"
            className="form-control"
            value={form.expected_delivery_date}
            onChange={e =>
              setForm({
                ...form,
                expected_delivery_date: e.target.value,
              })
            }
          />

          <input
            type="date"
            className="form-control"
            value={form.actual_delivery_date}
            onChange={e =>
              setForm({
                ...form,
                actual_delivery_date: e.target.value,
              })
            }
          />
        </div>

        <textarea
          className="form-control mt-3"
          rows={2}
          placeholder="Remarks"
          value={form.remarks}
          onChange={e => setForm({ ...form, remarks: e.target.value })}
        />

        <button onClick={onAdd} className="btn btn-gold mt-4">
          Save Procurement
        </button>
      </div>

      {procurements.length > 0 && (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Estimated</th>
                <th>Actual</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {procurements.map((item: any) => (
                <tr key={item.id}>
                  <td className="font-medium text-[#ede8de]">
                    {item.item_name}
                  </td>
                  <td>{item.vendor_name || '—'}</td>
                  <td>{item.procurement_category || '—'}</td>
                  <td className="text-[#c49e48] font-semibold">
                    ₦{Number(item.estimated_cost || 0).toLocaleString()}
                  </td>
                  <td>₦{Number(item.actual_cost || 0).toLocaleString()}</td>
                  <td>
                    <span className="badge badge-muted">
                      {item.status || 'Pending'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="tbl-action text-red-400"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function MetricGrid({ values }: { values: [string, string | number][] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {values.map(([title, value]) => (
        <Metric key={title} title={title} value={value} />
      ))}
    </div>
  )
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="card p-4">
      <Wallet size={18} className="text-[#c49e48]" />
      <div className="text-2xl font-black text-white mt-3">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-[#6e7d8c] mt-1">
        {title}
      </div>
    </div>
  )
}

function MiniMetric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="text-xl font-black text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[#6e7d8c] mt-1">
        {title}
      </div>
    </div>
  )
}

function EmptyCostingTab({ title }: { title: string }) {
  return (
    <div className="card p-10 text-center">
      <Wallet size={36} className="mx-auto text-[#c49e48] mb-3" />
      <div className="text-lg font-bold text-white">{title}</div>
      <div className="text-sm text-slate-500 mt-1">
        This section will be connected to the costing report workflow.
      </div>
    </div>
  )
}
