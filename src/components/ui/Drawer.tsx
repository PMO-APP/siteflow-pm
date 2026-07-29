import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  title: string
  description?: string
  eyebrow?: string
  children: ReactNode
  footer?: ReactNode
  headerActions?: ReactNode
  onClose: () => void
  width?: 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

export function Drawer({
  open,
  title,
  description,
  eyebrow,
  children,
  footer,
  headerActions,
  onClose,
  width = 'lg',
  className,
}: DrawerProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea')?.focus())

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="ui-drawer-layer" role="presentation">
      <button className="ui-drawer-backdrop" aria-label="Close panel" onClick={onClose} />
      <aside
        ref={panelRef}
        className={cn('ui-drawer', `ui-drawer--${width}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="ui-drawer__rail" />
        <header className="ui-drawer__header">
          <div className="ui-drawer__heading">
            {eyebrow && <div className="ui-drawer__eyebrow">{eyebrow}</div>}
            <h2 id={titleId} className="ui-drawer__title">{title}</h2>
            {description && <p className="ui-drawer__description">{description}</p>}
          </div>
          <div className="ui-drawer__header-actions">
            {headerActions}
            <button className="ui-drawer__close" onClick={onClose} aria-label="Close panel"><X size={18} /></button>
          </div>
        </header>
        <div className="ui-drawer__body">{children}</div>
        {footer && <footer className="ui-drawer__footer">{footer}</footer>}
      </aside>
    </div>
  )
}

interface DrawerTabsProps {
  items: Array<{ id: string; label: string; count?: number }>
  activeId: string
  onChange: (id: string) => void
}

export function DrawerTabs({ items, activeId, onChange }: DrawerTabsProps) {
  return (
    <div className="ui-drawer-tabs" role="tablist" aria-label="Record sections">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={activeId === item.id}
          className={cn('ui-drawer-tab', activeId === item.id && 'is-active')}
          onClick={() => onChange(item.id)}
        >
          <span>{item.label}</span>
          {typeof item.count === 'number' && <span className="ui-drawer-tab__count">{item.count}</span>}
        </button>
      ))}
    </div>
  )
}
