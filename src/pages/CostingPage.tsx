import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Wallet } from 'lucide-react'
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

const PAYMENT_STATUSES = [
  'Pending',
  'Approved',
  'Paid',
  'Rejected',
  'On Hold',
]

const TABS = [
  ['overview', 'Overview'],
  ['weekly', 'Weekly Report'],
  ['contracts', 'Contracts'],
  ['payments', 'Payments'],
  ['variations', 'Variations'],
  ['procurement', 'Procurement'],
]

export default function CostingPage() {
  const { user } = useAuthStore()
  const { projectId, projectName, organizationId, portfolioId } =
    useProjectStore()

  const [activeTab, setActiveTab] = useState('overview')
  const [items, setItems] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])

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

  useEffect(() => {
    loadCostReports()
    loadContracts()
    loadPayments()
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
      status: 'Submitted',
    })

    if (error) {
      setNotice(error.message)
      return
    }

    setNotice('Weekly cost report submitted successfully.')
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

      {activeTab === 'overview' && (
        <CostOverviewTab
          totalContractValue={totalContractValue}
          totalPaidOnContracts={totalPaidOnContracts}
          outstandingContractValue={outstandingContractValue}
          pendingPayments={pendingPayments}
          paidPayments={paidPayments}
          contracts={contracts}
          payments={payments}
        />
      )}

      {activeTab === 'weekly' && (
        <>
          <MetricGrid
            values={[
              ['Total Items', items.length],
              ['Total Amount', `₦${totalAmount.toLocaleString()}`],
              ['Pending Amount', `₦${pendingAmount.toLocaleString()}`],
              ['Paid Amount', `₦${paidAmount.toLocaleString()}`],
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
              ['Contract Value', `₦${totalContractValue.toLocaleString()}`],
              ['Amount Paid', `₦${totalPaidOnContracts.toLocaleString()}`],
              ['Outstanding', `₦${outstandingContractValue.toLocaleString()}`],
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
              ['Total Value', `₦${totalPayments.toLocaleString()}`],
              ['Pending', `₦${pendingPayments.toLocaleString()}`],
              ['Paid', `₦${paidPayments.toLocaleString()}`],
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

      {activeTab === 'variations' && <EmptyCostingTab title="Variations" />}
      {activeTab === 'procurement' && <EmptyCostingTab title="Procurement" />}
    </div>
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
          ['Total Contract Value', `₦${totalContractValue.toLocaleString()}`],
          ['Total Paid', `₦${totalPaidOnContracts.toLocaleString()}`],
          ['Outstanding', `₦${outstandingContractValue.toLocaleString()}`],
          ['Pending Payments', `₦${pendingPayments.toLocaleString()}`],
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
                  <td>
                    ₦{Number(contract.amount_paid || 0).toLocaleString()}
                  </td>
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
            onChange={e =>
              setForm({ ...form, payment_status: e.target.value })
            }
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
