
import { supabase } from '@/lib/supabase'
import { loadExecutivePortfolioSnapshot } from './executiveDashboardService'
import type { ExecutivePortfolioSnapshot, ExecutiveProjectRow } from './executiveDashboardTypes'
import type {
  ExecutiveNarrativeDraft, ExecutiveNarrativeFormat, NarrativeBuildInput,
  NarrativeEvidence, NarrativeInsight, NarrativePeriodComparison
} from './executiveNarrativeTypes'

const FORMAT_LABELS: Record<ExecutiveNarrativeFormat,string> = {
  board_summary: 'Board Summary',
  ceo_briefing: 'CEO Briefing',
  weekly_pmo: 'Weekly PMO Commentary',
  project_director: 'Project Director Briefing',
  risk_recovery: 'Risk and Recovery Commentary',
  dashboard_paragraph: 'Dashboard Summary',
  detailed_management: 'Detailed Management Narrative',
}

const sentence = (value: string) => value.endsWith('.') ? value : `${value}.`
const plural = (count: number, singular: string, pluralValue = `${singular}s`) => `${count} ${count === 1 ? singular : pluralValue}`

function projectEvidence(project: ExecutiveProjectRow, sourceModule: string, metric: string, condition: string, value: string, actionUrl: string): NarrativeEvidence {
  return {
    id: `${project.id}-${sourceModule}-${metric}`.replace(/\s+/g,'-').toLowerCase(),
    projectId: project.id,
    projectName: project.name,
    sourceModule,
    recordId: String(project.id),
    metric,
    condition,
    value,
    timestamp: new Date().toISOString(),
    confidence: 'high',
    actionUrl,
  }
}

