import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  Menu,
  MessageSquarePlus,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'pmocorex_onboarding_completed'
const SEEN_KEY = 'pmocorex_onboarding_seen'

type TourStep = {
  title: string
  eyebrow: string
  description: string
  icon: any
  points: string[]
  visual: 'hub' | 'portfolio' | 'project' | 'controls' | 'reports' | 'support' | 'ready'
}

const steps: TourStep[] = [
  {
    title: 'Start from the Workspace Hub',
    eyebrow: 'Your starting point',
    description: 'The Workspace Hub is the global home for every user. It shows portfolios, projects, delivery attention and the Product Centre without opening a specific project.',
    icon: LayoutDashboard,
    points: ['Review workspace-level health', 'Open portfolios and projects', 'Access Help, Feedback and Onboarding globally'],
    visual: 'hub',
  },
  {
    title: 'Move from portfolio to project',
    eyebrow: 'Find your work',
    description: 'Choose a portfolio to filter the project register, then open the project you want to manage. Your access controls what you can edit.',
    icon: FolderKanban,
    points: ['Portfolio cards summarise delivery position', 'Project cards show status and attention', 'Only authorised roles see editing controls'],
    visual: 'portfolio',
  },
  {
    title: 'Use the project control centre',
    eyebrow: 'Inside a project',
    description: 'After selecting a project, the project sidebar becomes available. It contains the delivery modules for that selected project only.',
    icon: Menu,
    points: ['Schedule, Procurement and Approvals', 'Quality, HSE, Risks and Documents', 'Reports, recovery and project controls'],
    visual: 'project',
  },
  {
    title: 'Update delivery information',
    eyebrow: 'Keep the truth current',
    description: 'Use the authorised modules to update progress, approvals, procurement, risks, quality and site records. PMOCorex uses these records to calculate project intelligence.',
    icon: ClipboardCheck,
    points: ['Update progress against the approved schedule', 'Escalate blockers and overdue decisions', 'Maintain quality, HSE and governance records'],
    visual: 'controls',
  },
  {
    title: 'Review dashboards and reports',
    eyebrow: 'Turn data into decisions',
    description: 'Dashboards, executive reports and Boardroom Mode use the information entered by project teams. Management sees the same delivery truth in a clearer form.',
    icon: BarChart3,
    points: ['Monitor health and schedule pressure', 'Generate and approve executive reports', 'Present decisions and actions in Boardroom Mode'],
    visual: 'reports',
  },
  {
    title: 'Get help from anywhere',
    eyebrow: 'Global support',
    description: 'Help and Feedback are workspace-level services. You do not need to enter a project to use them, and project context is only attached when feedback is opened inside a project.',
    icon: HelpCircle,
    points: ['Search the Product Centre', 'Report an issue or suggest an improvement', 'Use Ctrl/Cmd + K to search and navigate'],
    visual: 'support',
  },
  {
    title: 'You are ready to begin',
    eyebrow: 'Tour complete',
    description: 'Return to the Workspace Hub and choose the portfolio or project relevant to your role. PMOCorex will only show controls you are authorised to use.',
    icon: Sparkles,
    points: ['Start at the Workspace Hub', 'Select a project before using project modules', 'Use Help and Feedback whenever you need support'],
    visual: 'ready',
  },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [completed, setCompleted] = useState<number[]>([])

  useEffect(() => {
    localStorage.setItem(SEEN_KEY, 'true')
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'true') setCompleted(steps.map((_, index) => index))
  }, [])

  const current = steps[step]
  const isLast = step === steps.length - 1
  const progress = Math.round((completed.length / steps.length) * 100)
  const CurrentIcon = current.icon

  const completedSet = useMemo(() => new Set(completed), [completed])

  function completeAndContinue() {
    const nextCompleted = Array.from(new Set([...completed, step]))
    setCompleted(nextCompleted)
    if (isLast) {
      localStorage.setItem(STORAGE_KEY, 'true')
      return
    }
    setStep(step + 1)
  }

  function startPMOCorex() {
    localStorage.setItem(SEEN_KEY, 'true')
    localStorage.setItem(STORAGE_KEY, 'true')
    navigate('/projects')
  }

  function leaveTour() {
    localStorage.setItem(SEEN_KEY, 'true')
    navigate('/projects')
  }

  return (
    <div className="min-h-screen bg-[#f6f5f1] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={leaveTour} className="btn btn-ghost">
            <ArrowLeft size={15} /> Back to Workspace Hub
          </button>
          <div className="text-xs font-semibold text-[#6f7d89]">PMOCorex guided tour</div>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-[#dfe3e7] bg-white shadow-sm">
          <div className="border-b border-[#e4e9eb] px-6 py-6 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#df5f41]">Getting started</div>
                <h1 className="mt-2 text-3xl font-semibold text-[#102943] sm:text-4xl">Learn how to navigate PMOCorex</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f7d89]">This tour explains the global Workspace Hub, project selection, project modules, reporting and support. It does not open or alter any project.</p>
              </div>
              <div className="min-w-40">
                <div className="flex justify-between text-xs font-semibold text-[#6f7d89]"><span>Progress</span><span>{progress}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8eef1]"><div className="h-full rounded-full bg-[#1f668f] transition-all" style={{ width: `${progress}%` }} /></div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="border-b border-[#e4e9eb] bg-[#f8fafb] p-4 lg:border-b-0 lg:border-r">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {steps.map((item, index) => {
                  const Icon = item.icon
                  const active = index === step
                  const done = completedSet.has(index)
                  return (
                    <button
                      key={item.title}
                      onClick={() => setStep(index)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${active ? 'border-[#1f668f] bg-[#eaf3f7]' : 'border-transparent hover:border-[#dce5e9] hover:bg-white'}`}
                    >
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-[#173f5f] text-white' : 'bg-white text-[#536170]'}`}>
                        {done ? <CheckCircle2 size={17} /> : <Icon size={17} />}
                      </div>
                      <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-wider text-[#87929b]">Step {index + 1}</div><div className="truncate text-sm font-semibold text-[#26384a]">{item.title}</div></div>
                    </button>
                  )
                })}
              </div>
            </aside>

            <main className="p-6 sm:p-8">
              <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf3f7] text-[#1f668f]"><CurrentIcon size={22} /></div><div><div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#df5f41]">{current.eyebrow}</div><h2 className="mt-1 text-2xl font-semibold text-[#102943]">{current.title}</h2></div></div>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-[#536170]">{current.description}</p>

              <TourVisual type={current.visual} />

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {current.points.map(point => <div key={point} className="flex gap-2 rounded-xl border border-[#e1e7ea] p-3 text-sm leading-5 text-[#536170]"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={15} /><span>{point}</span></div>)}
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5eaed] pt-5">
                <button disabled={step === 0} onClick={() => setStep(step - 1)} className="btn btn-ghost disabled:opacity-40"><ArrowLeft size={15} /> Previous</button>
                <div className="flex gap-2">
                  {!isLast && <button onClick={completeAndContinue} className="btn btn-gold">Complete step <ArrowRight size={15} /></button>}
                  {isLast && (
                    completedSet.has(step)
                      ? <button onClick={startPMOCorex} className="btn btn-gold">Start PMOCorex <ArrowRight size={15} /></button>
                      : <button onClick={completeAndContinue} className="btn btn-gold">Finish tour <CheckCircle2 size={15} /></button>
                  )}
                </div>
              </div>
            </main>
          </div>
        </section>
      </div>
    </div>
  )
}

