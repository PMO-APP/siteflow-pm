
import { useEffect } from 'react'
import { useProjectStore } from '@/store/project'
import { useRisks } from '@/hooks/useData'
import { useWorkspace } from '@/workspace/WorkspaceProvider'

export function useBrowserBranding() {
  const { projectName, projectId } = useProjectStore()
  const { data: risks = [] } = useRisks()
  const { activeWorkspace } = useWorkspace()

  useEffect(() => {
    const hasHighRisk = risks.some(
      (r: any) =>
        r.project_id === projectId &&
        r.status === 'Open' &&
        Number(r.risk_score || 0) >= 12
    )

    const productName = activeWorkspace?.branding.productName || 'PMOCorex'
    document.title = projectName
      ? `${hasHighRisk ? '● ' : ''}${projectName} | ${productName}`
      : `${activeWorkspace?.name || productName} | ${productName}`

    let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
    if (!favicon) {
      favicon = document.createElement('link')
      favicon.rel = 'icon'
      document.head.appendChild(favicon)
    }

    if (activeWorkspace?.branding.faviconUrl) {
      favicon.href = activeWorkspace.branding.faviconUrl
      return
    }

    const primary = activeWorkspace?.branding.primaryColor || '#0B2A3C'
    const secondary = hasHighRisk ? '#e05252' : activeWorkspace?.branding.secondaryColor || '#08B5A6'
    const initial = encodeURIComponent(productName.slice(0,1).toUpperCase())
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="${primary}"/>
      <text x="32" y="42" text-anchor="middle" font-family="Arial" font-size="32" font-weight="700" fill="white">${initial}</text>
      <rect y="0" width="64" height="6" fill="${secondary}"/>
    </svg>`
    favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`
  }, [projectName, projectId, risks, activeWorkspace])
}
