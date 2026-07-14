import { useEffect, useRef } from 'react'
import { useProjectStore } from '@/store/project'
import { useProjectIntelligence } from '@/hooks/useProjectIntelligence'
import { saveProjectHealthSnapshot } from '@/core/health/healthSnapshotService'

export function useHealthSnapshotWriter({
  project,
  minimumIntervalMinutes = 60,
}: {
  project?: any
  minimumIntervalMinutes?: number
}) {
  const { projectId } = useProjectStore()
  const intelligence = useProjectIntelligence({ project })
  const lastWrittenRef = useRef<number>(0)

  useEffect(() => {
    if (!projectId || !intelligence.health) return

    const now = Date.now()
    const minimumInterval = minimumIntervalMinutes * 60 * 1000

    if (now - lastWrittenRef.current < minimumInterval) return

    lastWrittenRef.current = now

    saveProjectHealthSnapshot({
      projectId,
      organizationId: project?.organization_id || null,
      portfolioId: project?.portfolio_id || null,
      health: intelligence.health,
      source: 'command_center',
    }).catch(error => {
      console.error('Unable to save project health snapshot:', error)
      lastWrittenRef.current = 0
    })
  }, [
    projectId,
    project,
    intelligence.health,
    minimumIntervalMinutes,
  ])
}
