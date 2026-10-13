import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import type { FinancialItem } from '@/types'
import ProjectCostForecast from './ProjectCostForecast'
import FinancialHealthSignal from './FinancialHealthSignal'

const FINANCE_ROLES = new Set(['workspace_admin', 'admin', 'pmo', 'portfolio_manager', 'costing'])
type Entry = FinancialItem & { project_id?: string }
type ContractRecord = { contract_value: number | string | null }
type VariationRecord = { amount: number | string | null; status: string | null }
type PaymentRecord = {
  id: string
  amount: number | string | null
  payment_status: string | null
  due_date: string | null
  paid_date: string | null
  payment_title: string | null
}
const parseLocalDate = (value: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))) return null
  const d = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isFinite(d.getTime()) ? d : null
}

const amount = (row: Entry) => Number(row.amount)
const valid = (row: Entry) => Number.isFinite(amount(row)) && amount(row) >= 0
const total = (items: Entry[]) => items.reduce((sum, row) => sum + amount(row), 0)
const money = (value: number | null, currency: string) => value === null ? 'Awaiting data' : new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
const normal = (value: unknown) => String(value || '').trim().toLowerCase()
const fmtDate = (date: string) => new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const paymentsKnown = (value: number | null) => value !== null
const daysSince = (value: string) => {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? Math.max(0, Math.floor((Date.now() - timestamp) / 86400000)) : null
}

