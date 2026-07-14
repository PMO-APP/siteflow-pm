import { useMemo } from 'react'
import { useProjectHealthHistory } from '@/hooks/useProjectHealthHistory'

export default function HealthTrend({
  days = 30,
}: {
  days?: number
}) {
  const { data = [], isLoading } = useProjectHealthHistory(days)

  const points = useMemo(() => {
    const rows = data as any[]
    if (!rows.length) return []

    const width = 320
    const height = 90
    const padding = 8

    return rows.map((row, index) => {
      const x =
        rows.length === 1
          ? width / 2
          : padding +
            (index / (rows.length - 1)) *
              (width - padding * 2)

      const score = Math.max(
        0,
        Math.min(100, Number(row.overall_score || 0))
      )

      const y =
        padding +
        ((100 - score) / 100) *
          (height - padding * 2)

      return { x, y, score }
    })
  }, [data])

  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    )
    .join(' ')

  if (isLoading) {
    return (
      <div className="h-[90px] animate-pulse rounded-lg bg-[var(--pmx-surface-2)]" />
    )
  }

  if (!points.length) {
    return (
      <div className="flex h-[90px] items-center justify-center rounded-lg border border-dashed border-[var(--pmx-border)] text-xs text-[var(--pmx-faint)]">
        Health trend will appear after snapshots are recorded.
      </div>
    )
  }

  return (
    <div>
      <svg
        viewBox="0 0 320 90"
        className="h-[90px] w-full"
        role="img"
        aria-label="Project health trend"
      >
        <path
          d={path}
          fill="none"
          stroke="var(--pmx-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="var(--pmx-primary)"
          />
        ))}
      </svg>

      <div className="mt-2 flex justify-between text-[11px] text-[var(--pmx-faint)]">
        <span>{days} days ago</span>
        <span>Today</span>
      </div>
    </div>
  )
}
