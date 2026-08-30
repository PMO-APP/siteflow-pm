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

    // A workspace may explicitly supply its own favicon. Otherwise the platform
    // favicon defined in index.html remains authoritative. Do not generate a
    // temporary letter icon after hydration; that was what changed PMOCorex to “P”.
    if (activeWorkspace?.branding.faviconUrl) {
      favicon.href = activeWorkspace.branding.faviconUrl
      return
    }

    favicon.type = 'image/svg+xml'
    favicon.href = '/favicon.svg'
  }, [projectName, projectId, risks, activeWorkspace])
}
