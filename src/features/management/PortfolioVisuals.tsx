import { useState } from 'react'
import { ArrowUpRight, CalendarDays, TrendingUp, Gauge, X } from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, Legend, XAxis, YAxis,
} from 'recharts'
import { dayDifference, portfolioProgress, type ProjectPosition } from './model'

const dateLabel = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-GB', {
  timeZone: 'Africa/Lagos', day: 'numeric', month: 'short',
})
const fullDate = (value: string) => new Date(value).toLocaleDateString('en-GB', {
  timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric',
})

type OpenProject = (row: ProjectPosition, destination?: string) => void

export function PortfolioTrend({ rows }: { rows: ProjectPosition[] }) {
  const points = portfolioProgress(rows).map(point => ({ ...point, timestamp: Date.parse(point.date) }))
  return <section id="trends" className="mi-panel scroll-mt-6" aria-labelledby="trends-heading">
    <div className="mi-section-heading">
      <div><h2 id="trends-heading">Progress trend</h2><p>Average actual and planned progress from comparable weekly reports.</p></div>
      <TrendingUp aria-hidden />
    </div>
    {points.length >= 2 ? <>
      <div className="h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ right: 24, left: 4, top: 12 }}>
            <CartesianGrid vertical={false} stroke="#dbe4eb" strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={dateLabel} tick={{ fontSize: 12 }} minTickGap={20} tickMargin={8} />
            <YAxis width={48} domain={[0, 100]} tickFormatter={value => `${value}%`} tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={dateLabel} formatter={value => `${value}%`} />
            <Legend />
            <Line dataKey="actual" name="Actual progress" stroke="#007a74" strokeWidth={2.5} isAnimationActive={false} />
            <Line dataKey="planned" name="Planned progress" stroke="#12314b" strokeDasharray="6 4" strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mi-footnote">{points[0].coverage} of {rows.length} selected projects have comparable reports for the dates shown.</p>
      <details className="mt-3">
        <summary className="mi-text-button cursor-pointer">View figures</summary>
        <table className="mi-table mt-2">
          <thead><tr><th scope="col">Report date</th><th scope="col">Actual</th><th scope="col">Planned</th></tr></thead>
          <tbody>{points.map(point => <tr key={point.date}><th scope="row">{dateLabel(point.timestamp)}</th><td>{point.actual}%</td><td>{point.planned}%</td></tr>)}</tbody>
        </table>
      </details>
    </> : <p className="mi-empty">A trend appears when the same projects have comparable actual and planned figures on at least two reporting dates. Select a project to see its own history.</p>}
  </section>
}

const lenses = {
  'Progress behind plan': { get: (row: ProjectPosition) => row.progressGap !== null && row.progressGap < 0 ? -row.progressGap : null, unit: ' pp', path: '/app' },
  'Activity delay': { get: (row: ProjectPosition) => row.maximumActivityDelay, unit: 'd', path: '/app/recovery' },
  'Open high risks': { get: (row: ProjectPosition) => row.highRisks, unit: '', path: '/app/risk' },
}

export function ProjectPressure({ rows, onOpen }: { rows: ProjectPosition[]; onOpen: OpenProject }) {
  const [lens, setLens] = useState<keyof typeof lenses>('Progress behind plan')
  const { get, unit, path } = lenses[lens]
  const points = rows
    .filter(row => row.active)
    .flatMap(row => {
      const value = get(row)
      return value === null ? [] : [{ row, value }]
    })
    .sort((a, b) => b.value - a.value || a.row.project.project_name.localeCompare(b.row.project.project_name))
  const maximum = points[0]?.value || 1

  return <section className="mi-panel" aria-labelledby="pressure-heading">
    <div className="mi-section-heading">
      <div><h2 id="pressure-heading">Project pressure</h2></div>
      <Gauge aria-hidden />
    </div>
    <div className="mi-chips" role="group" aria-label="Project pressure metric">
      {(Object.keys(lenses) as Array<keyof typeof lenses>).map(key =>
        <button key={key} type="button" aria-pressed={lens === key} onClick={() => setLens(key)}>{key}</button>
      )}
    </div>
    <ul className="mi-pressure">{points.map(({ row, value }) => <li key={row.project.id}>
      <button type="button" className="mi-text-button" onClick={() => onOpen(row, path)}>{row.project.project_name}</button>
      <span className="mi-pressure-track" aria-hidden><i style={{ width: `${value / maximum * 100}%` }} /></span>
      <strong>{value}{unit}</strong>
    </li>)}</ul>
    {!points.length && <p className="mi-empty">No figures for this metric in the selected projects.</p>}
  </section>
}

