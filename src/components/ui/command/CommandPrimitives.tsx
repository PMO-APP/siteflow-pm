import type { ElementType, ReactNode } from 'react'

export function CommandPage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`pmx-command-page space-y-5 ${className}`}>{children}</div>
}

export function CommandHero({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: {
  eyebrow: string
  title: string
  description?: string
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="pmx-command-hero">
      <div className="pmx-command-hero__content">
        <div className="pmx-command-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {meta && <div className="pmx-command-meta">{meta}</div>}
      </div>
      {actions && <div className="pmx-command-actions">{actions}</div>}
    </section>
  )
}

export function CommandMetric({
  label,
  value,
  icon: Icon,
  note,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  icon?: ElementType
  note?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) {
  return (
    <article className={`pmx-command-metric pmx-command-metric--${tone}`}>
      <div className="pmx-command-metric__top">
        <span>{label}</span>
        {Icon && <Icon size={17} />}
      </div>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  )
}

export function CommandSectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="pmx-command-section-header">
      <div>
        {eyebrow && <div className="pmx-command-eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function CommandEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: ElementType
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="pmx-command-empty">
      {Icon && <div className="pmx-command-empty__icon"><Icon size={21} /></div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
