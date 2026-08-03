
import { supabase } from '@/lib/supabase'
import { writeAuditEvent } from '@/services/auditService'
import { loadExecutivePortfolioSnapshot } from '@/services/executiveDashboardService'
import type { ExecutivePortfolioSnapshot } from '@/services/executiveDashboardTypes'
import type { BoardAction, BoardDecision, BoardPackSection, BoardSession } from './boardroomTypes'

export const DEFAULT_BOARD_SECTIONS: BoardPackSection[] = [
  {id:'cover',type:'cover',title:'Board Review',visible:true,presenterNotes:''},
  {id:'narrative',type:'executive_narrative',title:'Executive Narrative',visible:true,presenterNotes:''},
  {id:'kpis',type:'portfolio_kpis',title:'Portfolio Position',visible:true,presenterNotes:''},
  {id:'rag',type:'rag_overview',title:'Project RAG Overview',visible:true,presenterNotes:''},
  {id:'attention',type:'attention_queue',title:'Executive Attention Queue',visible:true,presenterNotes:''},
  {id:'commercial',type:'financial_procurement',title:'Financial & Procurement Exposure',visible:true,presenterNotes:''},
  {id:'governance',type:'risk_quality_hse',title:'Risk, Quality & HSE',visible:true,presenterNotes:''},
  {id:'decisions',type:'decisions',title:'Decisions Required',visible:true,presenterNotes:''},
  {id:'actions',type:'actions',title:'Action Register',visible:true,presenterNotes:''},
  {id:'timeline',type:'timeline',title:'Upcoming Milestones',visible:true,presenterNotes:''},
]

const mapSession=(row:any):BoardSession=>({
  id:row.id,workspaceId:row.workspace_id,title:row.title,
  meetingDate:row.meeting_date,chairperson:row.chairperson||'',
  attendees:row.attendees||[],reportId:row.report_id,
  dataMode:row.data_mode,status:row.status,sections:row.sections||DEFAULT_BOARD_SECTIONS,
  meetingNotes:row.meeting_notes||'',sourceDataTimestamp:row.source_data_timestamp,
  startedAt:row.started_at,closedAt:row.closed_at
})

export async function listBoardSessions(workspaceId:string){
  const {data,error}=await supabase.from('board_sessions').select('*')
    .eq('workspace_id',workspaceId).order('meeting_date',{ascending:false})
  if(error)throw error
  return (data||[]).map(mapSession)
}

export async function saveBoardSession(session:BoardSession){
  const {data:auth}=await supabase.auth.getUser()
  const payload={
    workspace_id:session.workspaceId,title:session.title,meeting_date:session.meetingDate,
    chairperson:session.chairperson,attendees:session.attendees,report_id:session.reportId,
    data_mode:session.dataMode,status:session.status,sections:session.sections,
    meeting_notes:session.meetingNotes,source_data_timestamp:session.sourceDataTimestamp,
    started_at:session.startedAt,closed_at:session.closedAt,
    updated_by:auth.user?.id||null,updated_at:new Date().toISOString()
  }
  const {data,error}=session.id
    ? await supabase.from('board_sessions').update(payload).eq('id',session.id).select('*').single()
    : await supabase.from('board_sessions').insert({...payload,created_by:auth.user?.id||null}).select('*').single()
  if(error)throw error
  await writeAuditEvent({
    workspaceId:session.workspaceId,action:session.id?'UPDATE':'CREATE',module:'boardroom',
    tableName:'board_sessions',recordId:data.id,description:`Board session ${session.id?'updated':'created'}.`
  })
  return mapSession(data)
}

export async function changeBoardSessionStatus(session:BoardSession,status:BoardSession['status']){
  const now=new Date().toISOString()
  const next={...session,status,startedAt:status==='live'?(session.startedAt||now):session.startedAt,closedAt:status==='completed'?now:session.closedAt}
  return saveBoardSession(next)
}

export async function loadBoardSnapshot(session:BoardSession):Promise<ExecutivePortfolioSnapshot>{
  if(session.dataMode==='frozen'&&session.reportId){
    const {data,error}=await supabase.from('generated_reports').select('data_snapshot').eq('id',session.reportId).single()
    if(error)throw error
    const snapshot=data?.data_snapshot
    if(snapshot?.projects&&snapshot?.metrics)return snapshot as ExecutivePortfolioSnapshot
  }
  return loadExecutivePortfolioSnapshot(session.workspaceId)
}

export async function listBoardDecisions(sessionId:string){
  const {data,error}=await supabase.from('board_decisions').select('*').eq('session_id',sessionId).order('created_at')
  if(error)throw error
  return data||[]
}

export async function createBoardDecision(decision:BoardDecision){
  const {data:auth}=await supabase.auth.getUser()
  const {data,error}=await supabase.from('board_decisions').insert({
    session_id:decision.sessionId,workspace_id:decision.workspaceId,project_id:decision.projectId,
    decision:decision.decision,rationale:decision.rationale,owner_name:decision.ownerName,
    due_date:decision.dueDate,priority:decision.priority,status:decision.status,
    section_type:decision.sectionType,created_by:auth.user?.id||null
  }).select('*').single()
  if(error)throw error
  await supabase.from('executive_decisions').insert({
    workspace_id:decision.workspaceId,project_id:decision.projectId,
    decision:decision.decision,owner_name:decision.ownerName,due_date:decision.dueDate,
    status:decision.status,created_by:auth.user?.id||null
  })
  await writeAuditEvent({workspaceId:decision.workspaceId,action:'CREATE',module:'board decision',tableName:'board_decisions',recordId:data.id,description:'Executive decision recorded.'})
  return data
}

export async function listBoardActions(sessionId:string){
  const {data,error}=await supabase.from('board_actions').select('*').eq('session_id',sessionId).order('created_at')
  if(error)throw error
  return data||[]
}

export async function createBoardAction(action:BoardAction){
  const {data:auth}=await supabase.auth.getUser()
  const {data,error}=await supabase.from('board_actions').insert({
    session_id:action.sessionId,workspace_id:action.workspaceId,project_id:action.projectId,
    action:action.action,owner_name:action.ownerName,owner_user_id:action.ownerUserId,
    due_date:action.dueDate,escalation_date:action.escalationDate,priority:action.priority,
    status:action.status,completion_evidence:action.completionEvidence,created_by:auth.user?.id||null
  }).select('*').single()
  if(error)throw error
  if(action.ownerUserId){
    await supabase.from('notifications').insert({
      workspace_id:action.workspaceId,user_id:action.ownerUserId,type:'info',category:'assignments',
      title:'Board action assigned',message:action.action,priority:action.priority,
      source_module:'boardroom',is_read:false
    })
  }
  await writeAuditEvent({workspaceId:action.workspaceId,action:'CREATE',module:'board action',tableName:'board_actions',recordId:data.id,description:'Board action assigned.'})
  return data
}
