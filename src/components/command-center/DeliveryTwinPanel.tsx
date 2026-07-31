import { useState } from 'react'
import type {
  DeliveryStage,
  DeliveryTwinResult,
} from '@/core/intelligence/delivery-twin/deliveryTwinTypes'
import { SectionHeader } from '@/components/ui'
import StageInspector from './StageInspector'
import InteractiveProjectTwinMap from './InteractiveProjectTwinMap'

export default function DeliveryTwinPanel({
  twin,
}: {
  twin: DeliveryTwinResult
}) {
  const [selectedStage, setSelectedStage] =
    useState<DeliveryStage | null>(null)

  return (
    <>
      <section className="pmx-section-panel">
        <SectionHeader
          eyebrow="Project Delivery State"
          title="Digital Project Twin"
          description={`Scope template: ${twin.scopeTemplate.replace(/_/g, ' ')}`}
          action={
            <span className="text-xs font-medium text-[var(--pmx-muted)]">
              {twin.completedStages}/{twin.totalApplicableStages} stages complete
            </span>
          }
        />

        <div className="mt-5">
          {twin.stages.length === 0 ? (
            <div className="pmx-empty-state">
              No schedule phases are available.
            </div>
          ) : (
            <InteractiveProjectTwinMap
              twin={twin}
              onSelectStage={setSelectedStage}
            />
          )}
        </div>
      </section>

      <StageInspector
        stage={selectedStage}
        onClose={() => setSelectedStage(null)}
      />
    </>
  )
}
