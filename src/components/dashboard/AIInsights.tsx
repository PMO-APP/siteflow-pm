import {
  AlertTriangle,
  BrainCircuit,
  TrendingUp,
  ShieldAlert,
  Clock3,
} from 'lucide-react'

interface Props {
  overdueTasks: number
  procurementRisks: number
  highRisks: number
  variance: number
  handoverConfidence: number
}

export default function AIInsights({
  overdueTasks,
  procurementRisks,
  highRisks,
  variance,
  handoverConfidence,
}: Props) {

  const insights: string[] = []

  if (overdueTasks > 0) {
    insights.push(
      `${overdueTasks} overdue task${
        overdueTasks > 1 ? 's are' : ' is'
      } affecting schedule performance.`
    )
  }

  if (procurementRisks > 0) {
    insights.push(
      `${procurementRisks} procurement item${
        procurementRisks > 1 ? 's may' : ' may'
      } delay finishing activities.`
    )
  }

  if (highRisks > 0) {
    insights.push(
      `${highRisks} high-impact project risk${
        highRisks > 1 ? 's require' : ' requires'
      } executive attention.`
    )
  }

  if (variance < -5) {
    insights.push(
      `Project is significantly behind schedule recovery threshold.`
    )
  }

  if (handoverConfidence < 70) {
    insights.push(
      `Predicted handover confidence reduced to ${handoverConfidence}%.`
    )
  }

  if (insights.length === 0) {
    insights.push(
      'Project delivery indicators currently stable.'
    )
  }

 return (
  <div className="card overflow-hidden">
    <div className="border-b border-white/5 p-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <BrainCircuit
          size={18}
          className="text-[#c49e48]"
        />

        <div>
          <div className="font-semibold text-[#ede8de]">
            AI Insights
          </div>

          <div className="text-xs text-[#6e7d8c]">
            Real-time project intelligence
          </div>
        </div>
      </div>

      <div className="text-[10px] px-2 py-1 rounded-full bg-[#c49e48]/10 text-[#c49e48] border border-[#c49e48]/20">
        LIVE
      </div>
    </div>

    <div className="p-4 space-y-3">
      {insights.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]"
        >
          <div className="mt-0.5">
            {i % 4 === 0 ? (
              <AlertTriangle
                size={15}
                className="text-red-400"
              />
            ) : i % 4 === 1 ? (
              <Clock3
                size={15}
                className="text-amber-400"
              />
            ) : i % 4 === 2 ? (
              <ShieldAlert
                size={15}
                className="text-violet-400"
              />
            ) : (
              <TrendingUp
                size={15}
                className="text-emerald-400"
              />
            )}
          </div>

          <div className="text-sm text-[#bfb9ae] leading-relaxed">
            {item}
          </div>
        </div>
      ))}
    </div>
  </div>
)
}