function buildInsights(snapshot: ExecutivePortfolioSnapshot): { insights: NarrativeInsight[]; evidence: NarrativeEvidence[] } {
  const insights: NarrativeInsight[] = []
  const evidence: NarrativeEvidence[] = []
  const add = (insight: NarrativeInsight, items: NarrativeEvidence[]) => {
    evidence.push(...items)
    insights.push({ ...insight, evidenceIds: items.map(item => item.id) })
  }

  const critical = snapshot.projects.filter(project => project.health === 'critical')
  if (critical.length) {
    const lead = [...critical].sort((a,b)=>a.healthScore-b.healthScore)[0]
    const items = [projectEvidence(lead,'Executive Dashboard','Health score','health_score < 55',String(lead.healthScore),'/app/executive-dashboard')]
    add({
      id:'critical-project-pressure',
      category:'Portfolio health',
      headline:'Critical delivery pressure',
      statement:`${plural(critical.length,'project')} are currently critical. ${lead.name} has the weakest health score at ${lead.healthScore} and requires immediate management intervention.`,
      severity:'critical',confidence:'high',evidenceIds:[],status:'proposed',
      suggestedAction:'Confirm accountable recovery actions and decision dates for each critical project.'
    },items)
  }

  const delayed = [...snapshot.projects].sort((a,b)=>b.scheduleVarianceDays-a.scheduleVarianceDays).filter(project=>project.scheduleVarianceDays>0)
  if (delayed.length) {
    const lead = delayed[0]
    add({
      id:'schedule-pressure',
      category:'Schedule',
      headline:'Schedule recovery required',
      statement:`${plural(delayed.length,'project')} are behind programme. ${lead.name} carries the largest current variance at ${lead.scheduleVarianceDays} days.`,
      severity:lead.scheduleVarianceDays>14?'critical':'warning',confidence:'high',evidenceIds:[],status:'proposed',
      suggestedAction:'Validate recovery logic, successor protection and responsible owners.'
    },[projectEvidence(lead,'Schedule','Schedule variance','days_behind > 0',`${lead.scheduleVarianceDays} days`,'/app/recovery')])
  }

  const procurement = [...snapshot.projects].sort((a,b)=>b.overdueProcurement-a.overdueProcurement).filter(project=>project.overdueProcurement>0)
  if (procurement.length) {
    const lead = procurement[0]
    add({
      id:'procurement-bottleneck',
      category:'Procurement',
      headline:'Procurement bottleneck emerging',
      statement:`${lead.name} has the highest procurement pressure with ${plural(lead.overdueProcurement,'overdue item')}.`,
      severity:lead.overdueProcurement>2?'critical':'warning',confidence:'high',evidenceIds:[],status:'proposed',
      suggestedAction:'Escalate vendor commitments and confirm revised delivery dates against successor activities.'
    },[projectEvidence(lead,'Procurement','Overdue procurement','overdue_procurement > 0',String(lead.overdueProcurement),'/app/procurement')])
  }

  const approvals = [...snapshot.projects].sort((a,b)=>b.overdueApprovals-a.overdueApprovals).filter(project=>project.overdueApprovals>0)
  if (approvals.length) {
    const lead = approvals[0]
    add({
      id:'approval-pressure',
      category:'Approvals',
      headline:'Approval response requires escalation',
      statement:`${lead.name} has ${plural(lead.overdueApprovals,'overdue approval')}, creating avoidable pressure on dependent activities.`,
      severity:lead.overdueApprovals>3?'critical':'warning',confidence:'high',evidenceIds:[],status:'proposed',
      suggestedAction:'Confirm approvers, due dates and the activities exposed by each outstanding decision.'
    },[projectEvidence(lead,'Approvals','Overdue approvals','overdue_approvals > 0',String(lead.overdueApprovals),'/app/approvals')])
  }

  const risk = [...snapshot.projects].sort((a,b)=>b.highRisks-a.highRisks).filter(project=>project.highRisks>0)
  if (risk.length) {
    const lead = risk[0]
    add({
      id:'risk-exposure',
      category:'Risk',
      headline:'Risk exposure remains concentrated',
      statement:`${lead.name} carries the highest current exposure with ${plural(lead.highRisks,'high risk')}.`,
      severity:lead.highRisks>2?'critical':'warning',confidence:'high',evidenceIds:[],status:'proposed',
      suggestedAction:'Review mitigation owners, residual exposure and overdue treatment actions.'
    },[projectEvidence(lead,'Risk Register','High risks','high_risk_count > 0',String(lead.highRisks),'/app/risk')])
  }

  const quality = [...snapshot.projects].sort((a,b)=>b.qualityExceptions-a.qualityExceptions).filter(project=>project.qualityExceptions>0)
  if (quality.length) {
    const lead = quality[0]
    add({
      id:'quality-exceptions',
      category:'Quality',
      headline:'Quality exceptions remain open',
      statement:`${lead.name} has the highest unresolved quality pressure with ${plural(lead.qualityExceptions,'exception')}.`,
      severity:lead.qualityExceptions>2?'critical':'warning',confidence:'high',evidenceIds:[],status:'proposed',
      suggestedAction:'Close root causes and confirm that dependent work is not proceeding without acceptance.'
    },[projectEvidence(lead,'Quality Gates','Quality exceptions','quality_exceptions > 0',String(lead.qualityExceptions),'/app/quality')])
  }

  const hse = [...snapshot.projects].sort((a,b)=>b.openHseIncidents-a.openHseIncidents).filter(project=>project.openHseIncidents>0)
  if (hse.length) {
    const lead = hse[0]
    add({
      id:'hse-incidents',
      category:'HSE',
      headline:'Open safety incidents require closure',
      statement:`${lead.name} has ${plural(lead.openHseIncidents,'open HSE incident')}.`,
      severity:'critical',confidence:'high',evidenceIds:[],status:'proposed',
      suggestedAction:'Confirm containment, investigation evidence and closure accountability.'
    },[projectEvidence(lead,'HSE','Open incidents','open_hse_incidents > 0',String(lead.openHseIncidents),'/app/hse')])
  }

  const positive = [...snapshot.projects]
    .filter(project=>project.health==='healthy' && project.progress>=project.plannedProgress)
    .sort((a,b)=>b.progress-a.progress)[0]
  if (positive) {
    add({
      id:'positive-delivery-signal',
      category:'Delivery',
      headline:'Strong delivery signal',
      statement:`${positive.name} is the strongest current delivery signal at ${positive.progress}% progress with healthy controls and no negative schedule variance.`,
      severity:'positive',confidence:'high',evidenceIds:[],status:'proposed',
      suggestedAction:'Capture the controls supporting this performance for wider portfolio learning.'
    },[projectEvidence(positive,'Executive Dashboard','Progress versus plan','progress >= planned_progress',`${positive.progress}% actual / ${positive.plannedProgress}% planned`,'/app/executive-dashboard')])
  }

  if (!insights.length) {
    insights.push({
      id:'controlled-position',
      category:'Portfolio health',
      headline:'Delivery remains controlled',
      statement:'No material portfolio-level schedule, procurement, approval, risk, quality or HSE exception was detected from the available records.',
      severity:'positive',confidence:'medium',evidenceIds:[],status:'proposed',
      suggestedAction:'Continue protecting upcoming milestones and maintaining reporting discipline.'
    })
  }

  return { insights, evidence }
}

