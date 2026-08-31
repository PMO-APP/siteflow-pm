import { supabase } from '@/lib/supabase'
import { calculateProjectPlannedProgress, calculateProjectProgress } from '@/core/metrics/progressMetrics'
import type {
  ExecutiveAttentionItem, ExecutiveDecision, ExecutivePortfolioSnapshot,
  ExecutiveProjectRow, ExecutiveTimelineItem
} from './executiveDashboardTypes'

const CLOSED = ['closed','completed','resolved','approved','delivered','cancelled']
const now = () => new Date()
const lower = (value: unknown) => String(value || '').toLowerCase()
const isClosed = (value: unknown) => CLOSED.some(status => lower(value).includes(status))
const number = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}
const dateValue = (...values: unknown[]) => {
  for (const value of values) {
    if (!value) continue
    const date = new Date(String(value))
    if (!Number.isNaN(date.getTime())) return date
  }
  return null
}
const daysLate = (date: Date | null) => date ? Math.max(0, Math.floor((now().getTime() - date.getTime()) / 86400000)) : 0
const projectName = (project: any) => project.project_name || project.name || `Project ${project.id}`
const sameProject = (row: any, id: number) => String(row.project_id) === String(id)

type ExecutiveTable =
  | 'tasks' | 'risks' | 'procurement_items' | 'approvals' | 'quality_gates'
  | 'hse_incidents' | 'snags' | 'financial_items' | 'project_milestones'
  | 'generated_reports' | 'executive_decisions' | 'executive_metric_snapshots'

const errorText = (error: any) => [error?.message,error?.details,error?.hint,error?.code].filter(Boolean).join(' · ')
const isMissingOptionalTable = (error: any) => /42P01|PGRST205|relation .* does not exist|could not find the table/i.test(errorText(error))

async function loadProjectsForExecutive(projectId?: number | null) {
  // Projects across PMOCorex are already protected by RLS/access policies. Most of
  // the existing app queries this table without workspace_id, and older project
  // schemas do not contain that column. Querying it here caused the Executive
  // Dashboard to fail even though the user could open the same projects elsewhere.
  let query = supabase.from('projects').select('*')
  if (projectId != null) query = query.eq('id', projectId)
  const result = await query.order('id')
  if (result.error) throw new Error(`Projects could not be loaded: ${errorText(result.error)}`)
  return result.data || []
}

async function loadExecutiveTable(table: ExecutiveTable, projectIds: Set<string>, projectId?: number | null) {
  // Read through the same RLS-protected table access used elsewhere in PMOCorex,
  // then apply the active-project scope in memory. This deliberately avoids
  // requiring every legacy/additive table to expose a project_id filter at the
  // PostgREST schema level.
  const result = await supabase.from(table).select('*')

  if (result.error) {
    // These modules are additive executive signals. A module/table that has not
    // been deployed yet must not take the entire executive dashboard offline.
    if (isMissingOptionalTable(result.error)) {
      console.warn(`[Executive Dashboard] optional table ${table} is unavailable:`, result.error)
      return []
    }
    console.warn(`[Executive Dashboard] ${table} could not be loaded:`, result.error)
    return []
  }

  const rows = result.data || []
  const rowsWithProject = rows.filter((row: any) => row?.project_id != null)

  // On the project Executive Dashboard, only the active project's records are
  // allowed into the snapshot. Portfolio-level rows are intentionally excluded
  // so another project's/portfolio's signals cannot leak into this view.
  if (projectId != null) {
    return rows.filter((row: any) => row?.project_id != null && String(row.project_id) === String(projectId))
  }

  // Retain the broader behaviour for services that intentionally request a
  // portfolio snapshot without an active project.
  return rows.filter((row: any) => row?.project_id == null || projectIds.has(String(row.project_id)))
}