export default function ExecutiveFinancialSnapshot({ physicalProgress }: { physicalProgress: number }) {
  const navigate = useNavigate()
  const projectId = useProjectStore(s => s.projectId)
  const role = useMembershipStore(s => s.role)
  const permitted = FINANCE_ROLES.has(role || '')
  const [rows, setRows] = useState<Entry[]>([])
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [costContracts, setCostContracts] = useState<ContractRecord[]>([])
  const [costVariations, setCostVariations] = useState<VariationRecord[]>([])
  const [exposureError, setExposureError] = useState<string | null>(null)
  const [exposureLoading, setExposureLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setRows([])
    setPaymentRecords([])
    setPaymentError(null)
    setCostContracts([])
    setCostVariations([])
    setExposureError(null)
    setExposureLoading(false)
    setError(null)
    if (!permitted || !projectId) { setLoading(false); return () => { alive = false } }
    setLoading(true)
    // Read through the existing RLS-protected financial register; do not bypass Supabase policies.
    supabase.from('financial_items').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
      .then(({ data, error: requestError }) => {
        if (!alive) return
        setRows(requestError ? [] : (data || []) as Entry[])
        setError(requestError?.message || null)
        setLoading(false)
      })
    setExposureLoading(true)
    Promise.all([
      supabase.from('cost_contracts').select('contract_value').eq('project_id', projectId),
      supabase.from('cost_variations').select('amount,status').eq('project_id', projectId),
    ]).then(([contractsResult, variationsResult]) => {
      if (!alive) return
      const err = contractsResult.error || variationsResult.error
      if (err) setExposureError(err.message)
      else {
        setCostContracts((contractsResult.data || []) as ContractRecord[])
        setCostVariations((variationsResult.data || []) as VariationRecord[])
      }
      setExposureLoading(false)
    }).catch(() => {
      if (!alive) return
      setExposureError('Could not load Costing commitments.')
      setExposureLoading(false)
    })
    // The Costing payment register is a separate source. Do not add its amounts
    // to financial_items totals, as the same disbursement may exist in both.
    supabase.from('cost_payments').select('id,amount,payment_status,due_date,paid_date,payment_title')
      .eq('project_id', projectId).then(({ data, error: requestError }) => {
        if (!alive) return
        setPaymentRecords(requestError ? [] : (data || []) as PaymentRecord[])
        setPaymentError(requestError?.message || null)
      })
    return () => { alive = false }
  }, [projectId, permitted])

  const figures = useMemo(() => {
    const byType = (type: string) => rows.filter(r => normal(r.type) === normal(type) && valid(r))
    const contracts = byType('Contract Sum')
    const approvedVariations = byType('Variation').filter(r => ['approved', 'implemented'].includes(normal(r.status)))
    const pendingVariations = byType('Variation').filter(r => ['pending', 'open', 'in progress', 'submitted'].includes(normal(r.status)))
    const payments = byType('Payment')
    const paid = payments.filter(r => normal(r.status) === 'paid' || Boolean(r.payment_date))
    const pending = payments.filter(r => ['pending', 'open', 'in progress', 'submitted', 'approved', 'certified'].includes(normal(r.status)) && !r.payment_date)
    // Payment entries and budget entries must not be counted as certified work.
    const certifiedRows = rows.filter(r => !['payment', 'contract sum', 'variation', 'retention', 'contingency', 'provisional sum', 'pc sum'].includes(normal(r.type)) && valid(r) && (Boolean(r.certified_date) || normal(r.status) === 'certified'))
    const currencies = [...new Set(rows.filter(valid).map(r => r.currency || 'NGN'))]
    const currency = currencies.length === 1 ? currencies[0] : 'NGN'
    const currencyConflict = currencies.length > 1
    const base = contracts.length ? total(contracts) : null
    const budget = base === null ? null : base + approvedVariations.reduce((s, r) => s + (normal(r.direction) === 'omission' ? -amount(r) : amount(r)), 0)
    const paidTotal = payments.length ? total(paid) : null
    const certified = certifiedRows.length ? total(certifiedRows) : null
    const pendingTotal = payments.length ? total(pending) : null
    const approvedAwaitingPayment = pending.filter(r => normal(r.status) === 'approved' || normal(r.status) === 'certified')
    const submittedAwaitingApproval = pending.filter(r => ['pending', 'open', 'in progress', 'submitted'].includes(normal(r.status)))
    const certifiedWithoutPayment = payments.filter(r => normal(r.status) === 'certified' && !r.payment_date)
    const datedPaymentsMissingStatus = payments.filter(r => Boolean(r.payment_date) && normal(r.status) !== 'paid')
    const paidWithoutDate = payments.filter(r => normal(r.status) === 'paid' && !r.payment_date)
    const pendingVariationTotal = pendingVariations.length ? total(pendingVariations) : null
    return {
      currency, currencyConflict, budget, paid: paidTotal, certified, pending: pendingTotal,
      pendingVariations: pendingVariationTotal,
      approvedAwaitingPayment: total(approvedAwaitingPayment), approvedAwaitingPaymentCount: approvedAwaitingPayment.length,
      submittedAwaitingApproval: total(submittedAwaitingApproval), submittedAwaitingApprovalCount: submittedAwaitingApproval.length,
      certifiedWithoutPaymentCount: certifiedWithoutPayment.length,
      datedPaymentsMissingStatusCount: datedPaymentsMissingStatus.length, paidWithoutDateCount: paidWithoutDate.length,
      paymentPct: budget !== null && budget > 0 && paidTotal !== null ? paidTotal / budget * 100 : null,
      paidCertifiedGap: paidTotal !== null && certified !== null ? paidTotal - certified : null,
      paidOverBudget: budget !== null && paidTotal !== null && paidTotal > budget ? paidTotal - budget : null,
      latest: rows[0]?.updated_at || rows[0]?.created_at || null,
      invalid: rows.filter(r => !valid(r)).length,
    }
  }, [rows])

  const paymentAlerts = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const soon = new Date(today)
    soon.setDate(today.getDate() + 7)
    const active = paymentRecords.filter(r => !['paid', 'rejected'].includes(normal(r.payment_status)) && !r.paid_date)
    const validAmount = (r: PaymentRecord) => r.amount !== null && r.amount !== '' && Number.isFinite(Number(r.amount)) && Number(r.amount) >= 0
    const overdue = active.filter(r => { const d = parseLocalDate(r.due_date); return d !== null && d < today })
    const upcoming = active.filter(r => { const d = parseLocalDate(r.due_date); return d !== null && d >= today && d <= soon })
    const noDueDate = active.filter(r => !parseLocalDate(r.due_date))
    const sum = (items: PaymentRecord[]) => items.every(validAmount) ? items.reduce((s, r) => s + Number(r.amount), 0) : null
    return { overdueCount: overdue.length, overdueAmount: sum(overdue), upcomingCount: upcoming.length,
      upcomingAmount: sum(upcoming), noDueDateCount: noDueDate.length,
      invalidAmounts: active.filter(r => !validAmount(r)).length,
      paidMissingDate: paymentRecords.filter(r => normal(r.payment_status) === 'paid' && !r.paid_date).length,
      datedNotPaid: paymentRecords.filter(r => !!r.paid_date && normal(r.payment_status) !== 'paid').length }
  }, [paymentRecords])

  const costExposure = useMemo(() => {
    const all = [...costContracts.map(r => r.contract_value), ...costVariations.map(r => r.amount)]
    if (all.some(v => v === null || v === '' || !Number.isFinite(Number(v)) || Number(v) < 0)) return null
    if (!costContracts.length) return null
    const contractValue = costContracts.reduce((sum, r) => sum + Number(r.contract_value), 0)
    const approved = costVariations.filter(r => normal(r.status) === 'approved').reduce((sum, r) => sum + Number(r.amount), 0)
    const pending = costVariations.filter(r => normal(r.status) === 'pending').reduce((sum, r) => sum + Number(r.amount), 0)
    return { contractValue, approved, pending, committed: contractValue + approved, exposure: contractValue + approved + pending }
  }, [costContracts, costVariations])

  if (!permitted) return null
  const progressKnown = Number.isFinite(physicalProgress) && physicalProgress >= 0
  const progress = progressKnown ? Math.min(100, physicalProgress) : 0
  const cards: Array<[string, number | null]> = [
    ['Approved budget', figures.budget], ['Payments made', figures.paid],
    ['Certified work', figures.certified], ['Pending payments', figures.pending],
  ]
  const latestAge = figures.latest ? daysSince(figures.latest) : null
  return <section className="pmx-section-panel" aria-label="Financial health">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="pmx-eyebrow">Commercial control</div><h2 className="mt-1 text-xl font-semibold">Financial health</h2><p className="mt-1 text-sm text-[var(--pmx-muted)]">Payments, certified work and physical delivery in one view.</p></div>
      <button className="pmx-btn-secondary" type="button" onClick={() => navigate('/app/costing')}>Open Costing →</button>
    </div>
    {loading ? <p className="mt-5 text-sm">Loading financial records…</p> : error ? <p role="alert" className="mt-5 text-sm text-amber-700">Financial data unavailable. Check Costing register access. {error}</p> : figures.currencyConflict ? <p role="alert" className="mt-5 text-sm text-amber-700">Multiple currencies detected. Financial totals are withheld until the records are reconciled into one reporting currency.</p> : <>
      <FinancialHealthSignal projectId={Number(projectId)} budget={figures.budget} currency={figures.currency} currencyConflict={figures.currencyConflict} overdueCount={paymentError ? null : paymentAlerts.overdueCount} paymentDataError={Boolean(paymentError)} financialDataError={Boolean(error)} invalidRecordCount={figures.invalid} lastUpdated={figures.latest} />
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--pmx-border)] p-4"><div className="text-xs text-[var(--pmx-muted)]">{label}</div><div className="mt-2 text-lg font-semibold">{money(value, figures.currency)}</div></div>)}</div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">{[
          { label: 'Physical progress', value: progressKnown ? progress : null },
          { label: 'Budget paid', value: figures.paymentPct },
          { label: 'Certified value / budget', value: figures.budget && figures.certified !== null ? 100 * figures.certified / figures.budget : null },
        ].map(item => <div key={item.label}><div className="mb-2 flex justify-between text-sm"><span>{item.label}</span><strong>{item.value === null ? 'Awaiting data' : `${item.value.toFixed(1)}%`}</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-[var(--pmx-surface-2)]"><div className="h-full rounded-full bg-sky-700" style={{ width: `${Math.min(100, Math.max(0, item.value ?? 0))}%` }} /></div></div>)}</div>
        <div className="rounded-xl bg-[var(--pmx-surface-2)] p-4 text-sm">
          <div className="font-semibold">Management attention</div>
          <p className="mt-2">Paid less certified work: <strong>{money(figures.paidCertifiedGap, figures.currency)}</strong></p>
          {figures.paidCertifiedGap !== null && figures.paidCertifiedGap > 0 && <p className="mt-1 text-xs text-amber-700">Payments are ahead of recorded certification. Reconcile advances, materials, retention and incomplete certificates before classifying this as overpayment.</p>}
          {figures.paidOverBudget !== null && <p className="mt-2 text-xs text-red-700">Recorded payments exceed the approved budget by {money(figures.paidOverBudget, figures.currency)}.</p>}
          <p className="mt-2">Pending variation exposure: <strong>{money(figures.pendingVariations, figures.currency)}</strong></p>
          <div className="mt-3 border-t border-[var(--pmx-border)] pt-3">
            <div className="font-semibold">Payment pipeline</div>
            <p className="mt-1">Approved/certified awaiting payment: <strong>{money(figures.approvedAwaitingPaymentCount ? figures.approvedAwaitingPayment : paymentsKnown(figures.pending) ? 0 : null, figures.currency)}</strong> <span className="text-xs">({figures.approvedAwaitingPaymentCount} records)</span></p>
            <p className="mt-1">Submitted/pending approval: <strong>{money(figures.submittedAwaitingApprovalCount ? figures.submittedAwaitingApproval : paymentsKnown(figures.pending) ? 0 : null, figures.currency)}</strong> <span className="text-xs">({figures.submittedAwaitingApprovalCount} records)</span></p>
            <div className="mt-3 border-t border-[var(--pmx-border)] pt-3">
            <div className="font-semibold">Payment deadlines · Costing register</div>
            {paymentError ? <p className="mt-1 text-xs text-amber-700">Payment deadline data unavailable: {paymentError}</p> : <>
              <p className="mt-1">Overdue: <strong>{paymentAlerts.overdueCount} payment(s)</strong> · <strong>{money(paymentAlerts.overdueAmount, 'NGN')}</strong></p>
              <p className="mt-1">Due within 7 days: <strong>{paymentAlerts.upcomingCount} payment(s)</strong> · <strong>{money(paymentAlerts.upcomingAmount, 'NGN')}</strong></p>
              {paymentAlerts.noDueDateCount > 0 && <p className="mt-1 text-xs text-amber-700">{paymentAlerts.noDueDateCount} outstanding payment(s) have no valid due date and cannot be classified.</p>}
              {paymentAlerts.invalidAmounts > 0 && <p className="mt-1 text-xs text-amber-700">{paymentAlerts.invalidAmounts} payment(s) have missing or invalid amounts; affected totals are withheld.</p>}
              {(paymentAlerts.paidMissingDate > 0 || paymentAlerts.datedNotPaid > 0) && <p className="mt-1 text-xs text-amber-700">Costing payment reconciliation: {paymentAlerts.paidMissingDate} paid without date; {paymentAlerts.datedNotPaid} dated but not marked paid.</p>}
              <p className="mt-2 text-xs text-[var(--pmx-muted)]">Due-date figures come from the separate Costing payments register (NGN). They are not added to the financial register totals above. Payment status and dates require Costing verification.</p>
            </>}
          </div>
          </div>
          {(figures.paidWithoutDateCount > 0 || figures.datedPaymentsMissingStatusCount > 0) && <p role="status" className="mt-2 text-xs text-amber-700">Payment reconciliation required: {figures.paidWithoutDateCount} marked paid without payment date; {figures.datedPaymentsMissingStatusCount} dated but not marked paid.</p>}
          {latestAge !== null && latestAge > 14 && <p role="status" className="mt-2 text-xs text-amber-700">Financial register has not been updated for {latestAge} days. Confirm data freshness with Costing.</p>}
          <div className="mt-3 border-t border-[var(--pmx-border)] pt-3">
            <div className="font-semibold">Contract commitments & variation exposure</div>
            {exposureLoading ? <p className="mt-1 text-xs">Loading Costing commitments…</p> : exposureError ? <p role="alert" className="mt-1 text-xs text-amber-700">Costing commitments unavailable: {exposureError}</p> : costExposure ? <>
              <p className="mt-1">Contract value: <strong>{money(costExposure.contractValue, 'NGN')}</strong></p>
              <p className="mt-1">Approved variations: <strong>{money(costExposure.approved, 'NGN')}</strong></p>
              <p className="mt-1">Committed contract value: <strong>{money(costExposure.committed, 'NGN')}</strong></p>
              <p className="mt-1">Pending variation exposure: <strong>{money(costExposure.pending, 'NGN')}</strong></p>
              <p className="mt-1">Indicative total exposure: <strong>{money(costExposure.exposure, 'NGN')}</strong></p>
              {figures.budget !== null && !figures.currencyConflict && figures.currency === 'NGN' && costExposure.committed > figures.budget && <p role="status" className="mt-1 text-xs text-red-700">Committed contract value is {money(costExposure.committed - figures.budget, 'NGN')} above the financial-register approved budget. Reconcile both sources before confirming an overrun.</p>}
              <p className="mt-2 text-xs text-[var(--pmx-muted)]">Indicative exposure is contracts plus approved and pending variations; it is NOT an authorised estimate at completion or verified forecast. Costing register figures assume NGN. Do not add these amounts to financial register totals.</p>
            </> : <p className="mt-1 text-xs text-[var(--pmx-muted)]">No complete, valid Costing contract data available. Exposure is withheld.</p>}
          </div>
          <ProjectCostForecast projectId={Number(projectId)} approvedBudget={figures.currencyConflict ? null : figures.budget} budgetCurrency={figures.currency} role={role || ''} />
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--pmx-muted)]">Operational financial register, not an audited financial statement. {figures.latest ? `Last record update ${fmtDate(figures.latest)}.` : 'No financial records available.'} {figures.invalid ? `${figures.invalid} invalid-amount records excluded.` : ''} Financial totals require Costing verification.</p>
    </>}
  </section>
}
