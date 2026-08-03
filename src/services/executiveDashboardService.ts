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

export async function loadExecutivePortfolioSnapshot(workspaceId: string): Promise<ExecutivePortfolioSnapshot> {
  const tables = [
    'projects','tasks','risks','procurement_items','approvals','quality_gates',
    'hse_incidents','snags','financial_items','project_milestones','generated_reports','executive_decisions'
  ] as const

  const results = await Promise.all(tables.map(table =>
    supabase.from(table).select('*').eq('workspace_id', workspaceId)
  ))
  const firstError = results.find(result => result.error)?.error
  if (firstError) throw firstError
  const [projects,tasks,risks,procurement,approvals,quality,hse,snags,financial,milestones,reports,decisionRows] = results.map(result => result.data || [])

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
      qualityExceptions:qualityExceptions.length,openHseIncidents:openHseIncidents.length,openSnags:openSnags.length,
      budget,actualCost,budgetUtilization:budget>0 ? Math.round(actualCost/budget*100) : null,
      spi:spi == null ? null : Number(spi.toFixed(2)),cpi:cpi == null ? null : Number(cpi.toFixed(2)),
      forecastCompletion:(dateValue(project.forecast_completion,project.handover_date,project.end_date)?.toISOString() || null),
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
  const forecastDates=activeRows.map(row=>row.forecastCompletion).filter(Boolean).map(value=>new Date(value!).getTime()).filter(Number.isFinite)

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

  return {
    projects:rows,attention,decisions,timeline,insights,
    metrics:{
      activeProjects:activeRows.length,healthyProjects:activeRows.filter(row=>row.health==='healthy').length,
      attentionProjects:activeRows.filter(row=>row.health==='attention').length,criticalProjects:criticalRows.length,
      portfolioHealthScore:weighted('healthScore'),overallProgress:weighted('progress'),portfolioSpi:avgNullable('spi'),portfolioCpi:avgNullable('cpi'),
      budgetUtilization:totalBudget>0?Math.round(totalCost/totalBudget*100):null,
      forecastCompletion:forecastDates.length?new Date(Math.max(...forecastDates)).toISOString():null,
    },
    rankings:{
      bestDelivery:[...activeRows].sort((a,b)=>(b.progress-b.plannedProgress)-(a.progress-a.plannedProgress)).slice(0,5),
      lowestRisk:[...activeRows].sort((a,b)=>a.highRisks-b.highRisks||b.healthScore-a.healthScore).slice(0,5),
      bestQuality:[...activeRows].sort((a,b)=>a.qualityExceptions-b.qualityExceptions||b.healthScore-a.healthScore).slice(0,5),
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
