import { useCallback, useEffect, useState } from 'react'

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  const show = useCallback(() => setOpen(true), [])
  const toggle = useCallback(() => setOpen(value => !value), [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'
      if (!shortcut) return

      // Preserve normal browser/editor behaviour while a user is typing in a field,
      // unless the command palette is already open.
      if (!open && isEditableTarget(event.target)) return

      event.preventDefault()
      toggle()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, toggle])

  return { open, show, close, toggle, setOpen }
}