export function PortfolioTimeline({ rows, today, onOpen }: { rows: ProjectPosition[]; today: string; onOpen: OpenProject }) {
  const events = rows.flatMap(row => row.timeline.map(event => ({ ...event, row })))
    .sort((a, b) => dayDifference(a.date, b.date))
  const overdue = events.filter(event => event.date < today)
  const upcoming = events.filter(event => event.date >= today)

  function eventList(items: typeof events) {
    return <ul className="mi-timeline">{items.map(event => {
      const projectName = event.row.project.project_name
      const deliveryName = event.packageName ? `${projectName} · ${event.packageName}` : projectName
      return <li key={`${event.row.project.id}:${event.id}`}>
        <div>
          <time dateTime={event.date}>{fullDate(event.date)}{event.date === today ? ' · Today' : ''}</time>
          {event.overdueDays != null && <small className="mi-timeline-overdue">{event.overdueDays} {event.overdueDays === 1 ? 'day' : 'days'} overdue</small>}
        </div>
        <div className="min-w-0">
          <button className="mi-text-button" type="button" onClick={() => onOpen(event.row, event.module)}
            aria-label={`${deliveryName}, ${event.title}`}>
            {deliveryName} <ArrowUpRight size={14} />
          </button>
          <small>{event.title}</small>
        </div>
      </li>
    })}</ul>
  }

  return <section id="timeline" className="mi-panel scroll-mt-6" aria-labelledby="timeline-heading">
    <div className="mi-section-heading">
      <div><h2 id="timeline-heading">Upcoming dates</h2><p>Package handovers, completion targets, milestones, approvals and procurement.</p></div>
      <CalendarDays aria-hidden />
    </div>
    {overdue.length > 0 && <section className="mb-4" aria-labelledby="timeline-overdue">
      <h3 id="timeline-overdue">Overdue package deliveries</h3>
      {eventList(overdue.slice(0, 4))}
      {overdue.length > 4 && <details className="mt-2">
        <summary className="mi-text-button cursor-pointer">Show {overdue.length - 4} more overdue</summary>
        {eventList(overdue.slice(4))}
      </details>}
    </section>}
    {overdue.length > 0 && upcoming.length > 0 && <h3>Coming up</h3>}
    {eventList(upcoming.slice(0, 12))}
    {upcoming.length > 12 && <details className="mt-2">
      <summary className="mi-text-button cursor-pointer">Show {upcoming.length - 12} more dates</summary>
      {eventList(upcoming.slice(12))}
    </details>}
    {!upcoming.length && <p className="mi-empty">No upcoming dates recorded in this selection.</p>}
  </section>
}

export function Boardroom({
  rows, workspace, openDecisions, onClose, onOpen,
}: { rows: ProjectPosition[]; workspace: string; openDecisions: number | null; onClose: () => void; onOpen: OpenProject }) {
  const counts = [
    { label: 'Projects', value: rows.length },
    { label: 'Off track', value: rows.filter(row => row.rating === 'Off track').length },
    { label: 'Behind programme', value: rows.filter(row => row.behind).length },
    { label: 'Past completion date', value: rows.filter(row => row.overdue).length },
    { label: 'Stalled', value: rows.filter(row => row.stalled).length },
    { label: 'Open decisions', value: openDecisions ?? '—' },
  ]
  return <div className="mi-boardroom">
    <header>
      <div><p>{workspace}</p><h1>Management Intelligence</h1></div>
      <button className="mi-back" type="button" onClick={onClose}><X size={16} /> Exit boardroom mode</button>
    </header>
    <div className="mi-boardroom-metrics">{counts.map(({ label, value }) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <section aria-labelledby="boardroom-delivery">
      <h2 id="boardroom-delivery">Project delivery</h2>
      <div className="mi-boardroom-projects">{rows.map(row => <article key={row.project.id}>
        <button type="button" onClick={() => onOpen(row)}>{row.project.project_name} <ArrowUpRight size={16} /></button>
        <p>{row.rating}{row.actual !== null ? ` · ${row.actual}% actual` : ''}{row.planned !== null ? ` / ${row.planned}% planned` : ''}</p>
        {row.overdueDays !== null && <p>{row.overdueDays} days past the completion target</p>}
        {row.variance !== null && row.variance > 0 && <p>{row.variance} days beyond the target in the {row.forecastBasis === 'Recorded forecast' ? 'recorded forecast' : 'recovery estimate'}</p>}
        <small>{row.primary?.text || row.updates[0]?.text || 'No recent update recorded.'}</small>
      </article>)}</div>
      {!rows.length && <p>No projects match these filters.</p>}
    </section>
  </div>
}
