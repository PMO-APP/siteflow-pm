import { useMemo, useState } from 'react'
import type { ProjectStateSection, ProjectStateSectionId } from './types'
import ExplorerSidebar from './ExplorerSidebar'
import ExplorerContent from './ExplorerContent'

const sections: ProjectStateSection[] = [
  { id: 'project', label: 'Project', description: 'Project identity, status, scope and key dates.' },
  { id: 'schedule', label: 'Schedule', description: 'Activities, completion, overdue work and progress position.' },
  { id: 'commercial', label: 'Commercial', description: 'Contract sum, variations, payments and forecast cost.' },
  { id: 'quality', label: 'Quality', description: 'Snags, inspections and critical quality exceptions.' },
  { id: 'risk', label: 'Risk', description: 'Open risks, high risks and mitigation coverage.' },
  { id: 'approvals', label: 'Approvals', description: 'Pending, overdue and approved reviews.' },
  { id: 'procurement', label: 'Procurement', description: 'At-risk, overdue and completed procurement items.' },
  { id: 'hse', label: 'HSE', description: 'Incidents, open actions and overdue actions.' },
  { id: 'reports', label: 'Reports', description: 'Weekly, cost and design report submission status.' },
  { id: 'documents', label: 'Documents', description: 'Documents awaiting review, approved and uploaded this week.' },
]

export default function ProjectStateExplorer() {
  const [activeSection, setActiveSection] =
    useState<ProjectStateSectionId>('project')

  const active = useMemo(
    () => sections.find(section => section.id === activeSection) || sections[0],
    [activeSection]
  )

  return (
    <div className="pmx-state-explorer">
      <ExplorerSidebar
        sections={sections}
        activeSection={activeSection}
        onSelect={setActiveSection}
      />
      <ExplorerContent section={active} />
    </div>
  )
}
