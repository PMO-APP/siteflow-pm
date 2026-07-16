export default function InspectorField({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper?: string
}) {
  return (
    <div className="pmx-inspector-field">
      <div className="pmx-inspector-label">{label}</div>
      <div className="pmx-inspector-value">{value}</div>
      {helper ? <div className="pmx-inspector-helper">{helper}</div> : null}
    </div>
  )
}
