import { Activity, ShieldCheck, AlertTriangle } from 'lucide-react'

interface Props {
  progress: number
  variance: number | null
  openRisks: number
  overdueTasks: number
}

export default function DeliveryPulse({
  progress,
  variance,
  openRisks,
  overdueTasks,
}: Props) {
  const score =
    Math.max(
      0,
      Math.min(
        100,
        progress -
          (variance !== null && variance < 0 ? Math.abs(variance) : 0) -
          openRisks * 2 -
          overdueTasks * 3
      )
    )

  const status =
    score >= 80
      ? 'Strong'
      : score >= 60
      ? 'Watch'
      : 'Critical'

  const color =
    score >= 80
      ? 'text-emerald-400'
      : score >= 60
      ? 'text-amber-400'
      : 'text-red-400'

  const Icon =
    score >= 80
      ? ShieldCheck
      : score >= 60
      ? Activity
      : AlertTriangle

  return (
    <div className="card p-5 overflow-hidden relative">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#c49e48]/10 blur-3xl" />

      <div className="relative flex items-center justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-[#6e7d8c]">
            Delivery Pulse
          </div>

          <div className="mt-2 text-4xl font-black text-[#ede8de]">
            {score}%
          </div>

          <div className={`mt-1 text-sm font-medium ${color}`}>
            {status} delivery outlook
          </div>

          <div className="text-xs text-[#6e7d8c] mt-3">
            Based on progress, variance, overdue tasks and open risks.
          </div>
        </div>

        <div className="relative h-28 w-28 rounded-full border border-[#c49e48]/20 flex items-center justify-center">
          <div
            className="absolute inset-2 rounded-full"
            style={{
              background: `conic-gradient(#c49e48 ${score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
            }}
          />

          <div className="relative h-20 w-20 rounded-full bg-[#0c1014] flex items-center justify-center">
            <Icon size={28} className={color} />
          </div>
        </div>
      </div>
    </div>
  )
}
