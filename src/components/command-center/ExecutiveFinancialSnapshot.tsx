import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'

const FINANCE_ROLES = new Set(['workspace_admin', 'admin', 'pmo', 'portfolio_manager', 'costing'])
const money = (value: number | null) => value === null ? 'Awaiting data' : `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
const sum = (items: any[]) => items.reduce((total, item) => total + Number(item.amount || 0), 0)

export default function ExecutiveFinancialSnapshot({ physicalProgress }: { physicalProgress: number }) {
  const navigate = useNavigate()
  const projectId = useProjectStore(s => s.projectId)
  const role = useMembershipStore(s => s.role)
  const permitted = FINANCE_ROLES.has(role || '')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setRows([])
    setError(null)
    setLoading(true)
    if (!permitted || !projectId) { setLoading(false); return }
    supabase.from('financial_items').select('type,amount,status,certified_date,created_at')
      .eq('project_id', projectId).order('created_at', { ascending: false })
      .then(({ data, error: requestError }) => {
        if (!alive) return
        setRows(requestError ? [] : data || [])
        setError(requestError?.message || null)
        setLoading(false)
      })
    return () => { alive = false }
  }, [projectId, permitted])

  const figures = useMemo(() => {
    const type = (name: string) => rows.filter(r => String(r.type || '').toLowerCase() === name.toLowerCase())
    const contract = type('Contract Sum')
    const approved = type('Variation').filter(r => ['approved', 'implemented'].includes(String(r.status || '').toLowerCase()))
    const payments = type('Payment')
    const paid = payments.filter(r => String(r.status || '').toLowerCase() === 'paid')
    const pending = payments.filter(r => ['pending', 'open', 'in progress', 'approved'].includes(String(r.status || '').toLowerCase()))
    // Certification is only recognised on explicitly certified entries; payment and contract records are excluded.
    const certified = rows.filter(r => !['payment', 'contract sum', 'variation'].includes(String(r.type || '').toLowerCase()) && (r.certified_date || String(r.status || '').toLowerCase() === 'certified'))
    const budget = contract.length ? sum(contract) + sum(approved) : null
    const paidTotal = paid.length ? sum(paid) : null
    const certifiedTotal = certified.length ? sum(certified) : null
    return {
      budget, paid: paidTotal, certified: certifiedTotal,
      pending: pending.length ? sum(pending) : payments.length ? 0 : null,
      paymentPct: budget && paidTotal !== null ? 100 * paidTotal / budget : null,
      variance: paidTotal !== null && certifiedTotal !== null ? paidTotal - certifiedTotal : null,
      lastUpdated: rows[0]?.created_at || null,
    }
  }, [rows])

  if (!permitted) return null
  const safeProgress = Math.max(0, Math.min(100, Number(physicalProgress) || 0))
  const paymentPct = figures.paymentPct
  const cards = [
    ['Approved contract value', figures.budget],
    ['Payments recorded', figures.paid],
    ['Certified work', figures.certified],
    ['Pending payments', figures.pending],
  ] as const

  return <section className="pmx-section-panel" aria-label="Financial health">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="pmx-eyebrow">Commercial control</div><h2 className="mt-1 text-xl font-semibold">Financial health</h2><p className="mt-1 text-sm text-[var(--pmx-muted)]">Payments, verified work and delivery progress at a glance.</p></div>
      <button className="pmx-btn-secondary" type="button" onClick={() => navigate('/app/costing')}>Open Costing →</button>
    </div>
    {loading ? <p className="mt-5 text-sm">Loading financial records…</p> : error ? <p className="mt-5 text-sm text-amber-700">Financial data unavailable. Check access to the Costing register.</p> : <>
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--pmx-border)] p-4"><div className="text-xs text-[var(--pmx-muted)]">{label}</div><div className="mt-2 text-lg font-semibold">{money(value)}</div></div>)}</div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {[{ label: 'Physical progress', value: safeProgress, known: true }, { label: 'Budget paid', value: paymentPct || 0, known: paymentPct !== null }].map(item => <div key={item.label}>
            <div className="mb-2 flex justify-between text-sm"><span>{item.label}</span><strong>{item.known ? `${item.value.toFixed(1)}%` : 'Awaiting data'}</strong></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--pmx-surface-2)]"><div className="h-full rounded-full bg-sky-700" style={{ width: `${Math.min(100, item.value)}%` }} /></div>
          </div>)}
        </div>
        <div className="rounded-xl bg-[var(--pmx-surface-2)] p-4 text-sm">
          <div className="font-semibold">Payment vs certified work</div>
          <div className="mt-2 text-lg font-semibold">{money(figures.variance)}</div>
          <p className="mt-1 text-xs text-[var(--pmx-muted)]">Positive difference means recorded payments exceed certified work. Review advances, retention and materials before concluding there is overpayment.</p>
          <p className="mt-3 text-xs text-[var(--pmx-muted)]">Forecast final cost and budget overrun: awaiting a verified cost forecast.</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--pmx-muted)]">Source: project financial register (unverified operational snapshot). {figures.lastUpdated ? `Latest entry ${new Date(figures.lastUpdated).toLocaleDateString('en-GB')}.` : 'No entries recorded.'} Financial totals require Costing verification.</p>
    </>}
  </section>
}
