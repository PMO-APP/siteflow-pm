import { BarChart3, Brain, FileText, Archive, Gauge, LineChart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const BI_MODULES = [
  {
    title: 'Executive Dashboard',
    description: 'Live portfolio KPIs, RAG status, progress, cost and risk indicators.',
    icon: BarChart3,
    status: 'Active',
    path: '/app',
  },
  {
    title: 'Portfolio Analytics',
    description: 'Compare project performance, delays, budgets and risk exposure across the portfolio.',
    icon: LineChart,
    status: 'Coming Soon',
    path: '',
  },
  {
    title: 'Executive Reports',
    description: 'Generate weekly, monthly and board-level reports from live PMOCorex records.',
    icon: FileText,
    status: 'Active',
    path: '/app/pmo-weekly-report',
  },
  {
    title: 'KPI Centre',
    description: 'Track SPI, CPI, progress, quality, HSE, cost, procurement and consultant KPIs.',
    icon: Gauge,
    status: 'Coming Soon',
    path: '',
  },
  {
    title: 'Report Archive',
    description: 'Search and retrieve previously generated executive reports.',
    icon: Archive,
    status: 'Coming Soon',
    path: '',
  },
  {
    title: 'AI Insights',
    description: 'Executive recommendations, early warnings, delay insights and action prompts.',
    icon: Brain,
    status: 'Coming Soon',
    path: '',
  },
]

export default function BusinessIntelligencePage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#c49e48]/20 bg-gradient-to-br from-[#111820] via-[#162230] to-[#0f151c] p-6 sm:p-8">
        <div className="inline-flex mb-4 px-3 py-1 rounded-full border border-[#c49e48]/30 bg-[#c49e48]/10 text-[#c49e48] text-xs">
          Business Intelligence
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-[#ede8de]">
          Business Intelligence
        </h1>

        <p className="text-slate-400 mt-3 max-w-3xl">
          Convert live project data into executive dashboards, portfolio analytics,
          automated reports, KPI tracking and management insights.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {BI_MODULES.map(({ title, description, icon: Icon, status, path }) => (
          <button
            key={title}
            type="button"
            onClick={() => path && navigate(path)}
            className="card p-5 text-left hover:border-[#c49e48]/30 hover:bg-[#c49e48]/5 transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="h-11 w-11 rounded-2xl border border-[#c49e48]/20 bg-[#c49e48]/10 flex items-center justify-center">
                <Icon size={20} className="text-[#c49e48]" />
              </div>

              <span
                className={`badge ${
                  status === 'Active' ? 'badge-green' : 'badge-muted'
                }`}
              >
                {status}
              </span>
            </div>

            <h2 className="text-lg font-bold text-[#ede8de] mt-5">
              {title}
            </h2>

            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              {description}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
