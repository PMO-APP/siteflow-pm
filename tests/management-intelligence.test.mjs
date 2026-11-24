import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'

const compiled = await build({
  entryPoints: ['src/features/management/model.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
})
const { portfolioProgress, projectPosition } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)

const day = '2026-11-20'
const project = { id: 1, project_name: 'Example', status: 'Active', handover_date: '2026-12-31' }
const empty = {
  tasks: [], reports: [], revisions: [], finance: [], payments: [], contracts: [], variations: [],
  design: [], costNotes: [], approvals: [], procurement: [], risks: [], documents: [],
}
const entry = { id: 'a', project_id: 1 }

test('confirmed disbursement, approved budget movement and the paid/physical gap are distinct', () => {
  const row = projectPosition({ ...project, initial_budget: 100, approved_budget: 125 }, {
    ...empty,
    tasks: [{ ...entry, progress_pct: 50 }],
    finance: [
      { ...entry, type: 'Payment', amount: 100, status: 'Paid' },
      { ...entry, type: 'Payment', amount: 15, status: 'Approved' },
      { ...entry, type: 'Valuation', amount: 90, status: 'Certified' },
    ],
    payments: [{ ...entry, amount: 100, payment_status: 'Paid' }],
  }, day, true)
  assert.equal(row.commercial.paid, 100)
  assert.equal(row.commercial.outstanding, 15)
  assert.equal(row.commercial.certified, 90)
  assert.equal(row.commercial.paidPct, 80)
  assert.equal(row.commercial.gap, 30)
  assert.equal(row.commercial.growth, 25)
})

test('contract values are a labelled fallback and only approved variations change the comparison', () => {
  const row = projectPosition(project, {
    ...empty,
    contracts: [{ ...entry, contract_value: 100, status: 'Active' }],
    variations: [
      { ...entry, amount: 25, status: 'Approved' },
      { ...entry, amount: 75, status: 'Pending' },
    ],
  }, day, true)
  assert.equal(row.commercial.basis, 'Contract value')
  assert.equal(row.commercial.current, 125)
  assert.equal(row.commercial.paid, null)
  assert.equal(row.forecast, null)
})

test('a recent stalled report can identify funding, while an outstanding payment alone cannot', () => {
  const data = { ...empty, payments: [{ ...entry, due_date: '2026-11-01', amount: 100, payment_status: 'Pending', payment_title: 'Valuation' }] }
  const unconfirmed = projectPosition({ ...project, status: 'Stuck' }, data, day, true)
  assert.equal(unconfirmed.stalled, true)
  assert.equal(unconfirmed.primary, undefined)
  const reported = projectPosition(project, {
    ...data,
    reports: [{ ...entry, report_date: day, status: 'Stuck', status_summary: 'Work is stalled for funding.' }],
  }, day, true)
  assert.equal(reported.stalled, true)
  assert.equal(reported.primary.category, 'Funding / payment')
  assert.equal(reported.rating, 'Off track')
})

test('later task updates and a newer scoped report supersede older progress and constraints', () => {
  const row = projectPosition(project, {
    ...empty,
    tasks: [{ ...entry, updated_at: `${day}T08:00:00Z`, progress_pct: 80, start_date: '2026-11-01', finish_date: '2026-12-31' }],
    reports: [
      { ...entry, discipline: 'Housebuild', report_date: '2026-11-17', status: 'Stuck', pending_issues: 'Work is stalled for funding.' },
      { ...entry, id: 'b', discipline: 'Housebuild', report_date: '2026-11-19', status: 'On Track', snapshot_actual_progress: 50 },
    ],
  }, day, true)
  assert.equal(row.actual, 80)
  assert.equal(row.stalled, false)
  assert.equal(row.constraints.length, 0)
  assert.deepEqual(row.sitePhotos.reportIds, ['b'])
})

test('missing evidence never becomes a zero, an on-track rating or a forecast date', () => {
  const row = projectPosition(project, empty, day, true)
  assert.equal(row.actual, null)
  assert.equal(row.rating, 'Unrated')
  assert.equal(row.commercial.growth, null)
  assert.equal(row.forecast, null)
  assert.equal(row.target, '2026-12-31')
})

