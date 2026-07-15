import { useMemo } from 'react'
import { useProjectStore } from '@/store/project'
import { useProjects } from '@/hooks/useData'
import { useHealthSnapshotWriter } from '@/hooks/useHealthSnapshotWriter'
import RoleBasedCommandCenter from '@/components/command-center/RoleBasedCommandCenter'

function sameId(a: unknown, b: unknown) {
  return String(a) === String(b)
}

export default function CommandCenterDashboard() {
  const { projectId } = useProjectStore()
  const { data: projects = [] } = useProjects()

  const project = useMemo(() => {
    return (projects as any[]).find(item =>
      sameId(item.id, projectId)
    )
  }, [projects, projectId])

  useHealthSnapshotWriter({
    project,
    minimumIntervalMinutes: 60,
  })

  return <RoleBasedCommandCenter project={project} />
}
