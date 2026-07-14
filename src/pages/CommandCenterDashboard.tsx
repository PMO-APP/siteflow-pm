import { useMemo } from 'react'
import { useProjectStore } from '@/store/project'
import { useProjects } from '@/hooks/useData'
import RoleBasedCommandCenter from '@/components/command-center/RoleBasedCommandCenter'
import { useHealthSnapshotWriter } from '@/hooks/useHealthSnapshotWriter'

function sameId(a: any, b: any) {
  return String(a) === String(b)
}

export default function CommandCenterDashboard() {
  const { projectId } = useProjectStore()
  const { data: projects = [] } = useProjects()

  const project = useMemo(
    () => (projects as any[]).find(item => sameId(item.id, projectId)),
    [projects, projectId]
  )

  // ✅ Hook belongs INSIDE the component
  useHealthSnapshotWriter({
    project,
    minimumIntervalMinutes: 60,
  })

  return (
    <RoleBasedCommandCenter
      project={project}
    />
  )
}
