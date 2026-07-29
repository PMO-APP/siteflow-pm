import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  eyebrow?: string
  title: string
  message: string
  action?: ReactNode
  secondaryAction?: ReactNode
  compact?: boolean
  tone?: 'neutral' | 'positive' | 'warning'
  className?: string
}

export default function EmptyState({
  icon,
  eyebrow,
  title,
  message,
  action,
  secondaryAction,
  compact = false,
  tone = 'neutral',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'ui-empty-state',
        `ui-empty-state--${tone}`,
        compact && 'ui-empty-state--compact',
        className,
      )}
      role="status"
    >
      <div className="ui-empty-state__icon" aria-hidden="true">
        {icon || <Inbox size={22} />}
      </div>
      {eyebrow && <div className="ui-empty-state__eyebrow">{eyebrow}</div>}
      <h3 className="ui-empty-state__title">{title}</h3>
      <p className="ui-empty-state__message">{message}</p>
      {(action || secondaryAction) && (
        <div className="ui-empty-state__actions">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
