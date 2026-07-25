import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  Gauge,
  HardHat,
  Layers3,
  LockKeyhole,
  Menu,
  Network,
  Quote,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'

const PLATFORM_FEATURES = [
  {
    icon: Layers3,
    title: 'Portfolio command centre',
    copy: 'Bring every project, milestone, risk and decision into one executive control layer.',
  },
  {
    icon: Clock3,
    title: 'Schedule intelligence',
    copy: 'Track progress, variance, critical activities and recovery actions before delays compound.',
  },
  {
    icon: ShieldCheck,
    title: 'Risk and issue control',
    copy: 'Convert scattered project concerns into structured risks with owners, exposure and escalation.',
  },
  {
    icon: ClipboardCheck,
    title: 'Quality and handover',
    copy: 'Control inspections, snags, close-out evidence and handover readiness in one workflow.',
  },
  {
    icon: FileCheck2,
    title: 'Approvals, RFIs and documents',
    copy: 'Keep drawings, submissions, decisions and technical queries traceable from request to closure.',
  },
  {
    icon: BarChart3,
    title: 'Executive reporting',
    copy: 'Turn live project data into decision-ready portfolio, project and management reports.',
  },
]

const INDUSTRIES = [
  ['Real estate development', 'Residential estates, mixed-use communities and multi-project portfolios.'],
  ['Infrastructure', 'Roads, utilities, public realm and enabling works across complex programmes.'],
  ['Hospitality', 'Hotels, resorts, wellness facilities and guest-sensitive delivery environments.'],
  ['Commercial and institutional', 'Offices, schools, healthcare and other operationally critical assets.'],
]

