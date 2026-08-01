import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { listUserWorkspaces } from './workspaceService'
import type { Workspace } from './types'

type WorkspaceContextValue = {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  loading: boolean
  error: string | null
  switchWorkspace: (workspaceId: string) => void
  refresh: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
const STORAGE_KEY = 'siteflow-active-workspace-id'

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(state => state.user)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setWorkspaces([])
      setActiveWorkspaceId(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const next = await listUserWorkspaces(user.id)
      setWorkspaces(next)
      setActiveWorkspaceId(current => {
        const valid = current && next.some(workspace => workspace.id === current)
        const selected = valid ? current : next[0]?.id || null
        if (selected) localStorage.setItem(STORAGE_KEY, selected)
        return selected
      })
    } catch (cause) {
      console.error('Workspace loading failed:', cause)
      setError(cause instanceof Error ? cause.message : 'Unable to load workspace.')
      setWorkspaces([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { void refresh() }, [refresh])

  const switchWorkspace = useCallback((workspaceId: string) => {
    if (!workspaces.some(workspace => workspace.id === workspaceId)) return
    localStorage.setItem(STORAGE_KEY, workspaceId)
    setActiveWorkspaceId(workspaceId)
  }, [workspaces])

  const activeWorkspace = useMemo(
    () => workspaces.find(workspace => workspace.id === activeWorkspaceId) || workspaces[0] || null,
    [activeWorkspaceId, workspaces]
  )

  useEffect(() => {
    if (!activeWorkspace) return
    document.documentElement.style.setProperty('--workspace-primary', activeWorkspace.branding.primaryColor)
    document.documentElement.style.setProperty('--workspace-secondary', activeWorkspace.branding.secondaryColor)
    document.title = `${activeWorkspace.name} | SiteFlow PM`
  }, [activeWorkspace])

  const value = useMemo(() => ({
    workspaces,
    activeWorkspace,
    loading,
    error,
    switchWorkspace,
    refresh,
  }), [workspaces, activeWorkspace, loading, error, switchWorkspace, refresh])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider.')
  return context
}
