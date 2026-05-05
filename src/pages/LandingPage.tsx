import {
  ArrowRight,
  ShieldCheck,
  BarChart3,
  ClipboardCheck,
  Clock,
  FileText,
  Layers,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const FEATURES = [
  {
    title: 'Portfolio Control',
    desc: 'Manage multiple projects from one command centre.',
    icon: Layers,
  },
  {
    title: 'Schedule Intelligence',
    desc: 'Track progress, delays, recovery forecasts, and critical activities.',
    icon: Clock,
  },
  {
    title: 'Risk Visibility',
    desc: 'Convert project issues into structured risk intelligence.',
    icon: ShieldCheck,
  },
  {
    title: 'Quality & Snag Control',
    desc: 'Monitor defects, close-out status, and handover readiness.',
    icon: ClipboardCheck,
  },
  {
    title: 'Executive Reporting',
    desc: 'Give leadership clean, decision-ready project reports.',
    icon: BarChart3,
  },
  {
    title: 'Document Control',
    desc: 'Keep approvals, drawings, reports, and records organized.',
    icon: FileText,
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0c1014] text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(196,158,72,0.18),transparent_35%),radial-gradient(circle_at_top_left,rgba(69,153,212,0.10),transparent_30%)]" />

      <div className="relative z-10">
        <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-[#c49e48]">
              PMOCorex
            </div>
            <div className="text-[11px] text-slate-500 tracking-widest uppercase">
              Portfolio Control System
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <button
              onClick={() => navigate('/Login')}
              className="text-sm text-slate-300 hover:text-[#c49e48]"
            >
              Sign In
            </button>

            <button
              onClick={() => navigate('/signup')}
              className="btn-gold btn-sm btn"
            >
              Get Started
            </button>
          </div>
        </header>

        <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex mb-5 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
              Built for project delivery teams
            </div>

            <h1 className="text-5xl lg:text-6xl font-black leading-tight">
              The Portfolio Control System for
              <span className="text-[#c49e48]"> Project Delivery</span>
            </h1>

            <p className="mt-6 text-lg text-slate-400 max-w-xl leading-relaxed">
              PMOCorex helps construction and real estate teams control schedules,
              risks, procurement, approvals, snags, financials, and executive reporting
              from one intelligent workspace.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/signup')}
                className="btn-gold btn px-6 py-3"
              >
                Start Managing Projects
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => navigate('/Login')}
                className="btn-ghost btn px-6 py-3"
              >
                Sign In
              </button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              <div>
                <div className="text-2xl font-bold">360°</div>
                <div className="text-xs text-slate-500">Project visibility</div>
              </div>

              <div>
                <div className="text-2xl font-bold">AI</div>
                <div className="text-xs text-slate-500">Delay insights</div>
              </div>

              <div>
                <div className="text-2xl font-bold">PMO</div>
                <div className="text-xs text-slate-500">Control layer</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-[#c49e48]/20 blur-3xl rounded-full" />

            <div className="relative rounded-2xl border border-[#c49e48]/20 bg-[#111820]/90 shadow-2xl overflow-hidden">
              <div className="h-10 bg-[#0f151c] border-b border-white/10 flex items-center gap-2 px-4">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-slate-500">
                  PMOCorex Dashboard
                </span>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Progress', '72%', 'text-[#c49e48]'],
                    ['Open Risks', '8', 'text-red-400'],
                    ['Pending Approvals', '14', 'text-amber-400'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="rounded-xl bg-[#1c2a36] p-4">
                      <div className={`text-2xl font-bold ${color}`}>
                        {value}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-[#1c2a36] p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-300">
                      Recovery Forecast
                    </span>
                    <span className="text-sm text-[#c49e48]">
                      On Watch
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded">
                    <div className="h-2 bg-[#c49e48] rounded w-[68%]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#1c2a36] p-4 h-28">
                    <div className="text-sm text-slate-300 mb-3">
                      Risk Heatmap
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-red-500 rounded w-4/5" />
                      <div className="h-2 bg-amber-400 rounded w-2/3" />
                      <div className="h-2 bg-emerald-400 rounded w-1/3" />
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#1c2a36] p-4 h-28">
                    <div className="text-sm text-slate-300 mb-3">
                      Snag Close-out
                    </div>
                    <div className="text-3xl font-bold text-emerald-400">
                      86%
                    </div>
                    <div className="text-xs text-slate-500">
                      handover readiness
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="mb-8">
            <h2 className="text-3xl font-bold">
              Built for control, clarity, and delivery confidence.
            </h2>
            <p className="text-slate-400 mt-2">
              Everything a PMO needs to see risks early, act faster, and report better.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map(item => {
              const Icon = item.icon

              return (
                <div
                  key={item.title}
                  className="card p-5 hover:border-[#c49e48]/40 transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#c49e48]/10 border border-[#c49e48]/20 flex items-center justify-center mb-4">
                    <Icon size={18} className="text-[#c49e48]" />
                  </div>

                  <h3 className="text-lg font-semibold">
                    {item.title}
                  </h3>

                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-16">
          <div className="rounded-2xl border border-[#c49e48]/20 bg-gradient-to-r from-[#161f28] to-[#1c2a36] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div>
              <h2 className="text-2xl font-bold">
                Bring portfolio-level control to every project.
              </h2>
              <p className="text-slate-400 mt-1">
                Start with one project. Scale across your entire delivery pipeline.
              </p>
            </div>

            <button
              onClick={() => navigate('/signup')}
              className="btn-gold btn px-6 py-3"
            >
              Launch PMOCorex
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
