import {
  ShieldCheck,
  LockKeyhole,
  Sparkles,
  BarChart3,
  Layers3,
  Activity,
} from 'lucide-react'

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-[#05080c] text-white overflow-hidden relative">
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(196,158,72,0.10),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(69,153,212,0.08),transparent_30%)]" />

      <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* HEADER */}
        <header className="border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div>
              <div className="text-[26px] font-black tracking-tight text-[#c49e48]">
                PMOCorex
              </div>

              <div className="text-[10px] uppercase tracking-[0.35em] text-slate-600 mt-1">
                Portfolio Control System
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

              <span className="text-xs text-emerald-400 font-medium">
                Private Beta
              </span>
            </div>
          </div>
        </header>

        {/* HERO */}
        <main className="flex-1 flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              {/* LEFT */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#c49e48]/20 bg-[#c49e48]/10 px-4 py-2 text-sm text-[#c49e48] mb-8">
                  <Sparkles size={15} />
                  Enterprise Project Intelligence
                </div>

                <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.92] text-[#f5efe5]">
                  Control delivery across your entire portfolio.
                </h1>

                <p className="mt-8 text-lg leading-relaxed text-slate-400 max-w-2xl">
                  PMOCorex is a private project intelligence platform built
                  for construction and real estate organizations managing
                  high-value delivery operations across multiple projects,
                  teams, and stakeholders.
                </p>

                <div className="mt-10 flex flex-wrap gap-4">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-[#c49e48] px-5 py-3 text-[#05080c] font-semibold shadow-[0_15px_50px_rgba(196,158,72,0.18)]">
                    <LockKeyhole size={17} />
                    Restricted Access
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-slate-300">
                    <ShieldCheck size={17} />
                    Internal Deployment
                  </div>
                </div>

                {/* METRICS */}
                <div className="mt-14 grid grid-cols-3 gap-6 max-w-xl">
                  {[
                    ['Multi', 'Portfolio'],
                    ['AI', 'Insights'],
                    ['Live', 'Control'],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <div className="text-3xl font-black text-white">
                        {value}
                      </div>

                      <div className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT */}
              <div className="relative">
                <div className="absolute -inset-10 bg-[#c49e48]/10 blur-3xl rounded-full" />

                <div className="relative rounded-3xl border border-white/[0.08] bg-[#0d1319]/95 overflow-hidden backdrop-blur-xl shadow-2xl">
                  {/* TOP BAR */}
                  <div className="h-14 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between px-5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-400" />
                      <span className="w-3 h-3 rounded-full bg-amber-400" />
                      <span className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>

                    <div className="text-xs text-slate-500">
                      PMOCorex Executive Command Centre
                    </div>
                  </div>

                  {/* CONTENT */}
                  <div className="p-6 space-y-5">
                    {/* TOP STATS */}
                    <div className="grid grid-cols-3 gap-3">
                      <StatCard
                        value="72%"
                        label="Portfolio Progress"
                        color="text-[#c49e48]"
                      />

                      <StatCard
                        value="08"
                        label="Open Risks"
                        color="text-red-400"
                      />

                      <StatCard
                        value="14"
                        label="Pending Approvals"
                        color="text-amber-400"
                      />
                    </div>

                    {/* DELIVERY STATUS */}
                    <div className="rounded-2xl border border-[#c49e48]/10 bg-[#151f29] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            Delivery Forecast
                          </div>

                          <div className="text-xs text-slate-500 mt-1">
                            Portfolio performance tracking
                          </div>
                        </div>

                        <div className="text-sm font-medium text-[#c49e48]">
                          Stable
                        </div>
                      </div>

                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#c49e48] to-[#e3c06a]" />
                      </div>
                    </div>

                    {/* MODULES */}
                    <div className="grid grid-cols-2 gap-3">
                      <ModuleCard
                        icon={ShieldCheck}
                        title="Risk Control"
                        value="Live mitigation"
                      />

                      <ModuleCard
                        icon={Layers3}
                        title="Portfolio Oversight"
                        value="Multi-project"
                      />

                      <ModuleCard
                        icon={BarChart3}
                        title="Executive Reports"
                        value="Board-ready"
                      />

                      <ModuleCard
                        icon={Activity}
                        title="Delivery Monitoring"
                        value="Real-time"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="text-xs text-slate-600">
              © PMOCorex • Internal Project Intelligence Platform
            </div>

            <div className="text-xs text-slate-600">
              Access restricted to authorized organizations only.
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function StatCard({
  value,
  label,
  color,
}: {
  value: string
  label: string
  color: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#151f29] p-4">
      <div className={`text-3xl font-black ${color}`}>
        {value}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {label}
      </div>
    </div>
  )
}

function ModuleCard({
  icon: Icon,
  title,
  value,
}: any) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#151f29] p-4">
      <div className="flex items-center justify-between">
        <Icon size={16} className="text-[#c49e48]" />

        <span className="text-[10px] uppercase tracking-widest text-slate-600">
          Live
        </span>
      </div>

      <div className="mt-5 text-sm font-semibold text-white">
        {title}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {value}
      </div>
    </div>
  )
}
