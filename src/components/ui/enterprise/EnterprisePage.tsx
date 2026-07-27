import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function EnterprisePageHero({ eyebrow, title, description, projectName, actions, children }: { eyebrow: string; title: string; description: string; projectName?: string | null; actions?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[#dfe3e7] bg-white shadow-[0_12px_35px_rgba(18,58,96,0.06)]">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-[#ff7657]" />
      <div className="flex flex-col gap-6 p-6 pl-8 sm:p-8 sm:pl-10 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-4xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#df5f41]">{eyebrow}</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#102943] sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#65717c]">{description}</p>
          {projectName && <div className="mt-5 inline-flex rounded-full border border-[#dbe4ea] bg-[#f5f8fa] px-3 py-1.5 text-xs font-medium text-[#536170]">Project: <span className="ml-1 font-semibold text-[#123a60]">{projectName}</span></div>}
          {children}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </section>
  )
}

export function EnterpriseMetric({ label, value, helper, icon: Icon, tone = 'navy' }: { label: string; value: ReactNode; helper?: string; icon?: LucideIcon; tone?: 'navy'|'coral'|'green'|'amber'|'red' }) {
  const tones = {
    navy: 'text-[#123a60] bg-[#eaf1f7]', coral: 'text-[#df5f41] bg-[#fff1ec]', green: 'text-emerald-700 bg-emerald-50', amber: 'text-amber-700 bg-amber-50', red: 'text-red-700 bg-red-50'
  }
  return <article className="rounded-2xl border border-[#dfe3e7] bg-white p-5 shadow-[0_8px_24px_rgba(18,58,96,0.04)]"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#788591]">{label}</div><div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#102943]">{value}</div>{helper && <div className="mt-1 text-xs text-[#87929b]">{helper}</div>}</div>{Icon && <div className={`rounded-xl p-2 ${tones[tone]}`}><Icon size={17}/></div>}</div></article>
}

export function EnterpriseNotice({ children, tone='info' }: { children: ReactNode; tone?: 'info'|'warning'|'error'|'success' }) {
  const map = { info:'border-[#cfdbe3] bg-[#f4f8fb] text-[#31526d]', warning:'border-amber-200 bg-amber-50 text-amber-900', error:'border-red-200 bg-red-50 text-red-800', success:'border-emerald-200 bg-emerald-50 text-emerald-800' }
  return <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${map[tone]}`}>{children}</div>
}

export function EnterpriseSection({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="rounded-2xl border border-[#dfe3e7] bg-white p-5 shadow-[0_8px_24px_rgba(18,58,96,0.035)] sm:p-6"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-[#102943]">{title}</h2>{description && <p className="mt-1 text-sm text-[#74818d]">{description}</p>}</div>{action}</div>{children}</section>
}