function buildNarrative(format: ExecutiveNarrativeFormat, snapshot: ExecutivePortfolioSnapshot, insights: NarrativeInsight[]) {
  const accepted = insights.filter(item=>item.status!=='rejected')
  const critical = accepted.filter(item=>item.severity==='critical')
  const warnings = accepted.filter(item=>item.severity==='warning')
  const positives = accepted.filter(item=>item.severity==='positive')
  const opening = `The active portfolio comprises ${plural(snapshot.metrics.activeProjects,'project')} with an overall health score of ${snapshot.metrics.portfolioHealthScore} and ${snapshot.metrics.overallProgress}% average progress.`
  const pressure = critical.length || warnings.length
    ? `Executive attention is required on ${[...critical,...warnings].slice(0,3).map(item=>item.headline.toLowerCase()).join(', ')}.`
    : 'No material exception currently requires executive escalation.'
  const strength = positives.length ? sentence(positives[0].statement) : ''
  const decision = snapshot.attention[0]
    ? `The immediate management priority is to ${snapshot.attention[0].suggestedAction.charAt(0).toLowerCase()}${snapshot.attention[0].suggestedAction.slice(1)}`
    : 'Management should continue protecting upcoming milestones and monitoring emerging constraints.'

  if (format==='dashboard_paragraph') return `${opening} ${pressure} ${decision}`
  if (format==='ceo_briefing') return `${opening} ${pressure} ${strength} ${decision}`
  if (format==='risk_recovery') return `${opening} ${[...critical,...warnings].map(item=>sentence(item.statement)).join(' ')} ${decision}`
  if (format==='weekly_pmo') return `${opening} During the current review period, ${pressure.charAt(0).toLowerCase()}${pressure.slice(1)} ${strength} ${decision}`
  if (format==='project_director') return `${opening} Delivery leadership should focus on the projects and control areas identified in the evidence panel. ${pressure} ${decision}`
  if (format==='detailed_management') return `${opening}\n\n${accepted.map(item=>`${item.headline}: ${item.statement}`).join('\n\n')}\n\nManagement action: ${decision}`
  return `${opening} ${pressure} ${strength} ${decision}`
}

function compareSnapshots(current: ExecutivePortfolioSnapshot, previous: Record<string,any> | null): NarrativePeriodComparison {
  if (!previous) return { improved:[], deteriorated:[], newIssues:[], resolvedIssues:[], metricChanges:{} }
  const previousMetrics = previous.metrics || {}
  const currentMetrics = current.metrics
  const metricChanges: NarrativePeriodComparison['metricChanges'] = {}
  const keys = ['portfolioHealthScore','overallProgress','healthyProjects','attentionProjects','criticalProjects']
  keys.forEach(key=>{
    metricChanges[key]={previous:previousMetrics[key] ?? null,current:(currentMetrics as any)[key] ?? null}
  })
  const improved:string[]=[]
  const deteriorated:string[]=[]
  if(Number(currentMetrics.portfolioHealthScore)>Number(previousMetrics.portfolioHealthScore)) improved.push(`Portfolio health improved from ${previousMetrics.portfolioHealthScore} to ${currentMetrics.portfolioHealthScore}.`)
  if(Number(currentMetrics.portfolioHealthScore)<Number(previousMetrics.portfolioHealthScore)) deteriorated.push(`Portfolio health declined from ${previousMetrics.portfolioHealthScore} to ${currentMetrics.portfolioHealthScore}.`)
  if(Number(currentMetrics.overallProgress)>Number(previousMetrics.overallProgress)) improved.push(`Average progress increased from ${previousMetrics.overallProgress}% to ${currentMetrics.overallProgress}%.`)
  if(Number(currentMetrics.criticalProjects)>Number(previousMetrics.criticalProjects)) deteriorated.push(`Critical projects increased from ${previousMetrics.criticalProjects} to ${currentMetrics.criticalProjects}.`)
  return {improved,deteriorated,newIssues:[],resolvedIssues:[],metricChanges}
}

