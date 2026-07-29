import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Lightbulb,
  Minus,
} from 'lucide-react'

export type Tone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

export type IconType = LucideIcon

const toneMap: Record<Tone, string> = {
  neutral: 'neutral',
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
}

export function StatusPill({
  label,
  tone = 'neutral',
  dot = false,
  className = '',
}: {
  label: string
  tone?: Tone
  dot?: boolean
  className?: string
}) {
  return (
    <span className={`pmx-status pmx-status-${toneMap[tone]} ${className}`}>
      {dot && <span className="pmx-status-dot" />}
      {label}
    </span>
  )
}

export function SectionHeader({
  title,
  description,
  eyebrow,
  action,
  className = '',
}: {
  title: string
  description?: string
  eyebrow?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`pmx-section-header ${className}`}>
      <div className="min-w-0">
        {eyebrow && <div className="pmx-eyebrow">{eyebrow}</div>}
        <h2 className="pmx-section-heading">{title}</h2>
        {description && (
          <p className="pmx-section-description">{description}</p>
        )}
      </div>
      {action && <div className="pmx-section-action">{action}</div>}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'neutral',
  trend,
  action,
  compact = false,
  className = '',
}: {
  label: string
  value: string | number
  helper?: string
  icon?: IconType
  tone?: Tone
  trend?: { value: number; label?: string }
  action?: ReactNode
  compact?: boolean
  className?: string
}) {
  const TrendIcon =
    !trend || trend.value === 0
      ? Minus
      : trend.value > 0
      ? ArrowUpRight
      : ArrowDownRight

  return (
    <div
      className={`pmx-metric-card pmx-metric-${toneMap[tone]} ${
        compact ? 'pmx-metric-card-compact' : ''
      } ${className}`}
    >
      <div className="pmx-metric-topline">
        <div className="pmx-metric-label">{label}</div>
        {Icon && <Icon size={17} className="pmx-metric-icon" />}
      </div>

      <div className="pmx-metric-value">{value}</div>

      <div className="pmx-metric-footer">
        <div>
          {trend && (
            <div
              className={`pmx-metric-trend ${
                trend.value > 0
                  ? 'is-positive'
                  : trend.value < 0
                  ? 'is-negative'
                  : 'is-neutral'
              }`}
            >
              <TrendIcon size={14} />
              <span>{Math.abs(trend.value)}%</span>
              {trend.label && <span>{trend.label}</span>}
            </div>
          )}
          {helper && <div className="pmx-metric-helper">{helper}</div>}
        </div>
        {action && <div className="pmx-metric-action">{action}</div>}
      </div>
    </div>
  )
}

export function ProgressRing({
  value,
  size = 104,
  strokeWidth = 9,
  label,
  helper,
  tone = 'primary',
  className = '',
}: {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
  helper?: string
  tone?: Exclude<Tone, 'info'>
  className?: string
}) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (safeValue / 100) * circumference

  const color = {
    neutral: 'var(--pmx-muted)',
    primary: 'var(--pmx-primary)',
    success: 'var(--pmx-success)',
    warning: 'var(--pmx-warning)',
    danger: 'var(--pmx-danger)',
  }[tone]

  return (
    <div className={`pmx-progress-ring-wrap ${className}`}>
      <div className="pmx-progress-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            className="pmx-progress-ring-track"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="pmx-progress-ring-value"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="pmx-progress-ring-center">
          <div className="pmx-progress-ring-number">{Math.round(safeValue)}%</div>
        </div>
      </div>

      {(label || helper) && (
        <div>
          {label && <div className="pmx-progress-ring-label">{label}</div>}
          {helper && <div className="pmx-progress-ring-helper">{helper}</div>}
        </div>
      )}
    </div>
  )
}

export type TimelineSegment = {
  id: string
  label: string
  value: number
  tone?: Tone
  helper?: string
}

export function TimelineBar({
  segments,
  title,
  showLegend = true,
  className = '',
  onSegmentClick,
}: {
  segments: TimelineSegment[]
  title?: string
  showLegend?: boolean
  className?: string
  onSegmentClick?: (segment: TimelineSegment) => void
}) {
  return (
    <div className={`pmx-timeline ${className}`}>
      {title && <div className="pmx-timeline-title">{title}</div>}

      <div className="pmx-timeline-stack">
        {segments.map(segment => {
          const value = Math.max(0, Math.min(100, Number(segment.value || 0)))
          const tone = segment.tone || 'neutral'

          return (
            <button
              key={segment.id}
              type="button"
              className="pmx-timeline-row"
              onClick={() => onSegmentClick?.(segment)}
              disabled={!onSegmentClick}
            >
              <div className="pmx-timeline-row-copy">
                <span className="pmx-timeline-row-label">{segment.label}</span>
                <span className="pmx-timeline-row-value">{value}%</span>
              </div>

              <div className="pmx-timeline-track">
                <div
                  className={`pmx-timeline-fill pmx-timeline-${toneMap[tone]}`}
                  style={{ width: `${value}%` }}
                />
              </div>

              {segment.helper && (
                <div className="pmx-timeline-helper">{segment.helper}</div>
              )}
            </button>
          )
        })}
      </div>

      {showLegend && (
        <div className="pmx-timeline-legend">
          <span><i className="is-success" /> Complete</span>
          <span><i className="is-primary" /> Active</span>
          <span><i className="is-warning" /> Attention</span>
          <span><i className="is-danger" /> Delayed</span>
        </div>
      )}
    </div>
  )
}

export type ActivityFeedItem = {
  id: string
  title: string
  description?: string
  timestamp: string
  actor?: string
  icon?: IconType
  tone?: Tone
}

