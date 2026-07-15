import { useMemo } from 'react'
import { useProjectStore } from '@/store/project'
import { useProjects } from '@/hooks/useData'
import V6IntelligenceComparison from '@/components/dev/V6IntelligenceComparison'
import { SectionHeader } from '@/components/ui'

function sameId(a: unknown, b: unknown) {
  return String(a) === String(b)
}

export default function StudioIntelligencePage() {
  const { projectId } = useProjectStore()
  const { data: projects = [] } = useProjects()

  const project = useMemo(
    () =>
      (projects as any[]).find(item =>
        sameId(item.id, projectId)
      ),
    [projects, projectId]
  )

  return (
    <div className="pmx-page-stack">
      <SectionHeader
        eyebrow="Intelligence Lab"
        title="V6 Intelligence Comparison"
        description="Compare stable production outputs with the V6 Project State and orchestrator."
      />

      <V6IntelligenceComparison
        project={project}
      />
    </div>
  )
}
