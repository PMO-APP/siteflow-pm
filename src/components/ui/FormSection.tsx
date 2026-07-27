import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FormSection({
  title,
  description,
  children,
  defaultOpen = false,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}) {
  return (
    <details className={cn('ui-form-section', className)} open={defaultOpen}>
      <summary className="ui-form-section__summary">
        <div>
          <div className="ui-form-section__title">{title}</div>
          {description && <div className="ui-form-section__description">{description}</div>}
        </div>
        <ChevronDown className="ui-form-section__chevron" size={18} aria-hidden="true" />
      </summary>
      <div className="ui-form-section__body">{children}</div>
    </details>
  )
}
