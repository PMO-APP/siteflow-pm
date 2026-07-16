import { useMemo, useState } from 'react'
import {
  Check,
  Clipboard,
  Search,
} from 'lucide-react'

function filterJson(
  value: unknown,
  query: string
): unknown {
  if (!query.trim()) return value

  const needle = query.trim().toLowerCase()

  if (Array.isArray(value)) {
    const filtered = value
      .map(item => filterJson(item, query))
      .filter(item => item !== undefined)

    return filtered.length ? filtered : undefined
  }

  if (
    value &&
    typeof value === 'object'
  ) {
    const result: Record<string, unknown> = {}

    Object.entries(value as Record<string, unknown>).forEach(
      ([key, child]) => {
        const keyMatch = key.toLowerCase().includes(needle)
        const childMatch = filterJson(child, query)

        if (keyMatch) {
          result[key] = child
        } else if (childMatch !== undefined) {
          result[key] = childMatch
        }
      }
    )

    return Object.keys(result).length
      ? result
      : undefined
  }

  return String(value ?? '')
    .toLowerCase()
    .includes(needle)
    ? value
    : undefined
}

export default function JsonPreview({
  data,
  label,
}: {
  data: unknown
  label: string
}) {
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)

  const filtered = useMemo(
    () => filterJson(data, query),
    [data, query]
  )

  const json = useMemo(
    () =>
      JSON.stringify(
        filtered === undefined ? {} : filtered,
        null,
        2
      ),
    [filtered]
  )

  async function copyJson() {
    await navigator.clipboard.writeText(json)
    setCopied(true)

    window.setTimeout(
      () => setCopied(false),
      1500
    )
  }

  return (
    <section className="pmx-json-preview">
      <div className="pmx-json-toolbar">
        <div>
          <div className="pmx-eyebrow">
            Raw data
          </div>

          <div className="mt-1 text-sm font-semibold text-[var(--pmx-text)]">
            {label} JSON
          </div>
        </div>

        <button
          type="button"
          className="pmx-btn-secondary pmx-btn-sm"
          onClick={copyJson}
        >
          {copied ? (
            <Check size={14} />
          ) : (
            <Clipboard size={14} />
          )}
          {copied ? 'Copied' : 'Copy JSON'}
        </button>
      </div>

      <div className="pmx-json-search">
        <Search size={14} />
        <input
          value={query}
          onChange={event =>
            setQuery(event.target.value)
          }
          placeholder="Search keys or values"
        />
      </div>

      <pre className="pmx-json-code pmx-scrollbar">
        {json}
      </pre>
    </section>
  )
}
