import { BrainCircuit, FileText, Copy } from 'lucide-react'

interface Props {
  projectName: string
  progress: number
  variance: number | null
  overdueTasks: number
  openRisks: number
  highRisks: number
  pendingApprovals: number
  procurementRisks: number
}

export default function ExecutiveSummary({
  projectName,
  progress,
  variance,
  overdueTasks,
  openRisks,
  highRisks,
  pendingApprovals,
  procurementRisks,
}: Props) {
  const summary = `
${projectName || 'This project'} is currently ${progress}% complete. ${
    variance === null
      ? 'No schedule baseline is currently available.'
      : variance < -3
      ? `The project is behind schedule by ${Math.abs(variance)}%.`
      : variance > 3
      ? `The project is ahead of schedule by ${variance}%.`
      : 'The project is broadly on track against the current baseline.'
  }

Key attention areas include ${overdueTasks} overdue task(s), ${openRisks} open risk(s), ${highRisks} high risk item(s), ${pendingApprovals} pending approval(s), and ${procurementRisks} procurement risk item(s).

Recommended action: review critical path activities, close overdue approvals, and escalate high-risk items during the next project control meeting.
`.trim()

  function copySummary() {
    navigator.clipboard.writeText(summary)
    alert('Executive summary copied')
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-head">
        <div className="flex items-center gap-2">
          <BrainCircuit size={18} className="text-[#c49e48]" />
          <div>
            <div className="card-title">AI Executive Summary</div>
            <div className="text-[10px] text-slate-500">
              Board-ready project narrative
            </div>
          </div>
        </div>

        <button
          onClick={copySummary}
          className="btn-ghost btn-sm btn"
        >
          <Copy size={13} />
          Copy
        </button>
      </div>

      <div className="p-5">
        <div className="rounded-xl border border-white/[0.06] bg-[#0c1014]/60 p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {summary}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <FileText size={14} />
          Use this as a starting point for weekly PMO or board updates.
        </div>
      </div>
    </div>
  )
}
