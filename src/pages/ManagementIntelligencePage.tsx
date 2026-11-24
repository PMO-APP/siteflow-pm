import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, AlertCircle, PauseCircle, LayoutGrid, RefreshCw, Wallet, Expand, Plus } from 'lucide-react'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'
import { openProject } from '@/lib/openProject'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { useManagementAccess, useManagementData, type ManagementData } from '@/features/management/data'
import { isoDay, ratings, type ProjectPosition } from '@/features/management/model'
import { useAuthStore } from '@/store/auth'
import { Boardroom, PortfolioTimeline, PortfolioTrend, ProjectPressure } from '@/features/management/PortfolioVisuals'
import { ManagementActions, ManagementActionDrawer, type ActionDraft } from '@/features/management/ManagementActions'
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

function Portfolio({
  data, includeFinance, canManage, workspaceId, workspaceName, boardroom, exitBoardroom, refresh,
}: {
  data: ManagementData; includeFinance: boolean; canManage: boolean; workspaceId: string; workspaceName: string
  boardroom: boolean; exitBoardroom: () => void; refresh: () => Promise<unknown>
}) {
  const navigate = useNavigate()
  const [portfolio, setPortfolio] = useState('')
  const [project, setProject] = useState('')
  const [band, setBand] = useState<Band>('All projects')
  const [draft, setDraft] = useState<ActionDraft | null>(null)
  const [actionMessage, setActionMessage] = useState('')
  const author = useAuthStore(state => state.user?.full_name || state.user?.email || 'Management')
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
  const attention = rows.filter(row => row.behind || row.overdue || row.stalled || row.rating === 'Off track' || row.constraints.length > 0 || (row.maximumActivityDelay ?? 0) > 0)
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || Number(b.stalled) - Number(a.stalled) ||
      Math.max(b.variance ?? 0, 0) - Math.max(a.variance ?? 0, 0) ||
      (b.overdueDays ?? 0) - (a.overdueDays ?? 0) || (b.maximumActivityDelay ?? 0) - (a.maximumActivityDelay ?? 0))
  const selectedIds = new Set(rows.map(row => Number(row.project.id)))
  const wholeWorkspace = !project && !portfolio && band === 'All projects'
  const actions = data.actions?.filter(item => item.projectId == null ? wholeWorkspace : selectedIds.has(item.projectId)) ?? null
  const decisions = data.decisions?.filter(item => item.project_id == null
    ? wholeWorkspace || (!project && !!portfolio && String(item.portfolio_id) === portfolio)
    : selectedIds.has(Number(item.project_id))) ?? null
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

  if (boardroom) return <Boardroom rows={rows} workspace={workspaceName} onClose={exitBoardroom} onOpen={open}
    openDecisions={decisions?.filter(item => !['completed', 'cancelled', 'canceled', 'closed'].includes((item.status || '').toLowerCase())).length ?? null} />

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
        {includeFinance && <a href="#commercial">Cost and progress</a>}
        <a href="#trends">Trends</a><a href="#actions">Actions</a><a href="#visual-updates">Site Photos</a>
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
          const deliveryAlert = row.behind || row.overdue || row.stalled || (row.maximumActivityDelay ?? 0) > 0
          const facts = [
            row.overdueDays !== null && `${row.overdueDays} ${row.overdueDays === 1 ? 'day' : 'days'} past ${date(row.target)}`,
            row.behind && (row.actual !== null && row.planned !== null && (row.progressGap ?? 0) < 0
              ? `${row.actual}% actual vs ${row.planned}% planned` : 'Reported behind programme'),
            row.variance !== null && row.variance > 0 && `${row.variance}d beyond target in the ${row.forecastBasis === 'Recorded forecast' ? 'recorded forecast' : 'recovery estimate'}`,
            row.overdueActivities !== null && row.overdueActivities > 0 && `${row.overdueActivities} overdue ${row.overdueActivities === 1 ? 'activity' : 'activities'} · longest ${row.maximumActivityDelay}d`,
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
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <button className="mi-text-button" onClick={() => open(row)}>Open project <ArrowUpRight size={16} /></button>
                {canManage && <button type="button" className="mi-text-button" onClick={() => setDraft({ projectId: String(row.project.id), title: row.primary?.text })}>
                  <Plus size={16} /> Assign action
                </button>}
              </div>
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
          <thead><tr><th scope="col">Project</th><th scope="col">Delivery status</th><th scope="col">Latest update</th><th scope="col">Actual / planned</th><th scope="col">Activity delay</th><th scope="col">Target / forecast</th></tr></thead>
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
            <td><strong>{percent(row.actual)}</strong> / {percent(row.planned)}{row.progressGap !== null && <small className={row.progressGap < 0 ? 'mi-negative' : ''}>{signed(row.progressGap, ' pp')}</small>}<small>{row.basis}</small></td>
            <td>{row.maximumActivityDelay === null ? '—' : <>
              <strong>{row.maximumActivityDelay}d max</strong>
              <small>{row.overdueActivities} overdue · {row.scheduleSeverity}</small>{row.lateStarts > 0 && <small>{row.lateStarts} late starts</small>}
            </>}</td>
            <td>{date(row.target)}{row.overdueDays !== null && <span className="mi-negative"> · {row.overdueDays}d past</span>}<div className="mi-forecast">
              {row.complete ? 'Complete' : row.forecast ? <>
                {date(row.forecast)} {row.variance !== null ? `(${signed(row.variance, 'd')})` : ''}
                <small>{row.forecastBasis === 'Recovery Forecast' ? 'Recovery estimate' : row.forecastBasis}</small>
              </> : row.active && row.target ? <button className="mi-text-button" onClick={() => open(row, '/app/recovery')}>
                Forecast unverified <ArrowUpRight size={13} />
              </button> : '—'}
            </div></td>
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
          <thead><tr><th scope="col">Project / cost basis</th><th scope="col">Initial cost</th><th scope="col">Current approved cost</th><th scope="col">Change</th><th scope="col">Certified work</th><th scope="col">Paid</th><th scope="col">Paid / schedule progress</th><th scope="col">Gap</th><th scope="col">Approved variations</th><th scope="col">Outstanding payments</th><th scope="col">Cost to complete</th></tr></thead>
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
      <p className="mi-footnote">Positive gap means payments run ahead of recorded schedule progress (not verified physical delivery). Review the payment terms and any advances when assessing the gap.</p>
    </section>}
    <PortfolioTrend rows={rows} />
    <div className="mi-visual-grid">
      <ProjectPressure rows={rows} onOpen={open} />
      <PortfolioTimeline rows={rows} today={data.today} onOpen={open} />
    </div>
    {actionMessage && <p className="mi-notice" role="status">{actionMessage}</p>}
    <ManagementActions actions={actions} decisions={decisions} projects={data.rows.map(row => row.project)}
      canManage={canManage} onCreate={() => setDraft({ projectId: project })} onRefresh={refresh} />
    <ReportGallery rows={rows} photos={data.photos} historyReports={data.historyReports} historyDesignPhotos={data.historyDesignPhotos} />
    {draft && canManage && <ManagementActionDrawer workspaceId={workspaceId} projects={rows.map(row => row.project)}
      draft={draft} createdByName={author} onClose={() => setDraft(null)} onSaved={notificationError => {
        setDraft(null)
        setActionMessage(notificationError ? 'Action saved. PMOCorex could not send the notifications.' : 'Management action issued.')
        void refresh()
      }} />}

  </>
}