test('actual progress below plan marks an unfinished project behind before its target', () => {
  const row = projectPosition(project, {
    ...empty,
    tasks: [{ ...entry, start_date: '2026-11-01', finish_date: '2026-12-01', progress_pct: 20 }],
  }, day, true)
  assert.equal(row.behind, true)
  assert.equal(row.overdue, false)
  assert.ok(row.progressGap < 0)
})

test('the active project programme target takes precedence and projects can be behind and past date', () => {
  const row = projectPosition(project, {
    ...empty,
    revisions: [{ ...entry, current_finish: '2026-11-10', forecast_finish: '2026-12-20' }],
    tasks: [{ ...entry, start_date: '2026-11-01', finish_date: '2026-11-10', progress_pct: 70 }],
  }, day, true)
  assert.equal(row.behind, true)
  assert.equal(row.overdueDays, 10)
  assert.equal(row.target, '2026-11-10')
})

test('completion dates due today, completed projects and withdrawals do not count as past date', () => {
  assert.equal(projectPosition({ ...project, handover_date: day }, empty, day, true).overdue, false)
  const data = { ...empty, tasks: [{ ...entry, status: 'Not Started', start_date: '2026-10-01', finish_date: '2026-11-01' }] }
  for (const status of ['Completed', 'Withdrawn']) {
    const row = projectPosition({ ...project, handover_date: '2026-11-01', status }, data, day, true)
    assert.equal(row.overdue, false)
    assert.equal(row.behind, false)
  }
  const row = projectPosition({ ...project, handover_date: '2026-11-01', actual_completion_date: '2026-11-05' }, data, day, true)
  assert.equal(row.overdue, false)
})

test('one small unfinished activity can leave a project past date when progress rounds to 100%', () => {
  const row = projectPosition({ ...project, handover_date: '2026-11-01' }, {
    ...empty,
    tasks: [
      { ...entry, progress_pct: 100, weight_pct: 99.9 },
      { ...entry, id: 'small', progress_pct: 0, weight_pct: 0.1 },
    ],
  }, day, true)
  assert.equal(row.actual, 100)
  assert.equal(row.overdueDays, 19)
})

test('a recent project-wide behind report is used when a comparable progress gap is unavailable', () => {
  const data = {
    ...empty,
    reports: [{ ...entry, report_date: day, status: 'Behind', status_summary: 'No work due to late delivery of materials.' }],
  }
  const row = projectPosition(project, data, day, true)
  assert.equal(row.behind, true)
  assert.equal(row.progressGap, null)
  assert.equal(row.primary.category, 'Procurement')
  assert.equal(row.primary.recordedOn, day)
  const packageOnly = projectPosition(project, {
    ...data,
    reports: data.reports.map(report => ({ ...report, package_name: 'Package B' })),
  }, day, true)
  assert.equal(packageOnly.behind, false)
})

test('Project Controls provides reasons, while unrelated open procurement stays an issue', () => {
  const row = projectPosition({ ...project, handover_date: '2026-11-01' }, {
    ...empty,
    tasks: [
      { ...entry, name: 'Road drainage', progress_pct: 35, delay_reason: 'Awaiting approved drawings', responsible: 'Site lead' },
      { ...entry, id: 'closed', name: 'Excavation', status: 'Completed', delay_reason: 'Earlier mobilisation delay' },
    ],
    reports: [{ ...entry, report_date: day, pending_issues: 'No delay due to procurement.' }],
    procurement: [{ ...entry, name: 'Unlinked order', required_on_site: '2026-11-01', status: 'Pending' }],
  }, day, true)
  assert.equal(row.primary.source, 'Project Controls · Road drainage')
  assert.equal(row.primary.owner, 'Site lead')
  assert.equal(row.constraints.filter(item => item.reason).length, 1)
  assert.ok(row.constraints.some(item => item.text === 'Unlinked order' && !item.reason))
})


