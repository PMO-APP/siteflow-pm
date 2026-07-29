import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  width?: 'md' | 'lg' | 'xl'
}

export function Drawer({ open, title, description, children, footer, onClose, width = 'lg' }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="ui-drawer-layer" role="presentation">
      <button className="ui-drawer-backdrop" aria-label="Close panel" onClick={onClose} />
      <aside className={cn('ui-drawer', `ui-drawer--${width}`)} role="dialog" aria-modal="true" aria-labelledby="ui-drawer-title">
        <div className="ui-drawer__rail" />
        <header className="ui-drawer__header">
          <div>
            <h2 id="ui-drawer-title" className="ui-drawer__title">{title}</h2>
            {description && <p className="ui-drawer__description">{description}</p>}
          </div>
          <button className="ui-drawer__close" onClick={onClose} aria-label="Close panel"><X size={18} /></button>
        </header>
        <div className="ui-drawer__body">{children}</div>
        {footer && <footer className="ui-drawer__footer">{footer}</footer>}
      </aside>
    </div>
  )
}
