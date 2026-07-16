import { Construction } from 'lucide-react'
import type { ProjectStateSection } from './types'
import InspectorCard from './InspectorCard'
import InspectorField from './InspectorField'

export default function ExplorerContent({
  section,
}: {
  section: ProjectStateSection
}) {
  return (
    <div className="pmx-state-content">
      <div className="pmx-eyebrow">{section.label}</div>
      <h2 className="mt-2 text-xl font-semibold text-[var(--pmx-text)]">
        {section.label} Inspector
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-[var(--pmx-muted)]">
        {section.description}
      </p>

      <div className="mt-6">
        <InspectorCard
          title="Explorer layout ready"
          description="Structured Project State metrics will be connected in Sprint B1.2."
        >
          <InspectorField label="Section" value={section.label} />
          <InspectorField label="Status" value="Layout only" />
          <InspectorField label="Next step" value="Connect live ProjectState" />
        </InspectorCard>

        <div className="pmx-state-placeholder">
          <Construction size={22} />
          <div>
            <div className="text-sm font-semibold text-[var(--pmx-text)]">
              Live data connection comes next
            </div>
            <div className="mt-1 text-xs text-[var(--pmx-muted)]">
              This first step intentionally introduces only the Explorer shell.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