export function ActivityFeed({
  items,
  emptyText = 'No recent activity.',
  maxItems = 10,
  className = '',
  onItemClick,
}: {
  items: ActivityFeedItem[]
  emptyText?: string
  maxItems?: number
  className?: string
  onItemClick?: (item: ActivityFeedItem) => void
}) {
  const visibleItems = items.slice(0, maxItems)

  if (!visibleItems.length) {
    return <div className={`pmx-feed-empty ${className}`}>{emptyText}</div>
  }

  return (
    <div className={`pmx-feed ${className}`}>
      {visibleItems.map(item => {
        const Icon = item.icon
        const tone = item.tone || 'neutral'

        return (
          <button
            key={item.id}
            type="button"
            className="pmx-feed-item"
            onClick={() => onItemClick?.(item)}
            disabled={!onItemClick}
          >
            <div className={`pmx-feed-icon pmx-feed-${toneMap[tone]}`}>
              {Icon ? <Icon size={15} /> : <span />}
            </div>

            <div className="pmx-feed-content">
              <div className="pmx-feed-head">
                <div className="pmx-feed-title">{item.title}</div>
                <time className="pmx-feed-time">{item.timestamp}</time>
              </div>

              {item.description && (
                <div className="pmx-feed-description">{item.description}</div>
              )}

              {item.actor && <div className="pmx-feed-actor">{item.actor}</div>}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function HealthGauge({
  value,
  label = 'Project Health',
  helper,
  size = 'md',
  className = '',
}: {
  value: number
  label?: string
  helper?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)))
  const state =
    safeValue >= 85
      ? { label: 'Healthy', className: 'is-healthy' }
      : safeValue >= 70
      ? { label: 'Recoverable', className: 'is-recoverable' }
      : safeValue >= 50
      ? { label: 'At Risk', className: 'is-at-risk' }
      : { label: 'Critical', className: 'is-critical' }

  const angle = -90 + (safeValue / 100) * 180

  return (
    <div className={`pmx-health-gauge pmx-health-${size} ${className}`}>
      <div className="pmx-health-gauge-visual">
        <div className="pmx-health-gauge-arc" />
        <div
          className={`pmx-health-gauge-needle ${state.className}`}
          style={{ transform: `rotate(${angle}deg)` }}
        />
        <div className="pmx-health-gauge-hub" />
        <div className="pmx-health-gauge-value">
          <strong>{Math.round(safeValue)}</strong>
          <span>/100</span>
        </div>
      </div>

      <div>
        <div className="pmx-health-label">{label}</div>
        <div className={`pmx-health-state ${state.className}`}>
          {state.label}
        </div>
        {helper && <div className="pmx-health-helper">{helper}</div>}
      </div>
    </div>
  )
}

export function InsightPanel({
  title,
  summary,
  points = [],
  icon: Icon = Lightbulb,
  tone = 'primary',
  badge,
  generatedAt,
  action,
  className = '',
}: {
  title: string
  summary: string
  points?: string[]
  icon?: IconType
  tone?: Tone
  badge?: string
  generatedAt?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={`pmx-insight ${className}`}>
      <div className="pmx-insight-header">
        <div className="pmx-insight-heading">
          <div className={`pmx-insight-icon pmx-insight-${toneMap[tone]}`}>
            <Icon size={17} />
          </div>

          <div>
            <div className="pmx-insight-title-row">
              <h3 className="pmx-insight-title">{title}</h3>
              {badge && <StatusPill label={badge} tone={tone} />}
            </div>
            {generatedAt && (
              <div className="pmx-insight-generated">
                Generated {generatedAt}
              </div>
            )}
          </div>
        </div>

        {action && <div>{action}</div>}
      </div>

      <p className="pmx-insight-summary">{summary}</p>

      {points.length > 0 && (
        <ul className="pmx-insight-list">
          {points.map((point, index) => (
            <li key={`${point}-${index}`}>
              <span className="pmx-insight-bullet" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function CommandCard({
  title,
  value,
  description,
  icon: Icon,
  tone = 'neutral',
  status,
  statusTone = tone,
  action,
  footer,
  children,
  className = '',
}: {
  title: string
  value?: string | number
  description?: string
  icon?: IconType
  tone?: Tone
  status?: string
  statusTone?: Tone
  action?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={`pmx-command-card pmx-command-${toneMap[tone]} ${className}`}>
      <div className="pmx-command-header">
        <div className="pmx-command-title-wrap">
          {Icon && (
            <div className="pmx-command-icon">
              <Icon size={18} />
            </div>
          )}

          <div>
            <h3 className="pmx-command-title">{title}</h3>
            {description && (
              <p className="pmx-command-description">{description}</p>
            )}
          </div>
        </div>

        <div className="pmx-command-actions">
          {status && <StatusPill label={status} tone={statusTone} />}
          {action}
        </div>
      </div>

      {value !== undefined && (
        <div className="pmx-command-value">{value}</div>
      )}

      {children && <div className="pmx-command-body">{children}</div>}
      {footer && <div className="pmx-command-footer">{footer}</div>}
    </section>
  )
}

export * from './Button'
export * from './Card'
export * from './Badge'
export * from './Table'
export * from './SectionTitle'
export * from './StatCard'

export { Button } from './Button'
export type { ButtonProps } from './Button'
export { Card, DarkCard } from './Card'
export { Badge } from './Badge'
export { default as EmptyState } from './EmptyState'
export { FormSection } from './FormSection'
export { SectionTitle } from './SectionTitle'
export { Skeleton, MetricSkeleton, TableSkeleton } from './Skeleton'
export { StatCard } from './StatCard'
export { Table } from './Table'
export { Toolbar } from './Toolbar'

export { Drawer } from './Drawer'
