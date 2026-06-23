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

const TABS = [
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

  const [activeTab, setActiveTab] = useState('weekly')
  const [items, setItems] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [contractsLoading, setContractsLoading] = useState(true)
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

  useEffect(() => {
    loadCostReports()
    loadContracts()
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

      {activeTab === 'weekly' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Metric title="Total Items" value={items.length} />
          <Metric
            title="Total Amount"
            value={`₦${totalAmount.toLocaleString()}`}
          />
          <Metric
            title="Pending Amount"
            value={`₦${pendingAmount.toLocaleString()}`}
          />
          <Metric title="Paid Amount" value={`₦${paidAmount.toLocaleString()}`} />
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Metric title="Contracts" value={contracts.length} />
          <Metric
            title="Contract Value"
            value={`₦${totalContractValue.toLocaleString()}`}
          />
          <Metric
            title="Amount Paid"
            value={`₦${totalPaidOnContracts.toLocaleString()}`}
          />
          <Metric
            title="Outstanding"
            value={`₦${outstandingContractValue.toLocaleString()}`}
          />
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

      {activeTab === 'weekly' && (
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

            <button className="btn btn-gold ml-auto" onClick={submitReport}>
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

              <button className="btn btn-gold" onClick={addItem}>
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
              {groupedItems.map(group => (
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
                          {group.items.map(item => (
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
                                  onClick={() => deleteItem(item.id)}
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
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'contracts' && (
        <ContractsTab
          contracts={contracts}
          loading={contractsLoading}
          form={contractForm}
          setForm={setContractForm}
          onAdd={addContract}
          onDelete={deleteContract}
        />
      )}

      {activeTab === 'payments' && <EmptyCostingTab title="Payments" />}
      {activeTab === 'variations' && <EmptyCostingTab title="Variations" />}
      {activeTab === 'procurement' && <EmptyCostingTab title="Procurement" />}
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
}: {
  contracts: any[]
  loading: boolean
  form: any
  setForm: (form: any) => void
  onAdd: () => void
  onDelete: (id: string) => void
}) {
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
              {contracts.map(contract => (
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