test('programme days, activity days and estimated completion use the current plan independently', () => {
  const data = {
    ...empty,
    revisions: [{ ...entry, current_finish: '2026-11-24', programme_activities: [
      { task_number: 1, name: 'Road drainage', start_date: '2026-11-11', finish_date: '2026-11-12' },
      { task_number: 2, name: 'Water main', start_date: '2026-11-22', finish_date: '2026-11-24' },
    ] }],
    tasks: [
      { ...entry, id: 'drain', task_number: 1, name: 'Road drainage', progress_pct: 50, start_date: '2026-05-01', finish_date: '2026-05-10' },
      { ...entry, id: 'main', task_number: 2, name: 'Water main', progress_pct: 0, start_date: '2026-11-22', finish_date: '2026-11-24', predecessor_ids: ['drain'] },
      { ...entry, id: 'completed', task_number: 3, name: 'Survey', status: 'Completed', start_date: '2026-09-01', finish_date: '2026-09-04' },
      { ...entry, id: 'removed', task_number: 4, name: 'Temporary works', status: 'Cancelled', start_date: '2026-09-01', finish_date: '2026-09-04' },
    ],
  }
  const onDate = projectPosition(project, data, day, true)
  assert.equal(onDate.maximumActivityDelay, 8)
  assert.equal(onDate.overdueActivities, 1)
  assert.equal(onDate.scheduleSeverity, 'Watch')
  assert.equal(onDate.forecast, '2026-11-24')
  assert.equal(onDate.variance, 0)
  assert.equal(onDate.overdue, false)

  const later = projectPosition(project, data, '2026-11-23', true)
  assert.equal(later.maximumActivityDelay, 11)
  assert.equal(later.variance, 2)
  assert.equal(later.forecastBasis, 'Recovery Forecast')
  assert.equal(later.overdue, false)
})

test('an unmatched active programme keeps the live forecast and activity delay unverified', () => {
  const row = projectPosition(project, {
    ...empty,
    revisions: [{ ...entry, current_finish: '2026-12-31' }],
    tasks: [{ ...entry, progress_pct: 40, start_date: '2026-10-01', finish_date: '2026-11-10' }],
  }, day, true)
  assert.equal(row.target, '2026-12-31')
  assert.equal(row.maximumActivityDelay, null)
  assert.equal(row.forecast, null)
  assert.equal(row.planned, null)
})

test('missing paid amounts remain blank while an explicitly recorded zero is retained', () => {
  const budget = { ...project, approved_budget: 1000 }
  const pending = { ...entry, type: 'Payment', status: 'Approved', amount: 120 }
  const paid = { ...entry, id: 'p', type: 'Payment', status: 'Paid', amount: 0 }
  assert.equal(projectPosition(budget, { ...empty, finance: [pending] }, day, true).commercial.paidPct, null)
  assert.equal(projectPosition(budget, { ...empty, finance: [pending, paid] }, day, true).commercial.paidPct, 0)
})

test('the progress chart pairs reports by date across the same projects', () => {
  const point = (report_date, actual, planned) => ({ ...entry, id: report_date, report_date, snapshot_actual_progress: actual, snapshot_planned_progress: planned })
  const first = projectPosition(project, { ...empty, reports: [
    point('2026-11-06', 40, 50), point('2026-11-13', 50, 60), point('2026-11-20', 65, 70),
  ] }, day, false)
  const second = projectPosition({ ...project, id: 2 }, { ...empty, reports: [
    point('2026-11-06', 20, 30), point('2026-11-13', 28, 40),
    { ...point('2026-11-20', 90, 100), package_name: 'Package A' },
  ] }, day, false)
  const missing = projectPosition({ ...project, id: 3 }, empty, day, false)
  assert.deepEqual(portfolioProgress([first, second, missing]), [
    { date: '2026-11-06', actual: 30, planned: 40, coverage: 2 },
    { date: '2026-11-13', actual: 39, planned: 50, coverage: 2 },
  ])
})

test('preconstruction can surface upcoming tenders and approvals with incomplete cost and programme data', () => {
  const upcoming = projectPosition({ id: 2, project_name: 'Design stage', status: 'Planning' }, {
    ...empty,
    milestones: [{ ...entry, name: 'No planned date', created_at: '2026-11-21T10:00:00Z' }],
    procurement: [{ ...entry, name: 'Tender issue', status: 'Pending', required_on_site: '2026-11-25' }],
    approvals: [
      { ...entry, title: 'Design review', status: 'Submitted', deadline: '2026-11-24' },
      { ...entry, id: 'closed', title: 'Already approved', status: 'Approved', deadline: '2026-11-28' },
      { ...entry, id: 'past', title: 'Old approval', status: 'Pending', deadline: '2026-11-15' },
    ],
  }, day, true)
  assert.equal(upcoming.commercial.paidPct, null)
  assert.equal(upcoming.actual, null)
  assert.equal(upcoming.maximumActivityDelay, null)
  assert.equal(upcoming.overdue, false)
  assert.deepEqual(upcoming.timeline.map(item => item.title), ['Design review', 'Tender issue'])
})

