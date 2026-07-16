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
      <div className="pmx-eyebrow">
        {section.label}
      </div>

      <h2 className="mt-2 text-xl font-semibold text-[var(--pmx-text)]">
        {section.label} Inspector
      </h2>

      <p className="mt-1 max-w-2xl text-sm text-[var(--pmx-muted)]">
        {section.description}
      </p>

      <div className="mt-6">
        <InspectorCard
          title={`${section.label} State`}
          description="Values are calculated from the current V6 ProjectState."
        >
          {section.metrics.map(metric => (
            <InspectorField
              key={metric.label}
              label={metric.label}
              value={metric.value}
              helper={metric.helper}
              tone={metric.tone}
            />
          ))}
        </InspectorCard>
      </div>
    </div>
  )
}