const FAQS = [
  {
    q: 'Can anyone create an account?',
    a: 'No. PMOCorex is provisioned for subscribed organisations. Workspace access is created by an authorised administrator and users join through controlled invitations.',
  },
  {
    q: 'Can PMOCorex support multiple projects?',
    a: 'Yes. It is designed for portfolio-level oversight while preserving project-level schedules, risks, approvals, documents, quality records and delivery controls.',
  },
  {
    q: 'Is the platform only for PMO teams?',
    a: 'No. PMOCorex supports executives, project owners, consultants, contractors, design, costing, infrastructure, MEP, HSE and other delivery stakeholders through role-based access.',
  },
  {
    q: 'How do we start?',
    a: 'Book a product demonstration. We will understand your delivery structure, configure the right workspace and propose an onboarding plan for your organisation.',
  },
]

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const signIn = () => navigate('/mixta-admin-login')
  const contactSales = () => {
    window.location.href =
      'mailto:hello@pmocorex.com?subject=PMOCorex%20Product%20Enquiry&body=Hello%20PMOCorex%20team%2C%0A%0AI%20would%20like%20to%20learn%20more%20about%20the%20platform.'
  }
  const bookDemo = () => {
    window.location.href =
      'mailto:hello@pmocorex.com?subject=Book%20a%20PMOCorex%20Demo&body=Hello%20PMOCorex%20team%2C%0A%0AI%20would%20like%20to%20book%20a%20product%20demonstration.%0A%0AOrganisation%3A%0ARole%3A%0APreferred%20date%2Ftime%3A'
  }

  const navItems = [
    ['Platform', 'platform'],
    ['Solutions', 'solutions'],
    ['Security', 'security'],
    ['Pricing', 'pricing'],
  ]

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#071018] text-white selection:bg-[#d6b25e]/30">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_4%,rgba(60,125,171,0.12),transparent_27%),radial-gradient(circle_at_88%_2%,rgba(214,178,94,0.13),transparent_25%)]" />

      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#071018]/85 backdrop-blur-xl">
          <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
            <button type="button" onClick={() => scrollToSection('top')} aria-label="PMOCorex home">
              <PMOCorexLogo size={39} />
            </button>

            <nav className="hidden items-center gap-8 lg:flex">
              {navItems.map(([label, id]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  className="text-sm font-medium text-slate-300 transition hover:text-white"
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              <button
                type="button"
                onClick={signIn}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={bookDemo}
                className="inline-flex items-center gap-2 rounded-lg bg-[#d6b25e] px-4 py-2.5 text-sm font-bold text-[#101317] transition hover:bg-[#e4c574]"
              >
                Book a demo
                <ArrowRight size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(value => !value)}
              className="rounded-lg border border-white/10 p-2 text-slate-200 lg:hidden"
              aria-label="Toggle navigation"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {menuOpen && (
            <div className="border-t border-white/[0.07] bg-[#08121b] px-5 py-5 lg:hidden">
              <div className="grid gap-2">
                {navItems.map(([label, id]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      scrollToSection(id)
                    }}
                    className="rounded-lg px-3 py-3 text-left text-sm font-medium text-slate-200 hover:bg-white/[0.05]"
                  >
                    {label}
                  </button>
                ))}
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button type="button" onClick={signIn} className="rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold">
                    Sign in
                  </button>
                  <button type="button" onClick={bookDemo} className="rounded-lg bg-[#d6b25e] px-4 py-3 text-sm font-bold text-[#101317]">
                    Book a demo
                  </button>
                </div>
              </div>
            </div>
          )}
        </header>

        <main id="top">
          <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-20 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-32 lg:pt-28">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d6b25e]/25 bg-[#d6b25e]/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#e0c379]">
                <Sparkles size={13} />
                Construction delivery intelligence
              </div>

              <h1 className="max-w-3xl text-5xl font-black leading-[1.04] tracking-[-0.045em] text-white sm:text-6xl lg:text-[4.5rem]">
                Control every project.
                <span className="block bg-gradient-to-r from-[#e4c574] to-[#b98d35] bg-clip-text text-transparent">
                  Deliver with certainty.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                PMOCorex is an intelligent project delivery platform for construction and real estate organisations. It connects schedules, risks, approvals, procurement, quality, HSE, documents and executive reporting in one controlled workspace.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={bookDemo}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d6b25e] px-6 py-3.5 text-sm font-extrabold text-[#11161a] shadow-[0_16px_45px_rgba(214,178,94,0.20)] transition hover:-translate-y-0.5 hover:bg-[#e4c574]"
                >
                  Book a product demo
                  <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  onClick={signIn}
                  className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/[0.07]"
                >
                  Sign in to your workspace
                </button>
              </div>

              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-400">
                {['No public sign-up', 'Role-based access', 'Portfolio-ready'].map(item => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check size={15} className="text-[#d6b25e]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <ProductHero />
          </section>

          <section className="border-y border-white/[0.07] bg-white/[0.018]">
            <div className="mx-auto grid max-w-7xl gap-8 px-5 py-9 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
              {[
                ['One source of truth', 'Replace fragmented project information with a controlled delivery record.'],
                ['Early warning', 'See schedule, approval, risk and quality threats before they become surprises.'],
                ['Executive clarity', 'Give leadership a portfolio view built for decisions, not data chasing.'],
                ['Controlled access', 'Give every stakeholder the right level of visibility and responsibility.'],
              ].map(([title, copy]) => (
                <div key={title} className="border-l border-[#d6b25e]/35 pl-5">
                  <div className="font-bold text-white">{title}</div>
                  <div className="mt-1.5 text-sm leading-6 text-slate-400">{copy}</div>
                </div>
              ))}
            </div>
          </section>

          <section id="platform" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-24 sm:px-6 lg:px-8 lg:py-32">
            <SectionHeading
              eyebrow="The platform"
              title="One operating layer for project delivery"
              copy="PMOCorex brings the controls that usually live across spreadsheets, emails, messaging apps and disconnected systems into one structured platform."
            />

            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_FEATURES.map(feature => {
                const Icon = feature.icon
                return (
                  <article
                    key={feature.title}
                    className="group rounded-2xl border border-white/[0.08] bg-[#0b1620]/80 p-6 transition hover:-translate-y-1 hover:border-[#d6b25e]/30 hover:bg-[#0d1a25]"
                  >
                    <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#d6b25e]/20 bg-[#d6b25e]/10 text-[#dfbf70]">
                      <Icon size={20} />
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{feature.copy}</p>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="border-y border-white/[0.07] bg-[#09131d]">
            <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-32">
              <IntelligenceVisual />
              <div>
                <div className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#d6b25e]">Delivery intelligence</div>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">Move from reporting delays to preventing them.</h2>
                <p className="mt-6 text-lg leading-8 text-slate-300">
                  PMOCorex turns live project activity into practical intelligence. It identifies critical delays, highlights exposure and helps teams focus recovery efforts where they matter most.
                </p>
                <div className="mt-8 grid gap-5">
                  {[
                    ['Recovery forecasting', 'Understand whether the current plan can still meet the delivery target.'],
                    ['Critical activity focus', 'Direct attention to delayed work with the greatest programme impact.'],
                    ['Management summaries', 'Translate project data into clear executive actions and decisions.'],
                  ].map(([title, copy]) => (
                    <div key={title} className="flex gap-4">
                      <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#d6b25e]/12 text-[#d6b25e]">
                        <Check size={15} />
                      </div>
                      <div>
                        <div className="font-bold text-white">{title}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-400">{copy}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="solutions" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-24 sm:px-6 lg:px-8 lg:py-32">
            <SectionHeading
              eyebrow="Built for complex delivery"
              title="A platform for organisations that cannot afford blind spots"
              copy="Configure PMOCorex around the way your portfolio, projects and delivery teams actually operate."
            />
            <div className="mt-14 grid gap-5 md:grid-cols-2">
              {INDUSTRIES.map(([title, copy], index) => (
                <article key={title} className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b1620] p-7">
                  <div className="absolute right-5 top-3 text-7xl font-black text-white/[0.025]">0{index + 1}</div>
                  <Building2 size={22} className="text-[#d6b25e]" />
                  <h3 className="mt-8 text-xl font-bold">{title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">{copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="security" className="scroll-mt-24 border-y border-white/[0.07] bg-white/[0.018]">
            <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-28">
              <div>
                <div className="grid h-12 w-12 place-items-center rounded-xl border border-[#d6b25e]/25 bg-[#d6b25e]/10 text-[#d6b25e]">
                  <LockKeyhole size={22} />
                </div>
                <h2 className="mt-6 text-4xl font-black tracking-[-0.035em]">Access by invitation. Control by design.</h2>
                <p className="mt-5 text-lg leading-8 text-slate-300">
                  PMOCorex is not an open consumer platform. Workspaces are provisioned for subscribed organisations, and access is managed through controlled roles and invitations.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  [ShieldCheck, 'Role-based permissions', 'Control what administrators, project owners, consultants, contractors and viewers can see or change.'],
                  [Network, 'Scoped access', 'Assign access at workspace, portfolio or project level based on responsibility.'],
                  [FileText, 'Traceable records', 'Preserve structured records for approvals, RFIs, risks, quality and project decisions.'],
                  [LockKeyhole, 'Protected application', 'Public visitors can understand the product, but operational content remains behind authentication.'],
                ].map(([Icon, title, copy]) => {
                  const SecurityIcon = Icon as typeof ShieldCheck
                  return (
                    <div key={title as string} className="rounded-xl border border-white/[0.08] bg-[#0a151e] p-5">
                      <SecurityIcon size={20} className="text-[#d6b25e]" />
                      <div className="mt-4 font-bold text-white">{title as string}</div>
                      <div className="mt-1.5 text-sm leading-6 text-slate-400">{copy as string}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section id="pricing" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-24 sm:px-6 lg:px-8 lg:py-32">
            <SectionHeading
              eyebrow="Plans and onboarding"
              title="Configured for your portfolio, not sold as a generic login"
              copy="PMOCorex subscriptions are tailored to organisation size, project portfolio, implementation needs and user access."
            />

            <div className="mx-auto mt-14 max-w-4xl rounded-3xl border border-[#d6b25e]/25 bg-[linear-gradient(135deg,rgba(214,178,94,0.11),rgba(13,27,38,0.92)_46%)] p-7 sm:p-10">
              <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="text-sm font-bold uppercase tracking-[0.2em] text-[#d6b25e]">Organisation subscription</div>
                  <h3 className="mt-3 text-3xl font-black">Professional and enterprise workspaces</h3>
                  <p className="mt-4 max-w-2xl leading-7 text-slate-300">
                    Start with a guided demonstration and solution review. We will recommend the right workspace structure, access model, onboarding support and commercial plan.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {['Workspace and portfolio setup', 'Controlled user invitations', 'Implementation support', 'Role and access configuration'].map(item => (
                      <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                        <Check size={15} className="text-[#d6b25e]" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex min-w-[210px] flex-col gap-3">
                  <button type="button" onClick={bookDemo} className="rounded-xl bg-[#d6b25e] px-6 py-3.5 text-sm font-extrabold text-[#11161a] hover:bg-[#e4c574]">
                    Book a demo
                  </button>
                  <button type="button" onClick={contactSales} className="rounded-xl border border-white/12 px-6 py-3.5 text-sm font-bold hover:bg-white/[0.05]">
                    Contact sales
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="border-y border-white/[0.07] bg-[#09131d]">
            <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[auto_1fr] lg:px-8">
              <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[#d6b25e]/20 bg-[#d6b25e]/10 text-[#d6b25e]">
                <Quote size={28} />
              </div>
              <div>
                <blockquote className="max-w-4xl text-2xl font-semibold leading-10 tracking-[-0.02em] text-white sm:text-3xl">
                  “PMOCorex is being built from inside real project delivery environments, where small gaps in information can become expensive delays, quality failures or management surprises.”
                </blockquote>
                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Product philosophy</p>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-4xl px-5 py-24 sm:px-6 lg:py-28">
            <SectionHeading eyebrow="Frequently asked questions" title="What prospective organisations ask" centered />
            <div className="mt-12 divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {FAQS.map((item, index) => (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="flex w-full items-center justify-between gap-5 py-6 text-left"
                  >
                    <span className="text-base font-bold text-white sm:text-lg">{item.q}</span>
                    <ChevronDown size={19} className={`shrink-0 text-slate-400 transition ${openFaq === index ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === index && <p className="max-w-3xl pb-6 text-sm leading-7 text-slate-400 sm:text-base">{item.a}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="px-5 pb-24 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-[#d6b25e]/25 bg-[radial-gradient(circle_at_85%_20%,rgba(214,178,94,0.20),transparent_30%),linear-gradient(135deg,#102231,#0a151e)] px-7 py-12 sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-16 lg:py-16">
              <div>
                <div className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#d6b25e]">See the platform</div>
                <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.035em] sm:text-5xl">Bring portfolio-level control to every project.</h2>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">Book a private product demonstration and explore how PMOCorex can support your delivery organisation.</p>
              </div>
              <div className="mt-8 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-col">
                <button type="button" onClick={bookDemo} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d6b25e] px-6 py-3.5 text-sm font-extrabold text-[#11161a] hover:bg-[#e4c574]">
                  Book a demo <ArrowRight size={16} />
                </button>
                <button type="button" onClick={signIn} className="rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-bold hover:bg-white/[0.08]">
                  Existing customer sign in
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/[0.07] bg-[#050b11]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
            <div>
              <PMOCorexLogo size={38} />
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">
                Intelligent project delivery control for construction and real estate organisations.
              </p>
            </div>
            <div>
              <div className="text-sm font-bold text-white">Platform</div>
              <div className="mt-4 grid gap-3 text-sm text-slate-500">
                <button type="button" onClick={() => scrollToSection('platform')} className="text-left hover:text-white">Capabilities</button>
                <button type="button" onClick={() => scrollToSection('security')} className="text-left hover:text-white">Security</button>
                <button type="button" onClick={() => scrollToSection('pricing')} className="text-left hover:text-white">Pricing</button>
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-white">Get in touch</div>
              <div className="mt-4 grid gap-3 text-sm text-slate-500">
                <button type="button" onClick={bookDemo} className="text-left hover:text-white">Book a demo</button>
                <button type="button" onClick={contactSales} className="text-left hover:text-white">Contact sales</button>
                <button type="button" onClick={signIn} className="text-left hover:text-white">Sign in</button>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.07]">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <span>© {new Date().getFullYear()} PMOCorex. All rights reserved.</span>
              <span>Project delivery, controlled.</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  copy,
  centered = false,
}: {
  eyebrow: string
  title: string
  copy?: string
  centered?: boolean
}) {
  return (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <div className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#d6b25e]">{eyebrow}</div>
      <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] text-white sm:text-5xl">{title}</h2>
      {copy && <p className="mt-5 text-lg leading-8 text-slate-400">{copy}</p>}
    </div>
  )
}

function ProductHero() {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="absolute -inset-8 rounded-full bg-[#d6b25e]/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.10] bg-[#0b151e] shadow-[0_35px_100px_rgba(0,0,0,0.52)]">
        <div className="flex h-11 items-center border-b border-white/[0.07] bg-[#081119] px-4">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef6a65]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#e8b34a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#54ba78]" />
          </div>
          <div className="mx-auto rounded-md border border-white/[0.06] bg-white/[0.025] px-20 py-1 text-[9px] text-slate-600">app.pmocorex.com</div>
        </div>

        <div className="grid min-h-[460px] grid-cols-[62px_1fr] sm:grid-cols-[82px_1fr]">
          <div className="border-r border-white/[0.07] bg-[#081119] px-2 py-4">
            <div className="mx-auto mb-8 grid h-8 w-8 place-items-center rounded-lg bg-[#d6b25e] text-[10px] font-black text-[#11161a]">PX</div>
            <div className="grid gap-3">
              {[Gauge, Layers3, Clock3, ShieldCheck, FileText, HardHat].map((Icon, index) => (
                <div key={index} className={`mx-auto grid h-8 w-8 place-items-center rounded-lg ${index === 0 ? 'bg-[#d6b25e]/15 text-[#d6b25e]' : 'text-slate-600'}`}>
                  <Icon size={15} />
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d6b25e]">Command centre</div>
                <div className="mt-1 text-lg font-extrabold">Portfolio delivery overview</div>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold text-emerald-300">LIVE</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                ['68%', 'Portfolio progress'],
                ['12', 'Active projects'],
                ['7', 'Critical risks'],
                ['19', 'Pending approvals'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/[0.06] bg-[#101d28] p-3">
                  <div className="text-xl font-black text-white">{value}</div>
                  <div className="mt-1 text-[9px] leading-4 text-slate-500">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-xl border border-white/[0.06] bg-[#101d28] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-slate-300">Portfolio performance</div>
                  <div className="text-[9px] text-slate-600">Last 8 weeks</div>
                </div>
                <div className="mt-5 flex h-28 items-end gap-2">
                  {[42, 51, 47, 62, 58, 71, 67, 78, 72, 85, 79, 91].map((height, index) => (
                    <div key={index} className="flex-1 rounded-t-sm bg-gradient-to-t from-[#8d6b2b] to-[#d6b25e]" style={{ height: `${height}%`, opacity: 0.48 + index * 0.035 }} />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-[#101d28] p-4">
                <div className="text-[11px] font-bold text-slate-300">Delivery confidence</div>
                <div className="mt-5 grid place-items-center">
                  <div className="relative grid h-24 w-24 place-items-center rounded-full bg-[conic-gradient(#d6b25e_0_74%,rgba(255,255,255,0.06)_74%_100%)]">
                    <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-[#101d28]">
                      <div className="text-center">
                        <div className="text-xl font-black">74%</div>
                        <div className="text-[8px] text-slate-500">RECOVERABLE</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/[0.06] bg-[#101d28] p-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-bold text-slate-300">Management focus</div>
                <Zap size={13} className="text-[#d6b25e]" />
              </div>
              <div className="mt-3 grid gap-2">
                {[
                  ['Procurement lead time threatens finishes sequence', 'Critical'],
                  ['Five technical approvals exceed target response time', 'Watch'],
                  ['Quality close-out improved across two projects', 'Positive'],
                ].map(([label, state], index) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.025] px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${index === 0 ? 'bg-red-400' : index === 1 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <span className="truncate text-[9px] text-slate-400">{label}</span>
                    </div>
                    <span className="text-[8px] text-slate-600">{state}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-7 -left-4 hidden w-56 rounded-xl border border-white/[0.10] bg-[#0d1a24]/95 p-4 shadow-2xl backdrop-blur sm:block">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
          <Sparkles size={12} className="text-[#d6b25e]" /> AI recovery insight
        </div>
        <div className="mt-2 text-xs font-semibold leading-5 text-slate-200">Resequence external works to protect the handover date.</div>
      </div>
    </div>
  )
}

function IntelligenceVisual() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0b1721] p-5 shadow-2xl sm:p-7">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Recovery engine</div>
          <div className="mt-1 text-lg font-bold">Project delivery forecast</div>
        </div>
        <div className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">ON WATCH</div>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          ['31 days', 'Forecast delay'],
          ['6', 'Critical activities'],
          ['74%', 'Recovery probability'],
        ].map(([value, label]) => (
          <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="mt-1 text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
        <div className="flex justify-between text-xs text-slate-400"><span>Recovery probability</span><span className="font-bold text-[#d6b25e]">74%</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full w-[74%] rounded-full bg-gradient-to-r from-[#8d6b2b] to-[#d6b25e]" /></div>
      </div>
      <div className="mt-4 grid gap-2">
        {[
          ['Accelerate long-lead procurement package', 'High impact'],
          ['Resolve structural drawing approval dependency', '7 days'],
          ['Increase finishing resources in Zone B', 'Recommended'],
        ].map(([action, tag], index) => (
          <div key={action} className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.05] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#d6b25e]/10 text-[10px] font-black text-[#d6b25e]">{index + 1}</span><span className="truncate text-sm text-slate-300">{action}</span></div>
            <span className="shrink-0 text-[10px] font-semibold text-slate-500">{tag}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
