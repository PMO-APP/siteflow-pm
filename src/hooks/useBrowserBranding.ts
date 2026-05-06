import { useEffect } from 'react'
import { useProjectStore } from '@/store/project'
import { useRisks } from '@/hooks/useData'

export function useBrowserBranding() {
  const { projectName, projectId } = useProjectStore()
  const { data: risks = [] } = useRisks()

  useEffect(() => {
    const hasHighRisk = risks.some(
      (r: any) =>
        r.project_id === projectId &&
        r.status === 'Open' &&
        Number(r.risk_score || 0) >= 12
    )

    document.title = projectName
      ? `${hasHighRisk ? '● ' : ''}${projectName} | PMOCorex`
      : 'PMOCorex – Portfolio Control System'

    let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null

    if (!favicon) {
      favicon = document.createElement('link')
      favicon.rel = 'icon'
      document.head.appendChild(favicon)
    }

    const color = hasHighRisk ? '#e05252' : '#c49e48'

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill="#0c1014"/>
        <circle cx="32" cy="32" r="20" stroke="${color}" stroke-width="2" fill="none" opacity="0.45"/>
        <circle cx="32" cy="32" r="14" fill="${color}"/>
        <circle cx="32" cy="32" r="5" fill="#0c1014"/>
      </svg>
    `

    favicon.href =
      `data:image/svg+xml,${encodeURIComponent(svg)}`
  }, [projectName, projectId, risks])
}