function TourVisual({ type }: { type: TourStep['visual'] }) {
  if (type === 'hub') return <MockFrame title="Workspace Hub"><div className="grid gap-3 sm:grid-cols-3"><MockCard title="Portfolios" value="3" /><MockCard title="Projects" value="25" /><MockCard title="Need Attention" value="2" /></div><div className="mt-3 rounded-xl bg-[#eef3f4] p-4 text-xs text-[#536170]">Product Centre · Help · Feedback · Recent projects</div></MockFrame>
  if (type === 'portfolio') return <MockFrame title="Choose a delivery environment"><div className="grid gap-3 sm:grid-cols-3">{['Luxury Projects','Affordable Projects','Infrastructure Projects'].map(x=><div key={x} className="rounded-xl border bg-white p-4 text-sm font-semibold">{x}<div className="mt-3 text-xs font-normal text-[#87929b]">Open portfolio → filter projects</div></div>)}</div></MockFrame>
  if (type === 'project') return <MockFrame title="Selected Project"><div className="grid gap-3 sm:grid-cols-[180px_1fr]"><div className="rounded-xl bg-[#173f5f] p-4 text-xs text-white/80">Dashboard<br/>Schedule<br/>Procurement<br/>Approvals<br/>Quality & HSE<br/>Reports</div><div className="rounded-xl border bg-white p-5"><div className="text-sm font-semibold">Project Control Centre</div><div className="mt-3 h-2 rounded bg-[#eaf1f4]"/><div className="mt-2 h-2 w-3/4 rounded bg-[#eaf1f4]"/></div></div></MockFrame>
  if (type === 'controls') return <MockFrame title="Delivery controls"><div className="grid gap-3 sm:grid-cols-2">{['Update schedule progress','Track approvals and procurement','Record risks and quality','Submit site and HSE records'].map(x=><div key={x} className="flex items-center gap-2 rounded-xl border bg-white p-4 text-sm"><ClipboardCheck size={16} className="text-[#1f668f]"/>{x}</div>)}</div></MockFrame>
  if (type === 'reports') return <MockFrame title="Executive intelligence"><div className="grid gap-3 sm:grid-cols-3"><MockCard title="Portfolio Health" value="82" /><MockCard title="Overall Progress" value="64%" /><MockCard title="Critical Projects" value="2" /></div><div className="mt-3 flex gap-2"><span className="rounded-lg bg-[#173f5f] px-3 py-2 text-xs text-white">Generate Report</span><span className="rounded-lg bg-[#eef3f4] px-3 py-2 text-xs">Boardroom Mode</span></div></MockFrame>
  if (type === 'support') return <MockFrame title="Global services"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-white p-4"><HelpCircle size={18}/><div className="mt-2 text-sm font-semibold">Help</div></div><div className="rounded-xl border bg-white p-4"><MessageSquarePlus size={18}/><div className="mt-2 text-sm font-semibold">Feedback</div></div><div className="rounded-xl border bg-white p-4"><Search size={18}/><div className="mt-2 text-sm font-semibold">Ctrl + K Search</div></div></div></MockFrame>
  return <MockFrame title="Ready"><div className="grid min-h-36 place-items-center text-center"><div><ShieldCheck className="mx-auto text-emerald-600" size={36}/><div className="mt-3 text-lg font-semibold text-[#102943]">Your tour is complete</div><div className="mt-1 text-sm text-[#6f7d89]">Start from the Workspace Hub and select only the project you need.</div></div></div></MockFrame>
}

function MockFrame({ title, children }: { title: string; children: any }) {
  return <div className="mt-6 rounded-2xl border border-[#dfe6e9] bg-[#f7f9fa] p-4"><div className="mb-3 flex items-center justify-between"><div className="text-xs font-semibold text-[#536170]">{title}</div><div className="flex gap-1"><span className="h-2 w-2 rounded-full bg-[#d4dde1]"/><span className="h-2 w-2 rounded-full bg-[#d4dde1]"/><span className="h-2 w-2 rounded-full bg-[#d4dde1]"/></div></div>{children}</div>
}
function MockCard({ title, value }: { title: string; value: string }) { return <div className="rounded-xl border bg-white p-4"><div className="text-2xl font-semibold text-[#102943]">{value}</div><div className="mt-1 text-xs text-[#87929b]">{title}</div></div> }
