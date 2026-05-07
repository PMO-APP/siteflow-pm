import {
  ArrowRight,
  ShieldCheck,
  BarChart3,
  ClipboardCheck,
  Clock,
  FileText,
  Layers,
  Gauge,
  Briefcase,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

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

const STEPS = [
  {
    title: 'Create Projects',
    desc: 'Set up each project with its own dashboard, schedule, risks, and records.',
    icon: Briefcase,
  },
  {
    title: 'Track Execution',
    desc: 'Monitor programme, approvals, procurement, snags, financials, and reports.',
    icon: Gauge,
  },
  {
    title: 'Control Delivery',
    desc: 'Escalate risks early, act faster, and keep leadership informed.',
    icon: ShieldCheck,
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  const goToSignIn = () => navigate('/Login')
  const goToSignUp = () => navigate('/signup')

  return (
   <div className="min-h-screen bg-[#0c1014] text-white overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(196,158,72,0.18),transparent_35%),radial-gradient(circle_at_top_left,rgba(69,153,212,0.10),transparent_30%)]" />

      <div className="relative z-10">
        <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <PMOCorexLogo size={38} />

          <div className="flex gap-4 items-center">
            <button
  type="button"
  onClick={() => navigate('/pricing')}
  className="text-sm text-slate-300 hover:text-[#c49e48] transition"
>
  Pricing
</button>
            <button
              type="button"
              onClick={goToSignIn}
              className="text-sm text-slate-300 hover:text-[#c49e48] transition"
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={goToSignUp}
              className="btn-gold btn-sm btn"
            >
              Get Started
            </button>
          </div>
        </header>

        <section className="max-w-7xl mx-auto px-6 pb-20">
  <div className="text-center mb-10">
    <div className="text-xs uppercase tracking-[0.35em] text-[#c49e48]">
      Product Preview
    </div>

    <h2 className="text-3xl font-bold mt-3">
      See PMOCorex in action.
    </h2>

    <p className="text-slate-400 mt-2">
      Sample project views using anonymized demonstration data.
    </p>
  </div>

  <div className="grid lg:grid-cols-3 gap-6">
    <PreviewDashboard />
    <PreviewRisk />
    <PreviewSchedule />
  </div>
</section>

        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="text-center mb-10">
            <div className="text-xs uppercase tracking-[0.35em] text-[#c49e48]">
              Platform Modules
            </div>
            <h2 className="text-3xl font-bold mt-3">
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

        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((step, index) => {
              const Icon = step.icon

              return (
                <div key={step.title} className="card p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-lg bg-[#c49e48]/10 border border-[#c49e48]/20 flex items-center justify-center">
                      <Icon size={18} className="text-[#c49e48]" />
                    </div>
                    <div className="text-4xl font-black text-white/5">
                      0{index + 1}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold">
                    {step.title}
                  </h3>

                  <p className="text-sm text-slate-400 mt-2">
                    {step.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="text-center mb-10">
            <div className="text-xs uppercase tracking-[0.35em] text-[#c49e48]">
              Product Preview
            </div>
            <h2 className="text-3xl font-bold mt-3">
              See PMOCorex in action.
            </h2>
            <p className="text-slate-400 mt-2">
              Add real product screenshots here once your dashboard views are ready.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              ['Executive Dashboard', '/dashboard.png'],
              ['Risk Register', '/risk.png'],
              ['Schedule Control', '/schedule.png'],
            ].map(([title, img]) => (
              <div key={title} className="card p-3">
                <div className="aspect-video rounded-lg bg-[#111820] border border-white/[0.06] overflow-hidden flex items-center justify-center">
                  <img
                    src={img}
                    alt={title}
                    className="w-full h-full object-cover"
                    onError={e => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div className="text-xs text-slate-500">
                    {title} screenshot
                  </div>
                </div>

                <div className="text-sm text-white mt-3">
                  {title}
                </div>
              </div>
            ))}
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
              type="button"
              onClick={goToSignUp}
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
function PreviewDashboard() {
  return (
    <div className="card p-4">
      <div className="aspect-video rounded-xl bg-[#0f151c] border border-white/[0.06] overflow-hidden">
        <div className="h-8 border-b border-white/[0.06] flex items-center gap-2 px-3">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="ml-2 text-[10px] text-slate-500">
            Demo Project Dashboard
          </span>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-xl bg-[#162230] border border-[#c49e48]/10 p-4">
            <div className="flex items-center gap-5">
              <div>
                <div className="text-4xl font-black text-[#c49e48]">
                  128
                </div>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest">
                  Days left
                </div>
              </div>

              <div className="flex-1">
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                  Sample Residential Project
                </div>
                <div className="text-sm font-semibold mt-1">
                  Formal Handover Target
                </div>
                <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-[62%] bg-[#c49e48] rounded-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              ['62%', 'Progress'],
              ['-4%', 'Variance'],
              ['6', 'Risks'],
              ['11', 'Approvals'],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-lg bg-[#162230] border border-white/[0.05] p-3"
              >
                <div className="text-lg font-bold text-white">
                  {value}
                </div>
                <div className="text-[9px] text-slate-500 mt-1">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#162230] p-3">
              <div className="text-[10px] text-slate-400 mb-2">
                Phase Progress
              </div>
              <div className="space-y-2">
                <div className="h-1.5 bg-[#c49e48] rounded w-[85%]" />
                <div className="h-1.5 bg-blue-400 rounded w-[58%]" />
                <div className="h-1.5 bg-emerald-400 rounded w-[34%]" />
              </div>
            </div>

            <div className="rounded-lg bg-[#162230] p-3">
              <div className="text-[10px] text-slate-400 mb-2">
                AI Insight
              </div>
              <div className="text-xl font-bold text-emerald-400">
                74%
              </div>
              <div className="text-[9px] text-slate-500">
                handover confidence
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-sm text-white mt-3">
        Executive Dashboard
      </div>

      <div className="text-xs text-slate-500 mt-1">
        Portfolio-ready view of progress, risks, timelines, and alerts.
      </div>
    </div>
  )
}

function PreviewRisk() {
  return (
    <div className="card p-4">
      <div className="aspect-video rounded-xl bg-[#0f151c] border border-white/[0.06] overflow-hidden">
        <div className="h-8 border-b border-white/[0.06] flex items-center px-3">
          <span className="text-[10px] text-slate-500">
            Risk Intelligence
          </span>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              ['9', 'Open'],
              ['3', 'High'],
              ['5', 'Watch'],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-lg bg-[#162230] border border-white/[0.05] p-3"
              >
                <div className="text-xl font-bold text-[#c49e48]">
                  {value}
                </div>
                <div className="text-[9px] text-slate-500">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-[#162230] p-3">
            <div className="text-[10px] text-slate-400 mb-3">
              Risk Heatmap
            </div>

            <div className="space-y-2">
              <div className="h-2 bg-red-500 rounded w-[82%]" />
              <div className="h-2 bg-amber-400 rounded w-[64%]" />
              <div className="h-2 bg-emerald-400 rounded w-[38%]" />
            </div>
          </div>

          <div className="space-y-2">
            {[
              ['Procurement delay', 'High'],
              ['Approval dependency', 'Medium'],
              ['Site access constraint', 'Watch'],
            ].map(([item, tag]) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-lg bg-[#162230] px-3 py-2"
              >
                <span className="text-[11px] text-slate-300">
                  {item}
                </span>

                <span className="text-[9px] text-[#c49e48]">
                  {tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-sm text-white mt-3">
        Risk Register
      </div>

      <div className="text-xs text-slate-500 mt-1">
        Turn delivery threats into structured risk intelligence.
      </div>
    </div>
  )
}

function PreviewSchedule() {
  return (
    <div className="card p-4">
      <div className="aspect-video rounded-xl bg-[#0f151c] border border-white/[0.06] overflow-hidden">
        <div className="h-8 border-b border-white/[0.06] flex items-center px-3">
          <span className="text-[10px] text-slate-500">
            Schedule Control
          </span>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-xl bg-[#162230] p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-slate-400">
                Recovery Forecast
              </div>
              <div className="text-[10px] text-amber-400">
                On Watch
              </div>
            </div>

            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-[58%] bg-amber-400 rounded-full" />
            </div>
          </div>

          <div className="space-y-2">
            {[
              ['Foundation close-out', 'Complete', '100%'],
              ['Superstructure works', 'Active', '64%'],
              ['Finishes package', 'Watch', '32%'],
              ['External works', 'Pending', '12%'],
            ].map(([task, status, pct]) => (
              <div
                key={task}
                className="grid grid-cols-[1fr_auto_auto] gap-3 items-center rounded-lg bg-[#162230] px-3 py-2"
              >
                <span className="text-[11px] text-slate-300 truncate">
                  {task}
                </span>

                <span className="text-[9px] text-slate-500">
                  {status}
                </span>

                <span className="text-[9px] text-[#c49e48]">
                  {pct}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-sm text-white mt-3">
        Schedule Control
      </div>

      <div className="text-xs text-slate-500 mt-1">
        Track progress, variance, deadlines, and recovery actions.
      </div>
    </div>
  )
}