export async function buildExecutiveNarrative(input: NarrativeBuildInput): Promise<ExecutiveNarrativeDraft> {
  const snapshot = await loadExecutivePortfolioSnapshot(input.workspaceId)
  const { insights, evidence } = buildInsights(snapshot)

  let previousSnapshot: Record<string,any> | null = null
  if (input.previousReportId) {
    const { data } = await supabase.from('generated_reports').select('data_snapshot').eq('id',input.previousReportId).maybeSingle()
    previousSnapshot = data?.data_snapshot || null
  }

  const draft: ExecutiveNarrativeDraft = {
    workspaceId: input.workspaceId,
    reportId: input.reportId || null,
    format: input.format,
    title: FORMAT_LABELS[input.format],
    narrative: buildNarrative(input.format,snapshot,insights),
    managementCommentary: '',
    insights,
    evidence,
    comparison: compareSnapshots(snapshot,previousSnapshot),
    mode: input.mode || 'deterministic',
    status: 'draft',
    generatedAt: new Date().toISOString(),
  }

  if (input.mode === 'ai_assisted') {
    const { data, error } = await supabase.functions.invoke('refine-executive-narrative', {
      body: {
        format: input.format,
        deterministicNarrative: draft.narrative,
        insights: draft.insights,
        evidence: draft.evidence,
      }
    })
    if (!error && data?.narrative) draft.narrative = String(data.narrative)
  }
  return draft
}

export async function saveNarrativeDraft(draft: ExecutiveNarrativeDraft) {
  const { data: auth } = await supabase.auth.getUser()
  const payload = {
    workspace_id:draft.workspaceId,report_id:draft.reportId || null,format:draft.format,title:draft.title,
    narrative:draft.narrative,management_commentary:draft.managementCommentary,
    insights:draft.insights,evidence:draft.evidence,comparison:draft.comparison,mode:draft.mode,
    status:draft.status,generated_at:draft.generatedAt,updated_by:auth.user?.id || null,updated_at:new Date().toISOString(),
  }
  const query = draft.id
    ? supabase.from('executive_narratives').update(payload).eq('id',draft.id).select('*').single()
    : supabase.from('executive_narratives').insert(payload).select('*').single()
  const { data,error } = await query
  if(error) throw error
  return {...draft,id:data.id}
}

export async function approveNarrative(draft: ExecutiveNarrativeDraft) {
  const { data: auth } = await supabase.auth.getUser()
  const saved = await saveNarrativeDraft({...draft,status:'approved',approvedAt:new Date().toISOString(),approvedBy:auth.user?.id||null})
  const { error } = await supabase.from('executive_narratives').update({
    status:'approved',approved_at:new Date().toISOString(),approved_by:auth.user?.id||null
  }).eq('id',saved.id)
  if(error) throw error
  if(saved.reportId){
    await supabase.from('generated_reports').update({executive_summary:saved.narrative}).eq('id',saved.reportId)
  }
  return {...saved,status:'approved' as const}
}

export async function listExecutiveNarratives(workspaceId:string,limit=50){
  const {data,error}=await supabase.from('executive_narratives').select('*').eq('workspace_id',workspaceId).order('updated_at',{ascending:false}).limit(limit)
  if(error) throw error
  return (data||[]).map((row:any):ExecutiveNarrativeDraft=>({
    id:row.id,workspaceId:row.workspace_id,reportId:row.report_id,format:row.format,title:row.title,
    narrative:row.narrative,managementCommentary:row.management_commentary||'',insights:row.insights||[],
    evidence:row.evidence||[],comparison:row.comparison||{improved:[],deteriorated:[],newIssues:[],resolvedIssues:[],metricChanges:{}},
    mode:row.mode||'deterministic',status:row.status||'draft',generatedAt:row.generated_at,
    approvedAt:row.approved_at,approvedBy:row.approved_by
  }))
}
