import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EnterprisePageHero({
  eyebrow,
  title,
  description,
  projectName,
  actions,
  children,
  className,
}: {
  eyebrow: string
  title: string
  description: string
  projectName?: string | null
  actions?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={cn('enterprise-page-hero', className)}>
      <div className="enterprise-page-hero__rail" />
      <div className="enterprise-page-hero__content">
        <div className="enterprise-page-hero__copy">
          <div className="enterprise-page-hero__eyebrow">{eyebrow}</div>
          <h1 className="enterprise-page-hero__title">{title}</h1>
          <p className="enterprise-page-hero__description">{description}</p>
          {projectName && (
            <div className="enterprise-page-hero__project">
              Project: <strong>{projectName}</strong>
            </div>
          )}
          {children}
        </div>
        {actions && <div className="enterprise-page-hero__actions">{actions}</div>}
      </div>
    </section>
  )
}

export function EnterpriseMetric({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'navy',
  className,
}: {
  label: string
  value: ReactNode
  helper?: string
  icon?: LucideIcon
  tone?: 'navy' | 'coral' | 'green' | 'amber' | 'red'
  className?: string
}) {
  return (
    <article className={cn('enterprise-metric', className)}>
      <div className="enterprise-metric__content">
        <div>
          <div className="enterprise-metric__label">{label}</div>
          <div className="enterprise-metric__value">{value}</div>
          {helper && <div className="enterprise-metric__helper">{helper}</div>}
        </div>
        {Icon && (
          <div className={`enterprise-metric__icon enterprise-metric__icon--${tone}`}>
            <Icon size={17} />
          </div>
        )}
      </div>
    </article>
  )
}

export function EnterpriseNotice({
  children,
  tone = 'info',
}: {
  children: ReactNode
  tone?: 'info' | 'warning' | 'error' | 'success'
}) {
  return <div className={`enterprise-notice enterprise-notice--${tone}`}>{children}</div>
}

export function EnterpriseSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('enterprise-section', className)}>
      <div className="enterprise-section__header">
        <div>
          <h2 className="enterprise-section__title">{title}</h2>
          {description && <p className="enterprise-section__description">{description}</p>}
        </div>
        {action && <div className="enterprise-section__action">{action}</div>}
      </div>
      {children}
    </section>
  )
}
