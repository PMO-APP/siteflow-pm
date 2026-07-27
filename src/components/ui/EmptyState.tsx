import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  message: string
  action?: ReactNode
  compact?: boolean
  className?: string
}

export default function EmptyState({
  icon,
  title,
  message,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'ui-empty-state',
        compact && 'ui-empty-state--compact',
        className,
      )}
      role="status"
    >
      <div className="ui-empty-state__icon" aria-hidden="true">
        {icon || <Inbox size={22} />}
      </div>
      <h3 className="ui-empty-state__title">{title}</h3>
      <p className="ui-empty-state__message">{message}</p>
      {action && <div className="ui-empty-state__action">{action}</div>}
    </div>
  )
}
