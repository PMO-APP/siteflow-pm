import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  FileCheck2,
  HardHat,
  Layers3,
  Menu,
  Network,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const capabilities = [
  {
    number: '01',
    title: 'Portfolio command',
    copy: 'See project health, delivery pressure and leadership priorities across your entire portfolio.',
    icon: Layers3,
  },
  {
    number: '02',
    title: 'Schedule intelligence',
    copy: 'Turn programmes into clear milestones, critical activities, delay signals and recovery actions.',
    icon: Clock3,
  },
  {
    number: '03',
    title: 'Controls in one place',
    copy: 'Connect approvals, procurement, RFIs, quality, HSE, documents and handover readiness.',
    icon: Network,
  },
  {
    number: '04',
    title: 'Decision-ready reporting',
    copy: 'Give executives a reliable view of what changed, what is at risk and what needs action.',
    icon: BarChart3,
  },
]

const operatingAreas = [
  'Portfolio dashboard',
  'Command centre',
  'Schedule & recovery',
  'Risk and issues',
  'Approvals & RFIs',
  'Procurement control',
  'Quality & snagging',
  'HSE management',
  'Document control',
  'Executive reporting',
]

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/brand/pmocorex-mark.svg" alt="PMOCorex" className="h-10 w-10 object-contain" />
      {!compact && (
        <div className="leading-none">
          <div className="text-[17px] font-extrabold tracking-[-0.04em] text-[#102a3c]">PMOCorex</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.19em] text-[#6d7f8b]">Portfolio Control Centre</div>
        </div>
      )}
    </div>
  )
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[760px]">
      <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full border border-[#ef8354]/30" />
      <div className="absolute -bottom-8 -right-8 h-36 w-36 bg-[linear-gradient(90deg,rgba(23,63,95,.12)_1px,transparent_1px),linear-gradient(rgba(23,63,95,.12)_1px,transparent_1px)] bg-[size:16px_16px]" />
      <div className="relative overflow-hidden rounded-[22px] border border-[#cbd7de] bg-white shadow-[0_28px_80px_rgba(20,49,68,0.16)]">
        <div className="flex h-12 items-center justify-between border-b border-[#e2e9ed] bg-[#f8fafb] px-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef8354]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f2c14e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#4f9d69]" />
          </div>
          <div className="rounded-full border border-[#d8e2e7] bg-white px-3 py-1 text-[10px] font-semibold text-[#6d7f8b]">Portfolio command centre</div>
        </div>

        <div className="grid min-h-[430px] grid-cols-[72px_minmax(0,1fr)] bg-[#f4f7f8] sm:grid-cols-[150px_minmax(0,1fr)]">
          <aside className="border-r border-[#dce5e9] bg-[#173f5f] p-3 sm:p-4">
            <div className="mb-7 flex items-center gap-2 text-white">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/10"><CircleDot size={14} /></div>
              <span className="hidden text-[11px] font-semibold sm:block">PMOCorex</span>
            </div>
            {['Overview', 'Schedule', 'Risks', 'Approvals', 'Quality', 'Reports'].map((item, index) => (
              <div key={item} className={`mb-2 rounded-lg px-2 py-2 text-[10px] ${index === 0 ? 'bg-white text-[#173f5f]' : 'text-white/55'}`}>
                <span className="hidden sm:inline">{item}</span>
                <span className="sm:hidden">•</span>
              </div>
            ))}
          </aside>

          <div className="min-w-0 p-4 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#7c8d97]">Executive view</div>
                <div className="mt-1 text-lg font-bold tracking-[-.03em] text-[#173f5f] sm:text-xl">Portfolio delivery position</div>
              </div>
              <span className="rounded-full bg-[#eaf4ed] px-3 py-1 text-[10px] font-bold text-[#347a4a]">Live</span>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['18', 'Active projects'],
                ['71%', 'Portfolio progress'],
                ['6', 'Need attention'],
                ['84%', 'Delivery confidence'],
              ].map(([value, label], index) => (
                <div key={label} className={`rounded-xl border p-3 ${index === 2 ? 'border-[#ef8354]/35 bg-[#fff7f3]' : 'border-[#dce5e9] bg-white'}`}>
                  <div className="text-xl font-extrabold tracking-[-.04em] text-[#173f5f]">{value}</div>
                  <div className="mt-1 text-[9px] leading-tight text-[#758690]">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1.35fr_.65fr]">
              <div className="rounded-xl border border-[#dce5e9] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-[#173f5f]">Programme movement</div>
                  <div className="text-[9px] text-[#7c8d97]">Last 8 weeks</div>
                </div>
                <div className="mt-5 flex h-32 items-end gap-2">
                  {[35, 44, 40, 58, 54, 67, 73, 78].map((height, index) => (
                    <div key={index} className="flex-1 rounded-t-sm bg-[#dbe7ec]" style={{ height: `${height}%` }}>
                      <div className={`h-full w-full rounded-t-sm ${index > 5 ? 'bg-[#2f6f91]' : ''}`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#dce5e9] bg-[#173f5f] p-4 text-white">
                <Sparkles size={16} className="text-[#ffb08f]" />
                <div className="mt-4 text-[10px] font-bold uppercase tracking-[.14em] text-white/55">Recovery signal</div>
                <div className="mt-1 text-2xl font-extrabold">3 actions</div>
                <p className="mt-2 text-[10px] leading-relaxed text-white/65">Accelerate façade approvals and protect the finishing sequence.</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                ['Schedule', '4 projects slipping'],
                ['Approvals', '11 due this week'],
                ['Quality', '87% close-out'],
              ].map(([label, detail]) => (
                <div key={label} className="rounded-xl border border-[#dce5e9] bg-white p-3">
                  <div className="text-[10px] font-bold text-[#173f5f]">{label}</div>
                  <div className="mt-1 truncate text-[9px] text-[#7c8d97]">{detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const requestDemo = () => {
    window.location.href = 'mailto:hello@pmocorex.com?subject=PMOCorex%20Demo%20Request'
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f8f6] font-sans text-[#183044]">
      <header className="sticky top-0 z-50 border-b border-[#dfe7e6]/90 bg-[#f7f8f6]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1380px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Brand />

          <nav className="hidden items-center gap-8 lg:flex">
            <a href="#platform" className="text-sm font-semibold text-[#536974] transition hover:text-[#173f5f]">Platform</a>
            <a href="#why" className="text-sm font-semibold text-[#536974] transition hover:text-[#173f5f]">Why PMOCorex</a>
            <a href="#security" className="text-sm font-semibold text-[#536974] transition hover:text-[#173f5f]">Security</a>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button onClick={() => navigate('/login')} className="rounded-lg px-4 py-2.5 text-sm font-bold text-[#173f5f] transition hover:bg-[#e9eff1]">Sign in</button>
            <button onClick={requestDemo} className="inline-flex items-center gap-2 rounded-lg bg-[#ef8354] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(239,131,84,.22)] transition hover:-translate-y-0.5 hover:bg-[#e87545]">
              Book a demo <ArrowRight size={16} />
            </button>
          </div>

          <button className="grid h-10 w-10 place-items-center rounded-lg border border-[#d8e2e5] bg-white lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-[#dfe7e6] bg-white px-5 py-5 lg:hidden">
            <div className="grid gap-2">
              <a href="#platform" className="rounded-lg px-3 py-3 text-sm font-semibold text-[#536974]">Platform</a>
              <a href="#why" className="rounded-lg px-3 py-3 text-sm font-semibold text-[#536974]">Why PMOCorex</a>
              <a href="#security" className="rounded-lg px-3 py-3 text-sm font-semibold text-[#536974]">Security</a>
              <button onClick={() => navigate('/login')} className="mt-2 rounded-lg border border-[#cfdcdf] px-4 py-3 text-sm font-bold text-[#173f5f]">Sign in</button>
              <button onClick={requestDemo} className="rounded-lg bg-[#ef8354] px-4 py-3 text-sm font-bold text-white">Book a demo</button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative border-b border-[#dfe7e6]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(23,63,95,.045)_1px,transparent_1px),linear-gradient(rgba(23,63,95,.045)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
          <div className="relative mx-auto grid max-w-[1380px] items-center gap-16 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[.86fr_1.14fr] lg:px-12 lg:py-28">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#bfd0d7] bg-white px-3 py-1.5 text-xs font-bold text-[#45606e] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#ef8354]" />
                Built for complex project delivery
              </div>

              <h1 className="max-w-[720px] text-[44px] font-extrabold leading-[1.03] tracking-[-0.055em] text-[#173f5f] sm:text-[58px] lg:text-[68px]">
                See the whole project.
                <span className="block text-[#ef8354]">Act before it slips.</span>
              </h1>

              <p className="mt-7 max-w-[610px] text-lg leading-8 text-[#536974]">
                PMOCorex gives real estate and construction leaders one reliable place to control schedules, risks, approvals, procurement, quality and executive reporting.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button onClick={requestDemo} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#173f5f] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(23,63,95,.22)] transition hover:-translate-y-0.5 hover:bg-[#0f334e]">
                  Book a product walkthrough <ArrowRight size={17} />
                </button>
                <button onClick={() => navigate('/login')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#c9d6da] bg-white px-6 py-3.5 text-sm font-bold text-[#173f5f] transition hover:border-[#9fb4bd]">
                  Sign in to your workspace
                </button>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-[#d9e2e4] pt-6 text-xs font-semibold text-[#607580]">
                <span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#4f9d69]" /> No public sign-up</span>
                <span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#4f9d69]" /> Role-based access</span>
                <span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#4f9d69]" /> Built for portfolio teams</span>
              </div>
            </div>

            <ProductPreview />
          </div>
        </section>

        <section className="border-b border-[#dfe7e6] bg-white">
          <div className="mx-auto grid max-w-[1380px] gap-8 px-5 py-9 sm:px-8 md:grid-cols-[280px_1fr] md:items-center lg:px-12">
            <p className="text-sm font-bold leading-6 text-[#173f5f]">One operating view for the teams responsible for delivery.</p>
            <div className="grid grid-cols-2 gap-3 text-center text-xs font-bold uppercase tracking-[.12em] text-[#71838d] sm:grid-cols-4">
              <span className="rounded-lg bg-[#f3f6f6] px-3 py-3">Real estate</span>
              <span className="rounded-lg bg-[#f3f6f6] px-3 py-3">Infrastructure</span>
              <span className="rounded-lg bg-[#f3f6f6] px-3 py-3">Hospitality</span>
              <span className="rounded-lg bg-[#f3f6f6] px-3 py-3">Mixed-use</span>
            </div>
          </div>
        </section>

        <section id="why" className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr]">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[.18em] text-[#ef8354]">Why PMOCorex</div>
              <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-.045em] text-[#173f5f]">Project information is everywhere. Control should not be.</h2>
              <p className="mt-5 text-base leading-7 text-[#5e737e]">PMOCorex replaces fragmented updates and reactive reporting with a connected delivery control layer.</p>
            </div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-[#d7e1e4] bg-[#d7e1e4] sm:grid-cols-2">
              {capabilities.map(item => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="group bg-white p-7 transition hover:bg-[#f9fbfb] sm:p-8">
                    <div className="flex items-center justify-between">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf1f4] text-[#2f6f91]"><Icon size={20} /></div>
                      <span className="text-xs font-extrabold text-[#b3c0c6]">{item.number}</span>
                    </div>
                    <h3 className="mt-7 text-xl font-extrabold tracking-[-.03em] text-[#173f5f]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[#607580]">{item.copy}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="platform" className="bg-[#173f5f] text-white">
          <div className="mx-auto grid max-w-[1380px] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:px-12 lg:py-28">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[.18em] text-[#ffad89]">The platform</div>
              <h2 className="mt-4 max-w-xl text-4xl font-extrabold leading-tight tracking-[-.045em]">From site activity to executive decisions, without losing the thread.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/65">Every control area contributes to one shared picture of delivery. Teams work in their own modules. Leadership sees the combined position.</p>
              <button onClick={requestDemo} className="mt-8 inline-flex items-center gap-2 border-b border-[#ffad89] pb-1 text-sm font-bold text-[#ffad89]">Explore PMOCorex with us <ChevronRight size={16} /></button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {operatingAreas.map((item, index) => (
                <div key={item} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[.045] px-5 py-4">
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-white/10 text-[10px] font-extrabold text-[#ffad89]">{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-sm font-semibold text-white/88">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="overflow-hidden rounded-[26px] border border-[#d7e1e4] bg-white">
            <div className="grid lg:grid-cols-2">
              <div className="p-8 sm:p-12 lg:p-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff0e9] text-[#e87545]"><Sparkles size={22} /></div>
                <h2 className="mt-8 text-4xl font-extrabold leading-tight tracking-[-.045em] text-[#173f5f]">Recovery intelligence that leads to action.</h2>
                <p className="mt-5 text-base leading-7 text-[#5e737e]">PMOCorex surfaces critical delayed activities, pressure points and practical recovery priorities so teams can respond before reporting becomes explanation.</p>
                <div className="mt-8 grid gap-3">
                  {['Identify schedule pressure early', 'Connect delays to owners and dependencies', 'Translate project data into executive summaries'].map(item => (
                    <div key={item} className="flex items-center gap-3 text-sm font-semibold text-[#405b69]"><CheckCircle2 size={17} className="text-[#4f9d69]" />{item}</div>
                  ))}
                </div>
              </div>
              <div className="relative min-h-[420px] overflow-hidden bg-[#eef3f4] p-8 sm:p-12">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,63,95,.07)_1px,transparent_1px),linear-gradient(rgba(23,63,95,.07)_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="relative space-y-4">
                  <div className="rounded-2xl border border-[#cfdde2] bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.15em] text-[#82939c]">Executive signal</div><div className="mt-2 text-xl font-extrabold text-[#173f5f]">Completion date under pressure</div></div><span className="rounded-full bg-[#fff0e9] px-3 py-1 text-[10px] font-bold text-[#d86335]">Action required</span></div>
                  </div>
                  {[
                    ['01', 'Close long-lead procurement decisions', 'Owner: Commercial'],
                    ['02', 'Protect façade approval sequence', 'Owner: Design'],
                    ['03', 'Rebalance finishing resources', 'Owner: Delivery'],
                  ].map(([number, title, owner]) => (
                    <div key={number} className="flex items-center gap-4 rounded-2xl border border-[#cfdde2] bg-white p-5 shadow-sm">
                      <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[#173f5f] text-xs font-extrabold text-white">{number}</div>
                      <div><div className="text-sm font-bold text-[#173f5f]">{title}</div><div className="mt-1 text-xs text-[#7b8c95]">{owner}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="border-y border-[#dfe7e6] bg-[#edf2f2]">
          <div className="mx-auto grid max-w-[1380px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:px-12 lg:py-24">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#2f6f91] shadow-sm"><ShieldCheck size={23} /></div>
              <h2 className="mt-7 text-4xl font-extrabold tracking-[-.045em] text-[#173f5f]">Public product story. Private project information.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#5e737e]">Visitors can understand PMOCorex without accessing your workspace. Accounts are created through approved onboarding and invitations, not public registration.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                [ShieldCheck, 'Controlled access', 'Only approved users can sign in.'],
                [Building2, 'Workspace isolation', 'Organisation and project access are scoped.'],
                [FileCheck2, 'Role permissions', 'Teams see and edit only what they should.'],
              ].map(([Icon, title, copy]) => {
                const SecurityIcon = Icon as typeof ShieldCheck
                return (
                  <div key={String(title)} className="rounded-2xl border border-[#d2dddf] bg-white p-6">
                    <SecurityIcon size={20} className="text-[#ef8354]" />
                    <h3 className="mt-5 text-base font-extrabold text-[#173f5f]">{String(title)}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#6a7d87]">{String(copy)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="relative overflow-hidden rounded-[26px] bg-[#ef8354] px-7 py-12 text-white sm:px-12 lg:flex lg:items-center lg:justify-between lg:px-16 lg:py-16">
            <div className="absolute right-0 top-0 h-full w-2/5 bg-[linear-gradient(90deg,rgba(255,255,255,.13)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.13)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(to_left,black,transparent)]" />
            <div className="relative max-w-2xl">
              <div className="text-xs font-extrabold uppercase tracking-[.18em] text-white/70">A clearer way to deliver</div>
              <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-.045em]">Give your next project review one source of truth.</h2>
              <p className="mt-4 text-base leading-7 text-white/80">See the platform, discuss your delivery model and explore how PMOCorex can fit your organisation.</p>
            </div>
            <button onClick={requestDemo} className="relative mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3.5 text-sm font-extrabold text-[#173f5f] shadow-lg transition hover:-translate-y-0.5 lg:mt-0">Book a demo <ArrowRight size={17} /></button>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#dfe7e6] bg-white">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-7 px-5 py-9 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <Brand />
          <div className="flex flex-wrap gap-x-7 gap-y-3 text-xs font-semibold text-[#6f818a]">
            <button onClick={requestDemo}>Contact</button>
            <button onClick={() => navigate('/login')}>Sign in</button>
            <span>Privacy</span>
            <span>© {new Date().getFullYear()} PMOCorex</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