export default function ManagementIntelligencePage() {
  const access = useManagementAccess()
  const query = useManagementData(access)
  const { activeWorkspace } = useWorkspace()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const boardroom = search.get('mode') === 'boardroom'
  const workspaceName = activeWorkspace?.name || 'Workspace'
  const toggleBoardroom = () => {
    const params = new URLSearchParams(search)
    if (boardroom) params.delete('mode')
    else params.set('mode', 'boardroom')
    navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true, preventScrollReset: true })
  }
  if (access.loading) return <p className="p-8 text-sm text-slate-600">Checking workspace access…</p>
  if (!access.permitted) return <Navigate to="/projects" replace />
  return <div className="mi-page">
    <header className="mi-header">
      <div className="mi-wrap"><Link to="/projects" className="mi-brand" aria-label="PMOCorex workspace home"><PMOCorexLogo size={32} /></Link>
        <Link to="/projects" className="mi-back"><ArrowLeft size={16} /> Workspace home</Link></div>
    </header>
    <main className="mi-wrap mi-main">
      <div className="mi-hero">
        <div><div className="mi-workspace">{workspaceName}</div>
          <h1>Management Intelligence</h1><p>Portfolio delivery, cost and decisions in one view.</p></div>
        <div className="mi-refresh">
          {query.dataUpdatedAt > 0 && <span>Refreshed {new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', hour: 'numeric', minute: '2-digit' }).format(query.dataUpdatedAt)}</span>}
          <div className="mi-hero-buttons">
            <button type="button" className="mi-back" onClick={() => void query.refetch()} disabled={query.isFetching}>
              <RefreshCw size={16} className={query.isFetching ? 'motion-safe:animate-spin' : ''} />{query.isFetching ? 'Updating…' : 'Refresh'}
            </button>
            {query.data && <button type="button" className="mi-back" onClick={toggleBoardroom}><Expand size={16} /> Boardroom mode</button>}
          </div>
        </div>
      </div>
      {query.isPending && <p className="mi-empty" role="status">Loading portfolio information…</p>}
      {query.isError && <p className="mi-notice" role="alert"><AlertCircle size={18} aria-hidden />Could not refresh the portfolio. {query.data ? 'Showing the last available position.' : 'Try refreshing again.'}</p>}
      {query.data && <Portfolio key={access.workspaceId} data={query.data} includeFinance={access.includeFinance}
        canManage={access.canManage} workspaceId={access.workspaceId!} workspaceName={workspaceName} boardroom={boardroom}
        exitBoardroom={toggleBoardroom} refresh={() => query.refetch()} />}
    </main>
  </div>
}