export async function loadExecutivePortfolioSnapshot(_workspaceId: string, projectId?: number | null): Promise<ExecutivePortfolioSnapshot> {
  const projects = await loadProjectsForExecutive(projectId)
  const projectIds = new Set(projects.map((project: any) => String(project.id)))

  const tables: ExecutiveTable[] = [
    'tasks','risks','procurement_items','approvals','quality_gates',
    'hse_incidents','snags','financial_items','project_milestones','generated_reports','executive_decisions'
  ]

  const results = await Promise.all(tables.map(table => loadExecutiveTable(table, projectIds, projectId)))
  const [tasks,risks,procurement,approvals,quality,hse,snags,financial,milestones,reports,decisionRows] = results

  const rows: ExecutiveProjectRow[] = projects.map((project: any) => {
    const id = Number(project.id)
    const projectTasks = tasks.filter((row: any) => sameProject(row,id))
    const projectRisks = risks.filter((row: any) => sameProject(row,id))
    const projectProcurement = procurement.filter((row: any) => sameProject(row,id))
    const projectApprovals = approvals.filter((row: any) => sameProject(row,id))
    const projectQuality = quality.filter((row: any) => sameProject(row,id))
    const projectHse = hse.filter((row: any) => sameProject(row,id))
    const projectSnags = snags.filter((row: any) => sameProject(row,id))
    const projectFinancial = financial.filter((row: any) => sameProject(row,id))

    const overdueTasks = projectTasks.filter((task: any) => !isClosed(task.status) && daysLate(dateValue(task.planned_finish,task.finish_date,task.due_date)) > 0)
    const highRisks = projectRisks.filter((risk: any) => !isClosed(risk.status) && (number(risk.risk_score,risk.score,risk.rating) >= 12 || /high|critical/.test(lower(risk.severity || risk.impact))))
    const overdueProcurement = projectProcurement.filter((item: any) => !isClosed(item.status) && daysLate(dateValue(item.expected_delivery_date,item.required_date,item.due_date)) > 0)
    const overdueApprovals = projectApprovals.filter((item: any) => !isClosed(item.status) && daysLate(dateValue(item.due_date,item.required_date)) > 0)
    const qualityExceptions = projectQuality.filter((item: any) => /failed|rejected|non.?conform/.test(lower(item.status || item.result)))
    const passedQuality = projectQuality.filter((item:any)=>/passed|approved|complete|closed|accepted/.test(lower(item.status||item.result)))
    const closedSnags = projectSnags.filter((item:any)=>isClosed(item.status))
    const qualityEvidenceCount = projectQuality.length + projectSnags.length
    const gatePassRate = projectQuality.length ? passedQuality.length / projectQuality.length : null
    const snagClosureRate = projectSnags.length ? closedSnags.length / projectSnags.length : null
    const exceptionControl = projectQuality.length ? Math.max(0,1-qualityExceptions.length/projectQuality.length) : null
    const qualityComponents = [
      gatePassRate == null ? null : {weight:.5,value:gatePassRate},
      snagClosureRate == null ? null : {weight:.3,value:snagClosureRate},
      exceptionControl == null ? null : {weight:.2,value:exceptionControl},
    ].filter(Boolean) as Array<{weight:number;value:number}>
    const qualityWeight = qualityComponents.reduce((sum,item)=>sum+item.weight,0)
    const qualityScore = qualityEvidenceCount > 0 && qualityWeight > 0
      ? Math.round(qualityComponents.reduce((sum,item)=>sum+item.value*item.weight,0)/qualityWeight*100)
      : null
    const openHseIncidents = projectHse.filter((item: any) => !isClosed(item.status))
    const openSnags = projectSnags.filter((item: any) => !isClosed(item.status))

    const progress = projectTasks.length
      ? calculateProjectProgress(projectTasks)
      : Math.round(number(project.progress_pct,project.progress_percent,project.progress))
    const plannedProgress = projectTasks.length
      ? calculateProjectPlannedProgress(projectTasks)
      : Math.round(number(project.planned_progress,project.planned_progress_pct,progress))
    const scheduleVarianceDays = Math.max(
      number(project.delay_days,project.schedule_delay_days,project.days_behind),
      ...overdueTasks.map((task: any) => daysLate(dateValue(task.planned_finish,task.finish_date,task.due_date))),
      0
    )

    const budget = projectFinancial.reduce((sum: number,item: any) => sum + number(item.budget,item.approved_budget,item.contract_sum,item.amount),0) || number(project.budget,project.approved_budget,project.contract_sum)
    const actualCost = projectFinancial.reduce((sum: number,item: any) => sum + number(item.actual_cost,item.paid_amount,item.spent,item.actual),0) || number(project.actual_cost,project.cost_to_date)
    const committedCost = projectFinancial.reduce((sum:number,item:any)=>sum+number(item.committed_cost,item.committed_amount,item.commitment,item.po_value,item.contract_value),0) || number(project.committed_cost,project.committed_amount)
    const explicitForecast = projectFinancial.reduce((sum:number,item:any)=>sum+number(item.forecast_cost,item.estimate_at_completion,item.eac),0) || number(project.forecast_cost,project.estimate_at_completion,project.eac)
    const runRateForecast = progress > 0 && actualCost > 0 ? actualCost / (progress/100) : 0
    const forecastCost = explicitForecast > 0 ? explicitForecast : runRateForecast > 0 ? runRateForecast : null
    const forecastCostSource = explicitForecast > 0 ? 'explicit' : runRateForecast > 0 ? 'run-rate' : 'none'
    const budgetUtilization = budget>0 ? Math.round(actualCost/budget*100) : null
    const costProgressGap = budgetUtilization == null ? null : Number((budgetUtilization-progress).toFixed(1))
    const earnedValue = number(project.earned_value, budget ? budget * progress / 100 : 0)
    const plannedValue = number(project.planned_value, budget ? budget * plannedProgress / 100 : 0)
    const spi = plannedValue > 0 ? earnedValue / plannedValue : (plannedProgress > 0 ? progress / plannedProgress : null)
    const cpi = actualCost > 0 ? earnedValue / actualCost : null

    const penalty = Math.min(70,
      Math.min(25,scheduleVarianceDays * 2) +
      Math.min(15,highRisks.length * 5) +
      Math.min(12,overdueProcurement.length * 4) +
      Math.min(10,overdueApprovals.length * 3) +
      Math.min(8,qualityExceptions.length * 4) +
      Math.min(10,openHseIncidents.length * 5)
    )
    const healthScore = Math.max(0,Math.round(100-penalty))
    const health = healthScore < 55 ? 'critical' : healthScore < 80 ? 'attention' : 'healthy'
    const blockers = [
      [scheduleVarianceDays, scheduleVarianceDays ? `${scheduleVarianceDays} days behind programme` : ''],
      [highRisks.length * 4, highRisks.length ? `${highRisks.length} high risks` : ''],
      [overdueProcurement.length * 4, overdueProcurement.length ? `${overdueProcurement.length} overdue procurement items` : ''],
      [overdueApprovals.length * 3, overdueApprovals.length ? `${overdueApprovals.length} overdue approvals` : ''],
      [qualityExceptions.length * 4, qualityExceptions.length ? `${qualityExceptions.length} quality exceptions` : ''],
      [openHseIncidents.length * 5, openHseIncidents.length ? `${openHseIncidents.length} open HSE incidents` : ''],
    ].sort((a,b) => Number(b[0])-Number(a[0]))

    return {
      id,name:projectName(project),organizationId:project.organization_id == null ? null : Number(project.organization_id),
      portfolioId:project.portfolio_id == null ? null : Number(project.portfolio_id),status:project.status || 'Active',
      progress,plannedProgress,scheduleVarianceDays,healthScore,health,
      ragLabel:health==='critical'?'Critical':health==='attention'?'Requires attention':'Healthy',
      primaryBlocker:String(blockers[0]?.[1] || 'No material blocker detected'),overdueActivities:overdueTasks.length,
      highRisks:highRisks.length,overdueProcurement:overdueProcurement.length,overdueApprovals:overdueApprovals.length,
      qualityExceptions:qualityExceptions.length,qualityScore,qualityEvidenceCount,openHseIncidents:openHseIncidents.length,openSnags:openSnags.length,
      budget,actualCost,committedCost,forecastCost:forecastCost==null?null:Math.round(forecastCost),forecastCostSource,costProgressGap,budgetUtilization,
      spi:spi == null ? null : Number(spi.toFixed(2)),cpi:cpi == null ? null : Number(cpi.toFixed(2)),
      plannedCompletion:(dateValue(project.handover_date,project.end_date,project.planned_finish)?.toISOString() || null),
      forecastCompletion:(dateValue(project.forecast_completion,project.forecast_end_date,project.handover_date,project.end_date)?.toISOString() || null),
      forecastDelayDays:(()=>{const planned=dateValue(project.handover_date,project.end_date,project.planned_finish);const forecast=dateValue(project.forecast_completion,project.forecast_end_date,project.handover_date,project.end_date);return planned&&forecast?Math.max(0,Math.ceil((forecast.getTime()-planned.getTime())/86400000)):0})(),
      latitude:project.latitude == null ? null : Number(project.latitude),longitude:project.longitude == null ? null : Number(project.longitude),
    }
  })

  const rowById = new Map(rows.map(row => [String(row.id),row]))
  const attention: ExecutiveAttentionItem[] = []
  const pushAttention = (project: ExecutiveProjectRow, category: string, title: string, reason: string, severity: 'warning'|'critical', days: number, owner: string, action: string, url: string, score: number) => attention.push({
    id:`${project.id}-${category}-${attention.length}`,projectId:project.id,projectName:project.name,category,title,reason,severity,daysOverdue:days,owner,suggestedAction:action,actionUrl:url,score
  })
  rows.forEach(project => {
    if(project.scheduleVarianceDays) pushAttention(project,'Schedule','Programme recovery required',project.primaryBlocker,project.health==='critical'?'critical':'warning',project.scheduleVarianceDays,'Project Owner','Confirm a recovery sequence and accountable owners.','/app/recovery',project.scheduleVarianceDays*5)
    if(project.overdueProcurement) pushAttention(project,'Procurement','Critical procurement pressure',`${project.overdueProcurement} overdue procurement items may constrain delivery.`,project.overdueProcurement>2?'critical':'warning',project.scheduleVarianceDays,'Costing / Procurement','Escalate vendors and confirm revised delivery dates.','/app/procurement',project.overdueProcurement*12)
    if(project.overdueApprovals) pushAttention(project,'Approvals','Consultant approvals overdue',`${project.overdueApprovals} approvals are beyond their due dates.`,project.overdueApprovals>3?'critical':'warning',project.scheduleVarianceDays,'Design Lead','Escalate approval owners and protect successor activities.','/app/approvals',project.overdueApprovals*9)
    if(project.highRisks) pushAttention(project,'Risk','High exposure remains open',`${project.highRisks} high or critical risks require treatment.`,project.highRisks>2?'critical':'warning',0,'Risk Owner','Confirm mitigation dates and residual exposure.','/app/risk',project.highRisks*10)
    if(project.qualityExceptions) pushAttention(project,'Quality','Quality exceptions unresolved',`${project.qualityExceptions} failed or rejected quality gates remain open.`,project.qualityExceptions>2?'critical':'warning',0,'Quality Lead','Close root causes before dependent work proceeds.','/app/quality',project.qualityExceptions*10)
    if(project.openHseIncidents) pushAttention(project,'HSE','Open HSE incidents',`${project.openHseIncidents} safety incidents remain unresolved.`,'critical',0,'HSE Lead','Confirm containment, investigation and closure evidence.','/app/hse',project.openHseIncidents*15)
  })
  attention.sort((a,b)=>b.score-a.score)

  const decisions: ExecutiveDecision[] = decisionRows.map((item: any) => ({
    id:item.id,projectId:item.project_id == null ? null : Number(item.project_id),portfolioId:item.portfolio_id == null ? null : Number(item.portfolio_id),
    projectName:item.project_id ? rowById.get(String(item.project_id))?.name || null : null,decision:item.decision,
    rationale:item.rationale || null,ownerName:item.owner_name || null,dueDate:item.due_date || null,
    priority:item.priority || 'normal',status:item.status || 'open',actionUrl:item.action_url || null,createdAt:item.created_at,
  }))

  const timeline: ExecutiveTimelineItem[] = [
    ...milestones.map((item: any) => ({id:`m-${item.id}`,projectId:item.project_id==null?null:Number(item.project_id),projectName:rowById.get(String(item.project_id))?.name||null,type:'Milestone',title:item.title||item.name||item.milestone_name||'Project milestone',date:String(item.due_date||item.target_date||item.planned_date||item.created_at),status:item.status||'Planned',actionUrl:'/app/schedule'})),
    ...procurement.filter((item: any)=>dateValue(item.expected_delivery_date,item.required_date)).map((item: any)=>({id:`p-${item.id}`,projectId:Number(item.project_id),projectName:rowById.get(String(item.project_id))?.name||null,type:'Procurement',title:item.item_name||item.name||'Procurement delivery',date:String(item.expected_delivery_date||item.required_date),status:item.status||'Pending',actionUrl:'/app/procurement'})),
    ...approvals.filter((item: any)=>dateValue(item.due_date)).map((item: any)=>({id:`a-${item.id}`,projectId:Number(item.project_id),projectName:rowById.get(String(item.project_id))?.name||null,type:'Approval',title:item.title||item.name||'Approval due',date:String(item.due_date),status:item.status||'Pending',actionUrl:'/app/approvals'})),
  ].filter(item=>item.date && !Number.isNaN(new Date(item.date).getTime())).sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()).slice(0,20)

  const activeRows = rows.filter(row => !/completed|cancelled|archived/.test(lower(row.status)))
  const weighted = (key: 'progress'|'healthScore') => activeRows.length ? Math.round(activeRows.reduce((sum,row)=>sum+row[key],0)/activeRows.length) : 0
  const avgNullable = (key:'spi'|'cpi') => { const values=activeRows.map(row=>row[key]).filter((v):v is number=>v!=null); return values.length ? Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(2)) : null }
  const totalBudget=activeRows.reduce((sum,row)=>sum+row.budget,0), totalCost=activeRows.reduce((sum,row)=>sum+row.actualCost,0)
  const totalCommittedCost=activeRows.reduce((sum,row)=>sum+row.committedCost,0)
  const forecastCostRows=activeRows.map(row=>row.forecastCost).filter((value):value is number=>value!=null)
  const totalForecastCost=forecastCostRows.length ? forecastCostRows.reduce((sum,value)=>sum+value,0) : null
  const forecastCostVariance=totalForecastCost!=null && totalBudget>0 ? totalForecastCost-totalBudget : null
  const forecastDates=activeRows.map(row=>row.forecastCompletion).filter(Boolean).map(value=>new Date(value!).getTime()).filter(Number.isFinite)
  const projectsForecastLate=activeRows.filter(row=>row.forecastDelayDays>0).length
  // A project is operationally delayed when its live schedule is behind programme,
  // even if no separate forecast-completion date has been entered. Missing forecast
  // data must never be interpreted as 'on time'.
  const delayedProjects=activeRows.filter(row=>row.scheduleVarianceDays>0).length

  const insights: string[] = []
  const criticalRows=activeRows.filter(row=>row.health==='critical')
  if(criticalRows.length) insights.push(`${criticalRows.length} projects are currently critical; ${criticalRows[0].name} has the highest management pressure.`)
  const procurementLeader=[...activeRows].sort((a,b)=>b.overdueProcurement-a.overdueProcurement)[0]
  if(procurementLeader?.overdueProcurement) insights.push(`${procurementLeader.name} has the largest procurement bottleneck with ${procurementLeader.overdueProcurement} overdue items.`)
  const riskLeader=[...activeRows].sort((a,b)=>b.highRisks-a.highRisks)[0]
  if(riskLeader?.highRisks) insights.push(`${riskLeader.name} carries the highest current risk exposure with ${riskLeader.highRisks} high risks.`)
  const improving=[...activeRows].filter(row=>row.progress>=row.plannedProgress && row.health==='healthy').sort((a,b)=>b.progress-a.progress)[0]
  if(improving) insights.push(`${improving.name} is the strongest delivery signal at ${improving.progress}% progress with healthy controls.`)
  if(!insights.length) insights.push('Portfolio controls are stable. Continue protecting upcoming approvals, procurement dates and milestones.')

  // Persist one genuine daily executive snapshot per project. This starts the
  // portfolio trend history from deployment onward rather than inventing history.
  try {
    await supabase.from('executive_metric_snapshots').upsert(activeRows.map(row=>({
      snapshot_date:new Date().toISOString().slice(0,10),
      project_id:row.id,
      project_name:row.name,
      progress:row.progress,
      planned_progress:row.plannedProgress,
      budget_utilization:row.budgetUtilization,
      cost_progress_gap:row.costProgressGap,
      schedule_variance_days:row.scheduleVarianceDays,
      high_risks:row.highRisks,
      quality_score:row.qualityScore,
    })),{onConflict:'snapshot_date,project_id'})
  } catch(error) {
    console.warn('[Executive Dashboard] trend snapshot could not be saved:',error)
  }

  let trends:any[]=[]
  try {
    const since=new Date(); since.setDate(since.getDate()-84)
    const trendResult=await supabase.from('executive_metric_snapshots').select('*').gte('snapshot_date',since.toISOString().slice(0,10)).order('snapshot_date')
    if(!trendResult.error) trends=(trendResult.data||[]).filter((item:any)=>projectIds.has(String(item.project_id))).map((item:any)=>({
      date:item.snapshot_date,projectId:Number(item.project_id),projectName:item.project_name,
      progress:number(item.progress),plannedProgress:number(item.planned_progress),
      budgetUtilization:item.budget_utilization==null?null:number(item.budget_utilization),
      costProgressGap:item.cost_progress_gap==null?null:number(item.cost_progress_gap),
      scheduleVarianceDays:number(item.schedule_variance_days),highRisks:number(item.high_risks),
      qualityScore:item.quality_score==null?null:number(item.quality_score),
    }))
  } catch(error) {
    console.warn('[Executive Dashboard] trend history could not be loaded:',error)
  }

  return {
    projects:rows,attention,decisions,timeline,insights,trends,
    metrics:{
      activeProjects:activeRows.length,healthyProjects:activeRows.filter(row=>row.health==='healthy').length,
      attentionProjects:activeRows.filter(row=>row.health==='attention').length,criticalProjects:criticalRows.length,
      portfolioHealthScore:weighted('healthScore'),overallProgress:weighted('progress'),portfolioSpi:avgNullable('spi'),portfolioCpi:avgNullable('cpi'),
      budgetUtilization:totalBudget>0?Math.round(totalCost/totalBudget*100):null,
      totalBudget,totalActualCost:totalCost,totalCommittedCost,totalForecastCost,forecastCostVariance,projectsForecastLate,delayedProjects,
      forecastCompletion:forecastDates.length?new Date(Math.max(...forecastDates)).toISOString():null,
    },
    rankings:{
      bestDelivery:[...activeRows].sort((a,b)=>(b.progress-b.plannedProgress)-(a.progress-a.plannedProgress)).slice(0,5),
      lowestRisk:[...activeRows].sort((a,b)=>a.highRisks-b.highRisks||b.healthScore-a.healthScore).slice(0,5),
      bestQuality:[...activeRows].filter(row=>row.qualityScore!=null).sort((a,b)=>(b.qualityScore||0)-(a.qualityScore||0)||b.qualityEvidenceCount-a.qualityEvidenceCount).slice(0,5),
      mostDelayed:[...activeRows].sort((a,b)=>b.scheduleVarianceDays-a.scheduleVarianceDays).slice(0,5),
    }
  }
}

export async function updateExecutiveDecision(id: string, values: { status?: string; ownerName?: string; dueDate?: string | null }) {
  const { error } = await supabase.from('executive_decisions').update({
    ...(values.status ? { status: values.status } : {}),
    ...(values.ownerName !== undefined ? { owner_name: values.ownerName } : {}),
    ...(values.dueDate !== undefined ? { due_date: values.dueDate } : {}),
    ...(values.status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
  }).eq('id',id)
  if(error) throw error
}
