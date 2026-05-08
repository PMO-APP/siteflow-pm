import {
  ArrowRight,
  Clock3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Layers,
  BarChart3,
} from 'lucide-react'

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-[#070b0f] text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(196,158,72,0.20),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(69,153,212,0.14),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(196,158,72,0.10),transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(7,11,15,0.35),rgba(7,11,15,0.96))]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 min-h-screen flex flex-col">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-[#c49e48]">
              PMOCorex
            </div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-slate-500 mt-1">
              Portfolio Control System
            </div>
          </div>

          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Private Beta
          </div>
        </header>

        <main className="flex-1 grid lg:grid-cols-2 gap-12 items-center py-16">
          <section>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#c49e48]/25 bg-[#c49e48]/10 text-[#c49e48] text-sm mb-7">
              <Sparkles size={16} />
              Built for project delivery teams
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95] text-[#f4efe6]">
              Portfolio control for serious project delivery.
            </h1>

            <p className="mt-7 text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed">
              PMOCorex is an enterprise-grade control layer for construction and real estate teams,
              built to manage schedules, risks, approvals, procurement, snags, financials, and executive reporting.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <div className="inline-flex items-center gap-2 rounded-xl bg-[#c49e48] text-[#070b0f] px-5 py-3 font-semibold shadow-[0_20px_60px_rgba(196,158,72,0.25)]">
                <LockKeyhole size={17} />
                Invite-only access
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-slate-300">
                <Clock3 size={17} />
                Launching soon
              </div>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-5 max-w-lg">
              {[
                ['360°', 'Visibility'],
                ['AI', 'Insights'],
                ['PMO', 'Control'],
              ].map(([value, label]) => (
                <div key={label}>
                  <div className="text-3xl font-black text-white">
                    {value}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="relative">
            <div className="absolute -inset-8 bg-[#c49e48]/20 blur-3xl rounded-full" />

            <div className="relative rounded-3xl border border-white/[0.08] bg-[#0f151c]/90 shadow-2xl overflow-hidden backdrop-blur-xl">
              <div className="h-12 border-b border-white/[0.07] bg-white/[0.03] flex items-center gap-2 px-5">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-slate-500">
                  PMOCorex Command Centre
                </span>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['72%', 'Progress', 'text-[#c49e48]'],
                    ['8', 'Open Risks', 'text-red-400'],
                    ['14', 'Approvals', 'text-amber-400'],
                  ].map(([value, label, color]) => (
                    <div key={label} className="rounded-2xl bg-[#182431] border border-white/[0.06] p-4">
                      <div className={`text-2xl font-black ${color}`}>
                        {value}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-[#182431] border border-[#c49e48]/15 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-slate-300">
                      Recovery Forecast
                    </div>
                    <div className="text-sm text-[#c49e48]">
                      On Watch
                    </div>
                  </div>

                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#c49e48] to-[#e3c06a]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <PreviewCard icon={ShieldCheck} title="Risk Control" value="High priority" />
                  <PreviewCard icon={Layers} title="Portfolio View" value="Multi-project" />
                  <PreviewCard icon={BarChart3} title="Executive Report" value="Board-ready" />
                  <PreviewCard icon={ArrowRight} title="Status" value="Private beta" />
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/[0.06] py-5 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-slate-500">
          <span>© PMOCorex. Built for project delivery intelligence.</span>
          <span>Private beta access is restricted to authorized teams.</span>
        </footer>
      </div>
    </div>
  )
}

function PreviewCard({ icon: Icon, title, value }: any) {
  return (
    <div className="rounded-2xl bg-[#182431] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between">
        <Icon size={17} className="text-[#c49e48]" />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">
          Live
        </span>
      </div>

      <div className="mt-5 text-sm font-semibold text-white">
        {title}
      </div>

      <div className="text-xs text-slate-500 mt-1">
        {value}
      </div>
    </div>
  )
}
