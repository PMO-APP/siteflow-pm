import type { InspectorMetricTone } from './types'

export default function InspectorField({
  label,
  value,
  helper,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  helper?: string
  tone?: InspectorMetricTone
}) {
  return (
    <div className="pmx-inspector-field">
      <div className="pmx-inspector-label">
        {label}
      </div>

      <div
        className={
          tone === 'success'
            ? 'pmx-inspector-value is-success'
            : tone === 'warning'
            ? 'pmx-inspector-value is-warning'
            : tone === 'danger'
            ? 'pmx-inspector-value is-danger'
            : 'pmx-inspector-value'
        }
      >
        {value}
      </div>

      {helper ? (
        <div className="pmx-inspector-helper">
          {helper}
        </div>
      ) : null}
    </div>
  )
}
