import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-skeleton', className)} aria-hidden="true" {...props} />
}

export function MetricSkeleton() {
  return (
    <div className="ui-card ui-skeleton-card" aria-label="Loading metric">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-8 w-20" />
      <Skeleton className="mt-3 h-3 w-32" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="ui-table-wrap ui-table-skeleton" aria-label="Loading records">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="ui-table-skeleton__row" key={index}>
          <Skeleton className="h-3 w-[28%]" />
          <Skeleton className="h-3 w-[18%]" />
          <Skeleton className="h-3 w-[22%]" />
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  )
}
