import { useMemo } from 'react'
import { useProjectStore } from '@/store/project'
import { useProjects } from '@/hooks/useData'
import RoleBasedCommandCenter from '@/components/command-center/RoleBasedCommandCenter'
import { useHealthSnapshotWriter } from '@/hooks/useHealthSnapshotWriter'
import HealthTrend from '@/components/command-center/HealthTrend'


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

  return <RoleBasedCommandCenter project={project} />
}
useHealthSnapshotWriter({
  project,
  minimumIntervalMinutes: 60,
})

// Add this panel:
<div className="pmx-card p-5">
  <SectionHeader
    title="Health Trend"
    description="Movement in the project health score over the last 30 days."
  />
  <div className="mt-4">
    <HealthTrend days={30} />
  </div>
</div>
