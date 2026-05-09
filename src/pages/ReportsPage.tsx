import { useAuthStore } from '@/store/auth'
import { useProjectStore } from '@/store/project'
import { getRole } from '@/lib/access'
import { canEditPage } from '@/lib/permissions'
import { useState } from 'react'
import { Printer } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { useProcurement, useApprovals, useSnags, useRisks, useFinancial, useSiteReports } from '@/hooks/useData'
import { fdate, formatCurrency, PROJECT_END } from '@/lib/utils'
import { differenceInDays } from 'date-fns'

export default function ReportsPage() {
  const { user } = useAuthStore()
const { projectOwnerEmail } = useProjectStore()

const role = getRole(user?.email)

const canExport = canEditPage(
  role,
  'reports',
  user?.email,
  projectOwnerEmail
)
  const { data: tasks = [] } = useTasks()
  const { data: procs = [] } = useProcurement()
  const { data: approvals = [] } = useApprovals()
  const { data: snags = [] } = useSnags()
  const { data: risks = [] } = useRisks()
  const { data: financial = [] } = useFinancial()
  const { data: siteReports = [] } = useSiteReports()
  const [reportType, setReportType] = useState<'weekly' | 'board' | 'safety'>('weekly')

  const today = new Date()
  const daysLeft = Math.max(0, differenceInDays(PROJECT_END, today))
  const done = tasks.filter(t => t.status === 'Completed').length
  const inProg = tasks.filter(t => t.status === 'In Progress').length
  const overdue = tasks.filter(t => t.rag === 'RED').length
  const progressPct = tasks.length ? Math.round(done / tasks.length * 100) : 0
  const openSnags = snags.filter(s => s.status !== 'Closed').length
  const criticalSnags = snags.filter(s => s.severity === 'Critical' && s.status !== 'Closed').length
  const openRisks = risks.filter(r => r.status === 'Open').length
  const highRisks = risks.filter(r => r.status === 'Open' && (r.risk_score || 0) >= 12).length
  const pendingApprovals = approvals.filter(a => a.status !== 'Approved' && a.status !== 'Rejected').length
  const overdueApprovals = approvals.filter(a => a.status !== 'Approved' && a.deadline && differenceInDays(new Date(a.deadline), today) < 0).length
  const contractSum = financial.filter(f => f.type === 'Contract Sum').reduce((s, f) => s + f.amount, 0)
  const latestReport = siteReports[0]
  const procRisks = procs.filter(p => { const d = p.order_by_date ? differenceInDays(new Date(p.order_by_date), today) : null; return d !== null && d <= 14 && p.status !== 'Delivered' && p.status !== 'Ordered' })

  const reportDate = today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const weekEndDate = new Date(today); weekEndDate.setDate(today.getDate() + (5 - today.getDay()))

  const handlePrint = () => window.print()

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <div className="text-[10px] font-mono text-[#c49e48] uppercase tracking-widest border-b border-[#c49e48]/20 pb-1 mb-3">{title}</div>
      {children}
    </div>
  )

  const Row = ({ label, value, highlight }: { label: string; value: string | number; highlight?: string }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
      <span className="text-[12px] text-[#6e7d8c]">{label}</span>
      <span className={`text-[12px] font-medium ${highlight || 'text-[#ede8de]'}`}>{value}</span>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-md overflow-hidden border border-white/[0.08]">
          {([['weekly', 'Weekly Progress'], ['board', 'Board Report'], ['safety', 'Safety Summary']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setReportType(v)} className={`px-4 py-2 text-[12px] font-medium transition-colors ${reportType === v ? 'bg-[#c49e48] text-[#0c1014]' : 'bg-[#1c2a36] text-[#6e7d8c] hover:text-[#bfb9ae]'}`}>
              {label}
            </button>
          ))}
        </div>
        {canExport && (
  <button className="btn-ghost btn-sm btn" onClick={handlePrint}>
    <Printer size={13} /> Print / PDF
  </button>
)}
      </div>

      {/* Report */}
      <div className="card print:shadow-none" id="report-content">
        {/* Letterhead */}
        <div className="relative overflow-hidden">
          <div className="gold-bar" />
          <div className="px-8 pt-6 pb-4 border-b border-white/[0.06]">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[9px] font-mono text-[#c49e48] uppercase tracking-[0.2em] mb-1">Project Command Centre</div>
                <div className="font-display text-2xl font-bold text-[#ede8de]">
                  {reportType === 'weekly' ? 'Weekly Progress Report' : reportType === 'board' ? 'Board Project Update' : 'Safety Summary Report'}
                </div>
                <div className="text-[#6e7d8c] text-sm mt-1">Proposed SPA at Lakowe Lakes — Mixta Africa</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#6e7d8c] font-mono">Report Date</div>
                <div className="text-[13px] text-[#ede8de] font-medium">{reportDate}</div>
                <div className="text-[10px] text-[#6e7d8c] font-mono mt-1">Target Completion</div>
                <div className="text-[13px] text-[#c49e48] font-bold">18 September 2026</div>
              </div>
            </div>

            {/* RAG pill */}
            <div className="mt-4 flex gap-3 flex-wrap">
              {[
                { label: 'Programme', rag: overdue > 0 ? 'RED' : 'GREEN' },
                { label: 'Approvals', rag: overdueApprovals > 0 ? 'RED' : 'GREEN' },
                { label: 'Procurement', rag: procRisks.length > 0 ? 'AMBER' : 'GREEN' },
                { label: 'Safety', rag: (latestReport?.safety_incidents || 0) > 0 ? 'RED' : 'GREEN' },
                { label: 'Risk', rag: highRisks > 0 ? 'RED' : openRisks > 0 ? 'AMBER' : 'GREEN' },
              ].map(p => (
                <div key={p.label} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${p.rag === 'RED' ? 'text-red-400 bg-red-400/10 border-red-400/20' : p.rag === 'AMBER' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${p.rag === 'RED' ? 'bg-red-400' : p.rag === 'AMBER' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  {p.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 space-y-0">

          {/* WEEKLY + BOARD: Programme */}
          {(reportType === 'weekly' || reportType === 'board') && (
            <Section title="Programme Status">
              <Row label="Days to Completion" value={`${daysLeft} days`} highlight={daysLeft < 60 ? 'text-red-400 font-bold' : 'text-[#c49e48] font-bold'} />
              <Row label="Overall Task Progress" value={`${progressPct}%`} />
              <Row label="Tasks Completed" value={`${done} / ${tasks.length}`} />
              <Row label="In Progress" value={inProg} />
              <Row label="Overdue Tasks (RED)" value={overdue} highlight={overdue > 0 ? 'text-red-400' : 'text-emerald-400'} />
            </Section>
          )}

          {/* WEEKLY: Site */}
          {reportType === 'weekly' && latestReport && (
            <Section title="Site Progress (Latest Report)">
              <Row label="Report Date" value={fdate(latestReport.report_date)} />
              <Row label="Weather" value={`${latestReport.weather}, ${latestReport.temperature_c}°C`} />
              <Row label="Total Labour on Site" value={latestReport.total_labour} />
              <Row label="Skilled / Unskilled" value={`${latestReport.skilled_labour} / ${latestReport.unskilled_labour}`} />
              <Row label="Overall Site Progress" value={`${latestReport.overall_progress_pct || 0}%`} />
              {latestReport.works_carried_out && (
                <div className="mt-2">
                  <div className="text-[10px] text-[#6e7d8c] mb-1">Works Carried Out</div>
                  <div className="text-[12px] text-[#bfb9ae] bg-[#1c2a36] rounded p-2.5 whitespace-pre-wrap">{latestReport.works_carried_out}</div>
                </div>
              )}
            </Section>
          )}

          {/* Approvals */}
          {(reportType === 'weekly' || reportType === 'board') && (
            <Section title="Approvals Status">
              <Row label="Total Pending" value={pendingApprovals} highlight={pendingApprovals > 3 ? 'text-amber-400' : 'text-[#ede8de]'} />
              <Row label="Overdue Approvals" value={overdueApprovals} highlight={overdueApprovals > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'} />
              <Row label="Approved to Date" value={approvals.filter(a => a.status === 'Approved').length} />
              {overdueApprovals > 0 && (
                <div className="mt-2 bg-red-500/[0.08] border border-red-500/20 rounded p-2.5">
                  <div className="text-[10px] text-red-400 font-semibold mb-1.5">Overdue — Immediate Action Required</div>
                  {approvals.filter(a => a.status !== 'Approved' && a.deadline && differenceInDays(new Date(a.deadline), today) < 0).map(a => (
                    <div key={a.id} className="text-[11px] text-red-300">• {a.title} (deadline {fdate(a.deadline)})</div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Procurement */}
          {(reportType === 'weekly' || reportType === 'board') && (
            <Section title="Procurement">
              <Row label="Total Items Tracked" value={procs.length} />
              <Row label="Delivered" value={procs.filter(p => p.status === 'Delivered').length} highlight="text-emerald-400" />
              <Row label="Orders Placed" value={procs.filter(p => p.status === 'Ordered' || p.status === 'In Transit').length} />
              <Row label="Order Deadline in ≤14d" value={procRisks.length} highlight={procRisks.length > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'} />
              {procRisks.length > 0 && (
                <div className="mt-2 bg-amber-500/[0.08] border border-amber-500/20 rounded p-2.5">
                  {procRisks.slice(0, 5).map(p => {
                    const d = p.order_by_date ? differenceInDays(new Date(p.order_by_date), today) : null
                    return <div key={p.id} className="text-[11px] text-amber-300">• {p.name} — order by {fdate(p.order_by_date)} ({d !== null && d < 0 ? `${Math.abs(d)}d overdue` : `${d}d`})</div>
                  })}
                </div>
              )}
            </Section>
          )}

          {/* Snags */}
          {(reportType === 'weekly' || reportType === 'board') && (
            <Section title="Defect / Snag List">
              <Row label="Total Open" value={openSnags} />
              <Row label="Critical Open" value={criticalSnags} highlight={criticalSnags > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'} />
              <Row label="Closed to Date" value={snags.filter(s => s.status === 'Closed').length} highlight="text-emerald-400" />
            </Section>
          )}

          {/* Safety */}
          {(reportType === 'weekly' || reportType === 'safety') && (
            <Section title="Health, Safety & Environment">
              <Row label="Accidents to Date (This Week)" value={latestReport?.safety_incidents || 0} highlight={(latestReport?.safety_incidents || 0) > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'} />
              <Row label="Near Misses (Latest Report)" value={latestReport?.near_misses || 0} highlight={(latestReport?.near_misses || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'} />
              <Row label="Total Labour on Site" value={latestReport?.total_labour || 0} />
              {latestReport?.safety_notes && (
                <div className="mt-2">
                  <div className="text-[10px] text-[#6e7d8c] mb-1">Safety Notes</div>
                  <div className="text-[12px] text-[#bfb9ae] bg-[#1c2a36] rounded p-2.5">{latestReport.safety_notes}</div>
                </div>
              )}
            </Section>
          )}

          {/* Risk */}
          {(reportType === 'board') && (
            <Section title="Key Risks">
              <Row label="Open Risks" value={openRisks} />
              <Row label="High / Critical" value={highRisks} highlight={highRisks > 0 ? 'text-red-400 font-bold' : 'text-emerald-400'} />
              {risks.filter(r => r.status === 'Open' && (r.risk_score || 0) >= 12).slice(0, 5).map(r => (
                <div key={r.id} className="mt-1.5 flex items-start gap-2">
                  <span className="badge badge-red mt-0.5 flex-shrink-0">{r.risk_score}</span>
                  <div>
                    <div className="text-[12px] text-[#bfb9ae]">{r.title}</div>
                    <div className="text-[10px] text-[#6e7d8c]">{r.mitigation_action}</div>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Financial (board only) */}
          {reportType === 'board' && (
            <Section title="Financial Position">
              <Row label="Contract Sum" value={contractSum === 0 ? 'TBC' : formatCurrency(contractSum)} highlight="text-[#c49e48]" />
              <Row label="Approved Variations" value={formatCurrency(financial.filter(f => f.type === 'Variation' && f.status === 'Approved').reduce((s, f) => s + (f.direction === 'Addition' ? f.amount : -f.amount), 0))} />
              <Row label="Certified to Date" value={formatCurrency(financial.filter(f => f.type === 'Payment' && f.status === 'Certified').reduce((s, f) => s + f.amount, 0))} />
            </Section>
          )}

          {/* Footer */}
          <div className="border-t border-white/[0.06] pt-4 mt-6">
            <div className="text-[10px] text-[#6e7d8c] font-mono">
              Generated by Lakowe SPA Project Command Centre · {reportDate} · Confidential
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
