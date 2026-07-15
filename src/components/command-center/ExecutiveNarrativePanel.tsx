import type { ExecutiveNarrative } from '@/core/intelligence/narrative/narrativeTypes'
import {
  SectionHeader,
  StatusPill,
} from '@/components/ui'

export default function ExecutiveNarrativePanel({
  narrative,
}: {
  narrative: ExecutiveNarrative
}) {
  return (
    <section className="pmx-card p-6">
      <SectionHeader
        eyebrow="Executive Briefing"
        title={narrative.headline}
        description="Generated from the current schedule, readiness, risk, quality, procurement and governance position."
        action={
          <StatusPill
            label="Live"
            tone="primary"
            dot
          />
        }
      />

      <p className="mt-5 text-sm leading-7 text-[var(--pmx-muted)]">
        {narrative.summary}
      </p>

      {narrative.keyMessages.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {narrative.keyMessages.map(
            message => (
              <div
                key={message}
                className="rounded-lg border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] px-4 py-3 text-sm text-[var(--pmx-text)]"
              >
                {message}
              </div>
            )
          )}
        </div>
      ) : null}

      <div className="mt-5 border-t border-[var(--pmx-border)] pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--pmx-faint)]">
          Outlook
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--pmx-text)]">
          {narrative.outlook}
        </p>
      </div>
    </section>
  )
}
