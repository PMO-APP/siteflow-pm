import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Runs a page's existing create/open workflow when navigation includes
 * `?action=new`, then removes the flag so refresh/back navigation cannot
 * reopen the form unexpectedly.
 */
export function useQuickActionRoute(onCreate: () => void, enabled = true) {
  const [searchParams, setSearchParams] = useSearchParams()
  const handled = useRef(false)

  useEffect(() => {
    if (!enabled || handled.current || searchParams.get('action') !== 'new') return

    handled.current = true
    onCreate()

    const next = new URLSearchParams(searchParams)
    next.delete('action')
    setSearchParams(next, { replace: true })
  }, [enabled, onCreate, searchParams, setSearchParams])
}
