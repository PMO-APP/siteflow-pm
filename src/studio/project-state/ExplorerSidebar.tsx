import {
  Banknote,
  ClipboardCheck,
  FileCheck2,
  FileText,
  FolderKanban,
  HardHat,
  ListChecks,
  PackageSearch,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import type { ProjectStateSection, ProjectStateSectionId } from './types'

const icons = {
  project: FolderKanban,
  schedule: ListChecks,
  commercial: Banknote,
  quality: ClipboardCheck,
  risk: ShieldAlert,
  approvals: FileCheck2,
  procurement: PackageSearch,
  hse: HardHat,
  reports: FileText,
  documents: ShieldCheck,
}

export default function ExplorerSidebar({
  sections,
  activeSection,
  onSelect,
}: {
  sections: ProjectStateSection[]
  activeSection: ProjectStateSectionId
  onSelect: (section: ProjectStateSectionId) => void
}) {
  return (
    <aside className="pmx-state-sidebar">
      <div className="pmx-eyebrow">Project State</div>
      <nav className="mt-4 space-y-1">
        {sections.map(section => {
          const Icon = icons[section.id]
          const active = activeSection === section.id

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              className={active ? 'pmx-state-nav-item is-active' : 'pmx-state-nav-item'}
            >
              <Icon size={15} />
              <span className="min-w-0 flex-1 truncate">{section.label}</span>
              {typeof section.count === 'number' ? (
                <span className="pmx-state-count">{section.count}</span>
              ) : null}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
