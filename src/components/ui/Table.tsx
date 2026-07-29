import type { ReactNode, TableHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <div className="ui-table-wrap"><table className={cn('ui-table', className)} {...props} /></div>
}

export function TablePrimaryCell({
  title,
  subtitle,
  icon,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="ui-table-primary">
      {icon && <div className="ui-table-primary__icon">{icon}</div>}
      <div className="ui-table-primary__copy">
        <div className="ui-table-primary__title">{title}</div>
        {subtitle && <div className="ui-table-primary__subtitle">{subtitle}</div>}
      </div>
    </div>
  )
}

export function TableProgress({ value, label }: { value: number; label?: string }) {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div className="ui-table-progress" aria-label={`${safeValue}% complete`}>
      <div className="ui-table-progress__meta">
        <span>{label || 'Progress'}</span>
        <strong>{Math.round(safeValue)}%</strong>
      </div>
      <div className="ui-table-progress__track">
        <span className="ui-table-progress__fill" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  )
}

export function TableOwner({ name, detail }: { name: string; detail?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '—'
  return (
    <div className="ui-table-owner">
      <span className="ui-table-owner__avatar" aria-hidden="true">{initials}</span>
      <span>
        <strong>{name}</strong>
        {detail && <small>{detail}</small>}
      </span>
    </div>
  )
}
