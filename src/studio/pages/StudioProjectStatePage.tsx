import { SectionHeader } from '@/components/ui'
import ProjectStateExplorer from '../project-state/ProjectStateExplorer'

export default function StudioProjectStatePage() {
  return (
    <div className="pmx-page-stack">
      <SectionHeader
        eyebrow="Project State Explorer"
        title="Inspect the V6 project model"
        description="Navigate through the Project State structure in a dedicated Studio inspector."
      />
      <ProjectStateExplorer />
    </div>
  )
}