test('identical delivery dates stay separate for distinct packages while duplicate milestones collapse', () => {
  const parkVillas = { ...project, project_name: 'Park Villas', handover_date: '2026-12-31' }
  const row = projectPosition(parkVillas, {
    ...empty,
    packages: [
      { ...entry, id: 'b9', name: 'Blocks B9–B12 & B14', planned_finish: '2026-12-31' },
      { ...entry, id: 'b13', name: 'Block B13', planned_finish: '2026-12-31' },
    ],
    tasks: [
      { ...entry, id: 'h9', name: 'Handover', delivery_package_id: 'b9', is_milestone: true, finish_date: '2026-12-31', progress_pct: 0 },
      { ...entry, id: 'h13', name: 'Handover', delivery_package_id: 'b13', is_milestone: true, finish_date: '2026-12-31', progress_pct: 0 },
      { ...entry, id: 'master', name: 'Handover', is_milestone: true, finish_date: '2026-12-31', progress_pct: 0 },
    ],
    milestones: [{ ...entry, title: 'Handover', block_id: 'b9', due_date: '2026-12-31' }],
  }, day, false)
  assert.deepEqual(row.timeline.map(event => [event.packageName, event.title, event.date]), [
    ['Blocks B9–B12 & B14', 'Package handover', '2026-12-31'],
    ['Block B13', 'Package handover', '2026-12-31'],
  ])
  assert.notEqual(row.timeline[0].id, row.timeline[1].id)
})

test('an active package revision supersedes old handover dates without moving another block', () => {
  const row = projectPosition({ ...project, handover_date: '2027-01-15' }, {
    ...empty,
    packages: [
      { ...entry, id: 'schedule-b9', name: 'Blocks B9–B12 & B14', planned_finish: '2026-12-15' },
      { ...entry, id: 'b13', name: 'Block B13', planned_finish: '2026-12-18' },
    ],
    blocks: [{ ...entry, id: 'legacy-b9', block_name: 'Blocks B9–B12 & B14' }],
    revisions: [{
      ...entry, id: 'revision-b9', block_id: 'legacy-b9', current_finish: '2026-12-31',
      programme_activities: [{ name: 'Handover to client', finish_date: '2026-12-31' }],
    }],
    handovers: [{ ...entry, package_name: 'Blocks B9-B12 & B14', target_handover_date: '2026-12-15', status: 'In Progress' }],
    milestones: [{ ...entry, delivery_package_id: 'schedule-b9', title: 'Handover', due_date: '2026-12-15' }],
  }, day, false)
  assert.deepEqual(row.timeline.map(event => [event.packageName, event.date]), [
    ['Blocks B9–B12 & B14', '2026-12-31'], ['Block B13', '2026-12-18'], [undefined, '2027-01-15'],
  ])
})

test('only outstanding deliveries become overdue, including handovers without a schedule package', () => {
  const row = projectPosition(project, {
    ...empty,
    packages: [
      { ...entry, id: 'a1', name: 'Block A1', status: 'Completed', planned_finish: '2026-10-31' },
      { ...entry, id: 'a2', name: 'Block A2', planned_finish: '2026-10-31' },
      { ...entry, id: 'old', name: 'Archived package', archived_at: '2026-11-10', planned_finish: '2026-10-30' },
    ],
    handovers: [
      { ...entry, id: 'h1', package_name: 'Block A1', target_handover_date: '2026-11-10', status: 'In Progress' },
      { ...entry, id: 'h2', package_name: 'Block A2', target_handover_date: '2026-11-10', actual_handover_date: '2026-11-12', status: 'Handed Over' },
      { ...entry, id: 'h3', package_name: 'Standalone handover', target_handover_date: day, status: 'Pending' },
      { ...entry, id: 'h4', package_name: 'Archived package', target_handover_date: '2026-11-01', status: 'In Progress' },
    ],
    tasks: [{ ...entry, delivery_package_id: 'a1', name: 'Final works', status: 'Completed' }],
  }, day, false)
  assert.deepEqual(row.timeline.map(event => [event.packageName, event.title, event.overdueDays]), [
    ['Block A1', 'Package handover', 10], ['Standalone handover', 'Package handover', undefined],
  ])
})

