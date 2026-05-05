import { useEffect } from 'react'
import { useProjectStore } from '@/store/project'
import { useRisks } from '@/hooks/useData'

export function useBrowserBranding() {
  const { projectName, projectId } = useProjectStore()
  const { data: risks = [] } = useRisks()

  useEffect(() => {
    const projectRisks = risks.filter(
      (r: any) => r.project_id === projectId
    )

    const hasHighRisk = projectRisks.some(
      (r: any) =>
        r.status === 'Open' &&
        Number(r.risk_score || 0) >= 12
    )

    document.title = projectName
      ? `${hasHighRisk ? '● ' : ''}${projectName} | PMOCorex`
      : 'PMOCorex – Portfolio Control System'

    const favicon =
      document.querySelector("link[rel='icon']") ||
      document.createElement('link')

    favicon.setAttribute('rel', 'icon')

    const color = hasHighRisk
      ? '#e05252'
      : projectName
      ? '#c49e48'
      : '#c49e48'

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill="#0c1014"/>
        <circle cx="32" cy="32" r="18" fill="${color}"/>
        <text x="32" y="38" font-size="18" font-family="Arial" font-weight="700" text-anchor="middle" fill="#0c1014">P</text>
      </svg>
    `

    favicon.setAttribute(
      'href',
      `data:image/svg+xml,${encodeURIComponent(svg)}`
    )

    document.head.appendChild(favicon)
  }, [projectName, projectId, risks])
}
