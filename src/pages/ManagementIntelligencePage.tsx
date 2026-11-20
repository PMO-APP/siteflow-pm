import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, AlertCircle, PauseCircle, LayoutGrid, RefreshCw, Wallet } from 'lucide-react'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'
import { openProject } from '@/lib/openProject'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { useManagementAccess, useManagementData, type ManagementData } from '@/features/management/data'
import { isoDay, ratings, type ProjectPosition } from '@/features/management/model'
import ReportGallery from '@/features/management/ReportGallery'
import './ManagementIntelligencePage.css'

const tone = {
  'Off track': 'red', Watch: 'amber', 'On track / done': 'green', Unrated: 'slate', Withdrawn: 'slate',
}
const deliveryBands = ['Behind programme', 'Past completion date', 'Stalled'] as const
const bands = ['All projects', ...ratings, ...deliveryBands] as const
type Band = typeof bands[number]
const reasonColumns = ['Behind', 'Past date', 'Stalled']
const matchesBand = (row: ProjectPosition, band: Band) => {
  switch (band) {
    case 'All projects': return true
    case 'Behind programme': return row.behind
    case 'Past completion date': return row.overdue
    case 'Stalled': return row.stalled
    default: return row.rating === band
  }
}
const formatters = new Map<string, Intl.NumberFormat>()
const cash = (value: number | null, currency: string) => {
  if (value === null) return '—'
  if (!formatters.has(currency)) {
    try { formatters.set(currency, new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 })) }
    catch { return `${currency} ${value.toLocaleString('en-NG')}` }
  }
  return formatters.get(currency)!.format(value)
}
const percent = (n: number | null) => n === null ? '—' : `${n}%`
const signed = (n: number | null, unit: string) => n === null ? '—' : `${n > 0 ? '+' : ''}${n}${unit}`
const date = (value?: string | null) => isoDay(value)
  ? new Date(`${isoDay(value)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })
  : '—'

function Status({ row }: { row: ProjectPosition }) {
  return <span className="mi-status-list"><span className={`mi-tag ${tone[row.rating]}`}>{row.rating}</span>
    {row.behind && <span className="mi-tag amber">Behind programme</span>}
    {row.overdue && <span className="mi-tag red">Past completion date</span>}
    {row.stalled && <span className="mi-tag red"><PauseCircle size={13} aria-hidden />Stalled</span>}</span>
}

function Portfolio({ data, includeFinance }: { data: ManagementData; includeFinance: boolean }) {
  const navigate = useNavigate()
  const [portfolio, setPortfolio] = useState('')
  const [project, setProject] = useState('')
  const [band, setBand] = useState<Band>('All projects')
  const scope = useMemo(() => data.rows
    .filter(row => (!portfolio || String(row.project.portfolio_id ?? 'none') === portfolio) && (!project || String(row.project.id) === project))
    .sort((a, b) => ratings.indexOf(a.rating) - ratings.indexOf(b.rating) || Number(b.stalled) - Number(a.stalled) || (a.project.project_name || '').localeCompare(b.project.project_name || '')), [data.rows, portfolio, project])
  const rows = useMemo(() => scope.filter(row => matchesBand(row, band)), [scope, band])
  const counts = Object.fromEntries(bands.map(name => [name, scope.filter(row => matchesBand(row, name)).length])) as Record<Band, number>
  const categories = new Map<string, number[]>()
  for (const row of scope) {
    const key = row.primary?.category || 'Reason unrecorded'
    deliveryBands.forEach((name, index) => {
      if (!matchesBand(row, name)) return
      const totals = categories.get(key) ?? deliveryBands.map(() => 0)
      totals[index] += 1
      categories.set(key, totals)
    })
  }
  const reasonCounts = [...categories].sort(([a], [b]) => a.localeCompare(b))
  const attention = rows.filter(row => row.behind || row.overdue || row.stalled || row.rating === 'Off track' || row.constraints.length > 0)
  const tiles: { label: string; key: Band; css: string }[] = [
    { label: 'Projects', key: 'All projects', css: 'navy' },
    { label: 'Off track', key: 'Off track', css: 'red' },
    { label: 'Watch', key: 'Watch', css: 'amber' },
    { label: 'On track / done', key: 'On track / done', css: 'green' },
    { label: 'Behind programme', key: 'Behind programme', css: 'amber' },
    { label: 'Past completion date', key: 'Past completion date', css: 'red' },
    { label: 'Stalled', key: 'Stalled', css: 'red' },
  ]
  function open(row: ProjectPosition, destination = '/app') {
    openProject(navigate, row.project, destination)
  }

  return <>
    <div className="mi-filter-bar">
      <label>Portfolio<select value={portfolio} onChange={e => { setPortfolio(e.target.value); setProject(''); setBand('All projects') }}>
        <option value="">All portfolios</option>
        {[...data.portfolioNames].sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        {data.rows.some(r => r.project.portfolio_id == null) && <option value="none">Unassigned</option>}
      </select></label>
      <label>Project<select value={project} onChange={e => { setProject(e.target.value); setBand('All projects') }}>
        <option value="">All projects</option>
        {data.rows.filter(row => !portfolio || String(row.project.portfolio_id ?? 'none') === portfolio)
          .sort((a, b) => a.project.project_name.localeCompare(b.project.project_name))
          .map(row => <option key={row.project.id} value={row.project.id}>{row.project.project_name}</option>)}
      </select></label>
      <nav aria-label="Page sections">
        <a href="#constraints">Constraints</a><a href="#delivery">Delivery</a>
        {includeFinance && <a href="#commercial">Cost and progress</a>}<a href="#visual-updates">Photos</a>
      </nav>
    </div>
    {data.incomplete && <p className="mi-notice" role="status"><AlertCircle size={18} aria-hidden />Some records are unavailable. Blank figures indicate missing information.</p>}
    <section aria-label="Portfolio health" className="mi-metrics">
      {tiles.map(({ label, key, css }) => <button key={key} type="button" aria-pressed={band === key} className={`mi-metric ${css}`} onClick={() => setBand(key)}>
        <span>{label}</span><strong>{counts[key]}</strong>
      </button>)}
    </section>
    <section className="mi-panel mi-split" aria-label="Portfolio overview">
      <div>
        <h2>Portfolio overview</h2>
        {scope.length ? <>
          <p className="mi-headline">{counts['Off track']} of {scope.length} projects off track.</p>
          <div className="mi-health-bar" role="img" aria-label={ratings.map(rating => `${counts[rating]} ${rating.toLowerCase()}`).join(', ')}>
            {ratings.map(rating => counts[rating] > 0 && <span key={rating} className={tone[rating]} style={{ flexGrow: counts[rating] }} />)}
          </div>
          <div className="mi-legend">{ratings.filter(r => counts[r] > 0).map(r => <span key={r}><i className={tone[r]} />{r} {counts[r]}</span>)}</div>
        </> : <p className="mi-empty">No projects in this selection.</p>}
      </div>
      <div>
        <h2>Recorded delivery reasons</h2>
        {reasonCounts.length ? <>
          <table className="mi-table mi-reason-table">
            <thead><tr><th scope="col">Primary reason</th>{reasonColumns.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>{reasonCounts.map(([reason, totals]) => <tr key={reason}>
              <th scope="row">{reason}</th>
              {totals.map((count, i) => <td key={deliveryBands[i]}>{count}</td>)}
            </tr>)}</tbody>
          </table>
          <p className="mi-footnote">A project can appear in more than one column.</p>
        </> : <p className="mi-empty">No behind, past-due or stalled projects in this selection.</p>}
      </div>
    </section>
    <section id="constraints" className="mi-panel scroll-mt-6" aria-labelledby="constraints-heading">
      <div className="mi-section-heading">
        <div><h2 id="constraints-heading">Management attention</h2><p>Delivery delays, recorded reasons and related open issues.</p></div>
        <AlertCircle aria-hidden />
      </div>
      {attention.length ? <div className="mi-attention">
        {attention.map(row => {
          const reasons = row.constraints.filter(item => item.reason)
          const related = row.constraints.filter(item => !item.reason)
          const deliveryAlert = row.behind || row.overdue || row.stalled
          const facts = [
            row.overdueDays !== null && `${row.overdueDays} ${row.overdueDays === 1 ? 'day' : 'days'} past ${date(row.target)}`,
            row.behind && (row.actual !== null && row.planned !== null && (row.progressGap ?? 0) < 0
              ? `${row.actual}% actual vs ${row.planned}% planned` : 'Reported behind programme'),
            row.primary?.text || (deliveryAlert ? 'Reason unrecorded' : related[0]?.text || 'Review delivery forecast'),
          ].filter(Boolean)
          const describe = (item: ProjectPosition['constraints'][number]) => <li key={`${item.category}:${item.text}`}>
            <strong>{item.category}</strong> · {item.text}
            {(item.source || item.recordedOn) && <small>{[item.source, item.recordedOn && date(item.recordedOn)].filter(Boolean).join(' · ')}</small>}
            {(item.owner || item.due || item.action) && <small>{[item.owner, isoDay(item.due) && `Due ${date(item.due)}`, item.action].filter(Boolean).join(' · ')}</small>}
          </li>
          return <details key={row.project.id}>
            <summary>
              <span><strong>{row.project.project_name}</strong><Status row={row} /></span>
              <span>{facts.join(' · ')}</span>
            </summary>
            <div className="mi-attention-detail">
              {reasons.length > 0 && <div><h3>Recorded reasons</h3><ul>{reasons.map(describe)}</ul></div>}
              {related.length > 0 && <div><h3>Related open issues</h3><ul>{related.map(describe)}</ul></div>}
              {!row.primary?.owner && row.project.overall_owner_email && <p>Project contact {row.project.overall_owner_email}</p>}
              <button className="mi-text-button" onClick={() => open(row)}>Open project <ArrowUpRight size={16} /></button>
            </div>
          </details>
        })}
      </div> : <p className="mi-empty">No intervention items recorded for these projects.</p>}
    </section>
    <section id="delivery" className="mi-panel scroll-mt-6" aria-labelledby="delivery-heading">
      <div className="mi-section-heading">
        <div><h2 id="delivery-heading">Project delivery</h2><p>Progress, latest updates and handover outlook.</p></div>
        <LayoutGrid aria-hidden />
      </div>
      <div className="mi-chips" role="group" aria-label="Filter by project status">
        {bands.filter(key => counts[key] > 0 || key === 'All projects' || band === key).map(key =>
          <button key={key} type="button" aria-pressed={band === key} onClick={() => setBand(key)}>{key} <span>{counts[key]}</span></button>)}
      </div>
      <div className="mi-table-scroll" tabIndex={0} aria-label="Project delivery table" role="region">
        <table className="mi-table mi-delivery-table">
          <thead><tr><th scope="col">Project</th><th scope="col">Delivery status</th><th scope="col">Latest update</th><th scope="col">Physical / planned</th><th scope="col">Target / forecast</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.project.id}>
            <th scope="row"><button className="mi-text-button" onClick={() => open(row)}>{row.project.project_name} <ArrowUpRight size={14} /></button><small>{row.project.phase || 'Stage unrecorded'}</small></th>
            <td><Status row={row} /></td>
            <td className="mi-update">
              {row.updates[0]?.text || row.primary?.text || '—'}
              {row.updates[0]?.date && <small>{date(row.updates[0].date)}</small>}
              {row.updates.length > 1 && <details className="mt-2">
                <summary className="mi-text-button cursor-pointer">More updates</summary>
                <ul>{row.updates.slice(1).map(update => <li className="mt-2" key={update.key}>{update.text}<small>{date(update.date)}</small></li>)}</ul>
              </details>}
            </td>
            <td><strong>{percent(row.actual)}</strong> / {percent(row.planned)}{row.progressGap !== null && <small className={row.progressGap < 0 ? 'mi-negative' : ''}>{signed(row.progressGap, ' pp')}</small>}</td>
            <td>{date(row.target)}{row.overdueDays !== null && <span className="mi-negative"> · {row.overdueDays}d past</span>}<small>
              {row.forecast ? <>{date(row.forecast)} {row.variance !== null ? `(${signed(row.variance, 'd')})` : ''}</>
                : <button className="mi-text-button" onClick={() => open(row, '/app/recovery')}>Forecast unverified <ArrowUpRight size={13} /></button>}
            </small></td>
          </tr>)}</tbody>
        </table>
      </div>
      {!rows.length && <p className="mi-empty">No projects match these filters.</p>}
    </section>
    {includeFinance && <section id="commercial" className="mi-panel scroll-mt-6" aria-labelledby="commercial-heading">
      <div className="mi-section-heading">
        <div><h2 id="commercial-heading">Cost and progress</h2><p>Compare cash paid with site progress, and see how approved cost has moved.</p></div>
        <Wallet aria-hidden />
      </div>
      <div className="mi-table-scroll" tabIndex={0} aria-label="Cost and progress table" role="region">
        <table className="mi-table mi-cost-table">
          <thead><tr><th scope="col">Project / cost basis</th><th scope="col">Initial cost</th><th scope="col">Current approved cost</th><th scope="col">Change</th><th scope="col">Certified work</th><th scope="col">Paid</th><th scope="col">Paid / physical</th><th scope="col">Gap</th><th scope="col">Approved variations</th><th scope="col">Outstanding payments</th><th scope="col">Cost to complete</th></tr></thead>
          <tbody>{rows.map(row => {
            const money = row.commercial
            if (!money) return null
            return <tr key={row.project.id}>
              <th scope="row"><button className="mi-text-button" onClick={() => open(row, '/app/costing')}>{row.project.project_name} <ArrowUpRight size={14} /></button>
                <small>{money.conflict ? 'Multiple currencies' : money.basis}</small></th>
              <td>{cash(money.initial, money.currency)}</td>
              <td>{cash(money.current, money.currency)}</td>
              <td className={money.growth !== null && money.growth > 0 ? 'mi-emphasis' : ''}>{signed(money.growth, '%')}</td>
              <td>{cash(money.certified, money.currency)}</td>
              <td>{cash(money.paid, money.currency)}</td>
              <td><strong>{percent(money.paidPct)}</strong> / {percent(row.actual)}
                {money.paidPct !== null && row.actual !== null && <div className="mi-progress-pair" aria-hidden>
                  <i style={{ width: `${Math.min(100, Math.max(0, money.paidPct))}%` }} />
                  <i style={{ width: `${row.actual}%` }} />
                </div>}
              </td>
              <td className={money.gap !== null && money.gap > 0 ? 'mi-emphasis' : ''}>{signed(money.gap, ' pp')}</td>
              <td>{cash(money.approvedChanges, money.currency)}</td>
              <td>{cash(money.outstanding, money.currency)}</td>
              <td>{cash(money.costToComplete, money.currency)}</td>
            </tr>
          })}</tbody>
        </table>
      </div>
      <p className="mi-footnote">Positive gap means payments run ahead of recorded physical progress. Review the payment terms and any advances when assessing the gap.</p>
    </section>}
    <ReportGallery rows={rows} photos={data.photos} onDocuments={row => open(row, '/app/documents')} />
  </>
}

export default function ManagementIntelligencePage() {
  const access = useManagementAccess()
  const query = useManagementData(access)
  const { activeWorkspace } = useWorkspace()
  if (access.loading) return <p className="p-8 text-sm text-slate-600">Checking workspace access…</p>
  if (!access.permitted) return <Navigate to="/projects" replace />
  return <div className="mi-page">
    <header className="mi-header">
      <div className="mi-wrap"><Link to="/projects" className="mi-brand" aria-label="PMOCorex workspace home"><PMOCorexLogo size={32} /></Link>
        <Link to="/projects" className="mi-back"><ArrowLeft size={16} /> Workspace home</Link></div>
    </header>
    <main className="mi-wrap mi-main">
      <div className="mi-hero">
        <div><div className="mi-workspace">{activeWorkspace?.name || 'Workspace'}</div>
          <h1>Management Intelligence</h1><p>Portfolio delivery, cost and decisions in one view.</p></div>
        <div className="mi-refresh">
          {query.dataUpdatedAt > 0 && <span>Refreshed {new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', hour: 'numeric', minute: '2-digit' }).format(query.dataUpdatedAt)}</span>}
          <button type="button" className="mi-back" onClick={() => void query.refetch()} disabled={query.isFetching}>
            <RefreshCw size={16} className={query.isFetching ? 'motion-safe:animate-spin' : ''} />{query.isFetching ? 'Updating…' : 'Refresh'}
          </button>
        </div>
      </div>
      {query.isPending && <p className="mi-empty" role="status">Loading portfolio information…</p>}
      {query.isError && <p className="mi-notice" role="alert"><AlertCircle size={18} aria-hidden />Could not refresh the portfolio. {query.data ? 'Showing the last available position.' : 'Try refreshing again.'}</p>}
      {query.data && <Portfolio key={access.workspaceId} data={query.data} includeFinance={access.includeFinance} />}
    </main>
  </div>
}