test('a single project handover on its target date appears once and upcoming linked milestones retain scope', () => {
  const single = projectPosition(project, {
    ...empty, milestones: [{ ...entry, title: 'Project handover', due_date: project.handover_date }],
  }, day, false)
  assert.deepEqual(single.timeline.map(event => event.title), ['Project handover'])
  const multi = projectPosition(project, {
    ...empty,
    packages: [{ ...entry, id: 'a1', name: 'Block A1' }, { ...entry, id: 'b1', name: 'Block B1' }],
    milestones: [
      { ...entry, id: 'm1', block_id: 'a1', title: 'Utility approval', due_date: '2026-12-10' },
      { ...entry, id: 'm2', block_id: 'b1', title: 'Utility approval', due_date: '2026-12-10' },
    ],
  }, day, false)
  assert.deepEqual(multi.timeline.filter(event => event.title === 'Utility approval').map(event => event.packageName), ['Block A1', 'Block B1'])
})

test('site photos include the latest reporting week across report disciplines and retain older documents for history', () => {
  const row = projectPosition(project, {
    ...empty,
    reports: [
      { ...entry, id: 'old-block', block_id: 'B13', report_date: '2026-09-02', workflow_status: 'Approved' },
      { ...entry, id: 'new-housebuild', discipline: 'Housebuild', report_date: '2026-11-18', workflow_status: 'Approved' },
      { ...entry, id: 'new-mep', discipline: 'Mechanical', report_date: '2026-11-20', workflow_status: 'Submitted' },
    ],
    documents: [
      { ...entry, id: 'old-word', title: 'Project update', type: 'Report', revision_date: '2026-11-13', status: 'Superseded' },
      { ...entry, id: 'new-word', title: 'Project update', type: 'Report', revision_date: '2026-11-19', status: 'Approved' },
    ],
    designSubmissions: [
      { ...entry, report_week: '2026-11-20', status: 'Submitted', snapshot_data: { progressEvidence: [{ id: 'design-latest' }] } },
    ],
  }, '2026-11-23', false)
  assert.equal(row.sitePhotos.week, '2026-11-20')
  assert.deepEqual(row.sitePhotos.reportIds, ['new-mep', 'new-housebuild'])
  assert.deepEqual(row.sitePhotos.documents.map(document => document.id), ['new-word'])
  assert.deepEqual(row.sitePhotos.historyDocuments.map(document => document.id), ['old-word', 'new-word'])
  assert.deepEqual(row.sitePhotos.designEvidenceIds, ['design-latest'])
})

test('a more recent submitted report without evidence does not carry older photos forward', () => {
  const row = projectPosition(project, {
    ...empty,
    reports: [{ ...entry, id: 'previous-report', report_date: '2026-11-13', workflow_status: 'Approved' }],
    documents: [{ ...entry, title: 'Previous photos', type: 'Report', revision_date: '2026-11-13' }],
    designSubmissions: [{
      ...entry, report_week: '2026-11-20', status: 'Submitted', snapshot_data: { progressEvidence: [] },
    }],
  }, '2026-11-20', false)
  assert.equal(row.sitePhotos.week, '2026-11-20')
  assert.deepEqual(row.sitePhotos.reportIds, [])
  assert.deepEqual(row.sitePhotos.documents, [])
  assert.deepEqual(row.sitePhotos.designEvidenceIds, [])
})

test('a draft does not displace the latest report with an open reporting week', () => {
  const row = projectPosition(project, {
    ...empty,
    reports: [
      { ...entry, id: 'draft', report_date: '2026-11-23', workflow_status: 'Draft' },
      { ...entry, id: 'published', report_date: '2026-11-20', workflow_status: 'Locked' },
    ],
  }, '2026-11-23', false)
  assert.equal(row.sitePhotos.week, '2026-11-20')
  assert.deepEqual(row.sitePhotos.reportIds, ['published'])
})
