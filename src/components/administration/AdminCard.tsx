import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  description: string
  to: string
  icon: LucideIcon
  status?: 'ready' | 'coming-soon'
}

export default function AdminCard({
  title,
  description,
  to,
  icon: Icon,
  status = 'ready',
}: Props) {
  const disabled = status === 'coming-soon'

  const card = (
    <div className={`h-full rounded-2xl border p-5 transition-all ${
      disabled
        ? 'border-white/[0.06] bg-white/[0.02] opacity-60'
        : 'border-white/[0.08] bg-white/[0.03] hover:-translate-y-0.5 hover:border-blue-500/30'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
          <Icon size={20} />
        </div>
        {disabled && (
          <span className="rounded-full border border-white/[0.08] px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-slate-500">
            Coming soon
          </span>
        )}
      </div>
      <h2 className="mt-5 text-base font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  )

  return disabled ? card : <Link to={to} className="block h-full">{card}</Link>
}
