import { useMembershipStore } from '@/store/membership'
import { canExportReports } from '@/lib/permissions'
import { useState } from 'react'
import { Printer } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import {
  useProcurement,
  useApprovals,
  useSnags,
  useRisks,
  useFinancial,
  useSiteReports,
} from '@/hooks/useData'
import {
  fdate,
  formatCurrency,
  PROJECT_END,
} from '@/lib/utils'
import { differenceInDays } from 'date-fns'

export default function ReportsPage() {
  const role = useMembershipStore(state => state.role)
  const canExport = canExportReports(role)

  const { data: tasks = [] } = useTasks()
  const { data: procs = [] } = useProcurement()
  const { data: approvals = [] } = useApprovals()
  const { data: snags = [] } = useSnags()
  const { data: risks = [] } = useRisks()
  const { data: financial = [] } = useFinancial()
  const { data: siteReports = [] } = useSiteReports()

  const [reportType, setReportType] =
    useState<'weekly' | 'board' | 'safety'>('weekly')

  const today = new Date()
  const daysLeft = Math.max(
    0,
    differenceInDays(PROJECT_END, today)
  )

  const done = tasks.filter(task => task.status === 'Completed').length
  const inProg = tasks.filter(task => task.status === 'In Progress').length
  const overdue = tasks.filter(task => task.rag === 'RED').length
  const progressPct = tasks.length
    ? Math.round((done / tasks.length) * 100)
    : 0

  const openSnags = snags.filter(snag => snag.status !== 'Closed').length
  const criticalSnags = snags.filter(
    snag => snag.severity === 'Critical' && snag.status !== 'Closed'
  ).length

  const openRisks = risks.filter(risk => risk.status === 'Open').length
  const highRisks = risks.filter(
    risk => risk.status === 'Open' && (risk.risk_score || 0) >= 12
  ).length

  const pendingApprovals = approvals.filter(
    approval =>
      approval.status !== 'Approved' &&
      approval.status !== 'Rejected'
  ).length

  const overdueApprovals = approvals.filter(
    approval =>
      approval.status !== 'Approved' &&
      approval.deadline &&
      differenceInDays(new Date(approval.deadline), today) < 0
  ).length

  const contractSum = financial
    .filter(item => item.type === 'Contract Sum')
    .reduce((sum, item) => sum + item.amount, 0)

  const latestReport = siteReports[0]

  const procRisks = procs.filter(item => {
    const days = item.order_by_date
      ? differenceInDays(new Date(item.order_by_date), today)
      : null

    return (
      days !== null &&
      days <= 14 &&
      item.status !== 'Delivered' &&
      item.status !== 'Ordered'
    )
  })

  const reportDate = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const handlePrint = () => {
    if (!canExport) return
    window.print()
  }

  const Section = ({
    title,
    children,
  }: {
    title: string
    children: React.ReactNode
  }) => (
    <div className="mb-6">
      <div className="text-[10px] font-mono text-[#c49e48] uppercase tracking-widest border-b border-[#c49e48]/20 pb-1 mb-3">
        {title}
      </div>
      {children}
    </div>
  )

  const Row = ({
    label,
    value,
    highlight,
  }: {
    label: string
    value: string | number
    highlight?: string
  }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
      <span className="text-[12px] text-[#6e7d8c]">
        {label}
      </span>

      <span
        className={`text-[12px] font-medium ${
          highlight || 'text-[#ede8de]'
        }`}
      >
        {value}
      </span>
    </div>
  )

  return (
    <div className="space-y-4">
      {!canExport && (
        <div className="card p-3 text-[11px] text-amber-400 border border-amber-500/20">
          View Only Mode — you can view reports, but you cannot print or
          export them.
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-md overflow-hidden border border-white/[0.08]">
          {[
            ['weekly', 'Weekly Progress'],
            ['board', 'Board Report'],
            ['safety', 'Safety Summary'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() =>
                setReportType(value as 'weekly' | 'board' | 'safety')
              }
              className={`px-4 py-2 text-[12px] font-medium transition-colors ${
                reportType === value
                  ? 'bg-[#c49e48] text-[#0c1014]'
                  : 'bg-[#1c2a36] text-[#6e7d8c] hover:text-[#bfb9ae]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {canExport && (
          <button className="btn-ghost btn-sm btn" onClick={handlePrint}>
            <Printer size={13} />
            Print / PDF
          </button>
        )}
      </div>

      <div className="card print:shadow-none" id="report-content">
        <div className="relative overflow-hidden">
          <div className="gold-bar" />

          <div className="px-8 pt-6 pb-4 border-b border-white/[0.06]">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[9px] font-mono text-[#c49e48] uppercase tracking-[0.2em] mb-1">
                  Project Command Centre
                </div>

                <div className="font-display text-2xl font-bold text-[#ede8de]">
                  {reportType === 'weekly'
                    ? 'Weekly Progress Report'
                    : reportType === 'board'
                    ? 'Board Project Update'
                    : 'Safety Summary Report'}
                </div>

                <div className="text-[#6e7d8c] text-sm mt-1">
                  Proposed SPA at Lakowe Lakes — Mixta Africa
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-[#6e7d8c] font-mono">
                  Report Date
                </div>

                <div className="text-[13px] text-[#ede8de] font-medium">
                  {reportDate}
                </div>

                <div className="text-[10px] text-[#6e7d8c] font-mono mt-1">
                  Target Completion
                </div>

                <div className="text-[13px] text-[#c49e48] font-bold">
                  18 September 2026
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3 flex-wrap">
              {[
                {
                  label: 'Programme',
                  rag: overdue > 0 ? 'RED' : 'GREEN',
                },
                {
                  label: 'Approvals',
                  rag: overdueApprovals > 0 ? 'RED' : 'GREEN',
                },
                {
                  label: 'Procurement',
                  rag: procRisks.length > 0 ? 'AMBER' : 'GREEN',
                },
                {
                  label: 'Safety',
                  rag:
                    (latestReport?.safety_incidents || 0) > 0
                      ? 'RED'
                      : 'GREEN',
                },
                {
                  label: 'Risk',
                  rag:
                    highRisks > 0
                      ? 'RED'
                      : openRisks > 0
                      ? 'AMBER'
                      : 'GREEN',
                },
              ].map(item => (
                <div
                  key={item.label}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${
                    item.rag === 'RED'
                      ? 'text-red-400 bg-red-400/10 border-red-400/20'
                      : item.rag === 'AMBER'
                      ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                      : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.rag === 'RED'
                        ? 'bg-red-400'
                        : item.rag === 'AMBER'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 space-y-0">
          {(reportType === 'weekly' || reportType === 'board') && (
            <Section title="Programme Status">
              <Row
                label="Days to Completion"
                value={`${daysLeft} days`}
                highlight={
                  daysLeft < 60
                    ? 'text-red-400 font-bold'
                    : 'text-[#c49e48] font-bold'
                }
              />

              <Row
                label="Overall Task Progress"
                value={`${progressPct}%`}
              />

              <Row
                label="Tasks Completed"
                value={`${done} / ${tasks.length}`}
              />

              <Row label="In Progress" value={inProg} />

              <Row
                label="Overdue Tasks (RED)"
                value={overdue}
                highlight={overdue > 0 ? 'text-red-400' : 'text-emerald-400'}
              />
            </Section>
          )}

          {reportType === 'weekly' && latestReport && (
            <Section title="Site Progress (Latest Report)">
              <Row label="Report Date" value={fdate(latestReport.report_date)} />

              <Row
                label="Weather"
                value={`${latestReport.weather}, ${latestReport.temperature_c}°C`}
              />

              <Row label="Total Labour on Site" value={latestReport.total_labour} />

              <Row
                label="Skilled / Unskilled"
                value={`${latestReport.skilled_labour} / ${latestReport.unskilled_labour}`}
              />

              <Row
                label="Overall Site Progress"
                value={`${latestReport.overall_progress_pct || 0}%`}
              />

              {latestReport.works_carried_out && (
                <div className="mt-2">
                  <div className="text-[10px] text-[#6e7d8c] mb-1">
                    Works Carried Out
                  </div>

                  <div className="text-[12px] text-[#bfb9ae] bg-[#1c2a36] rounded p-2.5 whitespace-pre-wrap">
                    {latestReport.works_carried_out}
                  </div>
                </div>
              )}
            </Section>
          )}

          {(reportType === 'weekly' || reportType === 'board') && (
            <Section title="Approvals Status">
              <Row
                label="Total Pending"
                value={pendingApprovals}
                highlight={
                  pendingApprovals > 3
                    ? 'text-amber-400'
                    : 'text-[#ede8de]'
                }
              />

              <Row
                label="Overdue Approvals"
                value={overdueApprovals}
                highlight={
                  overdueApprovals > 0
                    ? 'text-red-400 font-bold'
                    : 'text-emerald-400'
                }
              />

              <Row
                label="Approved to Date"
                value={
                  approvals.filter(approval => approval.status === 'Approved')
                    .length
                }
              />

              {overdueApprovals > 0 && (
                <div className="mt-2 bg-red-500/[0.08] border border-red-500/20 rounded p-2.5">
                  <div className="text-[10px] text-red-400 font-semibold mb-1.5">
                    Overdue — Immediate Action Required
                  </div>

                  {approvals
                    .filter(
                      approval =>
                        approval.status !== 'Approved' &&
                        approval.deadline &&
                        differenceInDays(
                          new Date(approval.deadline),
                          today
                        ) < 0
                    )
                    .map(approval => (
                      <div
                        key={approval.id}
                        className="text-[11px] text-red-300"
                      >
                        • {approval.title} deadline {fdate(approval.deadline)}
                      </div>
                    ))}
                </div>
              )}
            </Section>
          )}

          {(reportType === 'weekly' || reportType === 'board') && (
            <Section title="Procurement">
              <Row label="Total Items Tracked" value={procs.length} />

              <Row
                label="Delivered"
                value={procs.filter(item => item.status === 'Delivered').length}
                highlight="text-emerald-400"
              />

              <Row
                label="Orders Placed"
                value={
                  procs.filter(
                    item =>
                      item.status === 'Ordered' ||
                      item.status === 'In Transit'
                  ).length
                }
              />

              <Row
                label="Order Deadline in ≤14d"
                value={procRisks.length}
                highlight={
                  procRisks.length > 0
                    ? 'text-amber-400 font-bold'
                    : 'text-emerald-400'
                }
              />

              {procRisks.length > 0 && (
                <div className="mt-2 bg-amber-500/[0.08] border border-amber-500/20 rounded p-2.5">
                  {procRisks.slice(0, 5).map(item => {
                    const days = item.order_by_date
                      ? differenceInDays(new Date(item.order_by_date), today)
                      : null

                    return (
                      <div
                        key={item.id}
                        className="text-[11px] text-amber-300"
                      >
                        • {item.name} — order by {fdate(item.order_by_date)}{' '}
                        {days !== null && days < 0
                          ? `${Math.abs(days)}d overdue`
                          : `${days}d`}
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>
          )}

          {(reportType === 'weekly' || reportType === 'board') && (
            <Section title="Defect / Snag List">
              <Row label="Total Open" value={openSnags} />

              <Row
                label="Critical Open"
                value={criticalSnags}
                highlight={
                  criticalSnags > 0
                    ? 'text-red-400 font-bold'
                    : 'text-emerald-400'
                }
              />

              <Row
                label="Closed to Date"
                value={snags.filter(snag => snag.status === 'Closed').length}
                highlight="text-emerald-400"
              />
            </Section>
          )}

          {(reportType === 'weekly' || reportType === 'safety') && (
            <Section title="Health, Safety & Environment">
              <Row
                label="Accidents to Date (This Week)"
                value={latestReport?.safety_incidents || 0}
                highlight={
                  (latestReport?.safety_incidents || 0) > 0
                    ? 'text-red-400 font-bold'
                    : 'text-emerald-400'
                }
              />

              <Row
                label="Near Misses (Latest Report)"
                value={latestReport?.near_misses || 0}
                highlight={
                  (latestReport?.near_misses || 0) > 0
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }
              />

              <Row
                label="Total Labour on Site"
                value={latestReport?.total_labour || 0}
              />

              {latestReport?.safety_notes && (
                <div className="mt-2">
                  <div className="text-[10px] text-[#6e7d8c] mb-1">
                    Safety Notes
                  </div>

                  <div className="text-[12px] text-[#bfb9ae] bg-[#1c2a36] rounded p-2.5">
                    {latestReport.safety_notes}
                  </div>
                </div>
              )}
            </Section>
          )}

          {reportType === 'board' && (
            <Section title="Key Risks">
              <Row label="Open Risks" value={openRisks} />

              <Row
                label="High / Critical"
                value={highRisks}
                highlight={
                  highRisks > 0
                    ? 'text-red-400 font-bold'
                    : 'text-emerald-400'
                }
              />

              {risks
                .filter(
                  risk =>
                    risk.status === 'Open' &&
                    (risk.risk_score || 0) >= 12
                )
                .slice(0, 5)
                .map(risk => (
                  <div
                    key={risk.id}
                    className="mt-1.5 flex items-start gap-2"
                  >
                    <span className="badge badge-red mt-0.5 flex-shrink-0">
                      {risk.risk_score}
                    </span>

                    <div>
                      <div className="text-[12px] text-[#bfb9ae]">
                        {risk.title}
                      </div>

                      <div className="text-[10px] text-[#6e7d8c]">
                        {risk.mitigation_action}
                      </div>
                    </div>
                  </div>
                ))}
            </Section>
          )}

          {reportType === 'board' && (
            <Section title="Financial Position">
              <Row
                label="Contract Sum"
                value={
                  contractSum === 0
                    ? 'TBC'
                    : formatCurrency(contractSum)
                }
                highlight="text-[#c49e48]"
              />

              <Row
                label="Approved Variations"
                value={formatCurrency(
                  financial
                    .filter(
                      item =>
                        item.type === 'Variation' &&
                        item.status === 'Approved'
                    )
                    .reduce(
                      (sum, item) =>
                        sum +
                        (item.direction === 'Addition'
                          ? item.amount
                          : -item.amount),
                      0
                    )
                )}
              />

              <Row
                label="Certified to Date"
                value={formatCurrency(
                  financial
                    .filter(
                      item =>
                        item.type === 'Payment' &&
                        item.status === 'Certified'
                    )
                    .reduce((sum, item) => sum + item.amount, 0)
                )}
              />
            </Section>
          )}

          <div className="border-t border-white/[0.06] pt-4 mt-6">
            <div className="text-[10px] text-[#6e7d8c] font-mono">
              Generated by PMOCorex Project Command Centre · {reportDate} ·
              Confidential
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
