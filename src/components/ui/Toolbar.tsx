import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Toolbar({
  children,
  summary,
  className,
}: {
  children: ReactNode
  summary?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('ui-toolbar', className)}>
      {summary && <div className="ui-toolbar__summary">{summary}</div>}
      <div className="ui-toolbar__actions">{children}</div>
    </div>
  )
}
