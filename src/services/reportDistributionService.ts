
import { supabase } from '@/lib/supabase'
import { writeAuditEvent } from '@/services/auditService'
import type {
  DistributionAnalytics, DistributionList, ReportDistribution, ReportSchedule, ShareLink
} from './reportDistributionTypes'

const mapDistribution=(row:any):ReportDistribution=>({
  id:row.id,workspaceId:row.workspace_id,reportId:row.report_id,
  reportTitle:row.generated_reports?.title||row.report_title||'Report',
  reportVersion:Number(row.generated_reports?.version_number||row.report_version||1),
  channel:row.channel,format:row.format,status:row.status,
  recipients:row.recipients||[],approvalRequired:Boolean(row.approval_required),
  approvalStatus:row.approval_status||'not_required',
  lastSentAt:row.last_sent_at||null,nextScheduledAt:row.next_scheduled_at||null,
  createdAt:row.created_at
})

export async function listReportDistributions(workspaceId:string){
  const {data,error}=await supabase.from('report_distributions')
    .select('*,generated_reports(title,version_number)')
    .eq('workspace_id',workspaceId).order('created_at',{ascending:false})
  if(error)throw error
  return (data||[]).map(mapDistribution)
}

export async function createReportDistribution(input:{
  workspaceId:string;reportId:string;channel:string;format:string;recipients:string[];
  approvalRequired:boolean;emailSubject?:string;emailIntroduction?:string
}){
  const {data:auth}=await supabase.auth.getUser()
  const status=input.approvalRequired?'pending_approval':'queued'
  const {data,error}=await supabase.from('report_distributions').insert({
    workspace_id:input.workspaceId,report_id:input.reportId,channel:input.channel,
    format:input.format,recipients:input.recipients,status,
    approval_required:input.approvalRequired,
    approval_status:input.approvalRequired?'pending':'not_required',
    email_subject:input.emailSubject||null,email_introduction:input.emailIntroduction||null,
    created_by:auth.user?.id||null
  }).select('*').single()
  if(error)throw error
  await writeAuditEvent({workspaceId:input.workspaceId,action:'CREATE',module:'report distribution',tableName:'report_distributions',recordId:data.id,description:'Report distribution created.'})
  if(!input.approvalRequired) await queueDistribution(data.id,input.workspaceId)
  return data
}

export async function approveDistribution(id:string,workspaceId:string){
  const {data:auth}=await supabase.auth.getUser()
  const {error}=await supabase.from('report_distributions').update({
    approval_status:'approved',status:'queued',approved_by:auth.user?.id||null,approved_at:new Date().toISOString()
  }).eq('id',id)
  if(error)throw error
  await writeAuditEvent({workspaceId,action:'APPROVE',module:'report distribution',tableName:'report_distributions',recordId:id,description:'Report distribution approved.'})
  await queueDistribution(id,workspaceId)
}

export async function queueDistribution(id:string,workspaceId:string){
  const {error}=await supabase.functions.invoke('process-report-distribution',{body:{distributionId:id,workspaceId}})
  if(error){
    await supabase.from('report_distributions').update({status:'failed',last_error:error.message}).eq('id',id)
    throw error
  }
}

export async function listDistributionLists(workspaceId:string){
  const {data,error}=await supabase.from('distribution_lists').select('*,distribution_list_members(*)').eq('workspace_id',workspaceId).order('name')
  if(error)throw error
  return (data||[]).map((row:any):DistributionList=>({
    id:row.id,workspaceId:row.workspace_id,name:row.name,description:row.description||'',
    recipients:(row.distribution_list_members||[]).map((item:any)=>({name:item.name||'',email:item.email,role:item.role,external:Boolean(item.external)}))
  }))
}

export async function saveDistributionList(list:DistributionList){
  const {data,error}=list.id
    ? await supabase.from('distribution_lists').update({name:list.name,description:list.description,updated_at:new Date().toISOString()}).eq('id',list.id).select('*').single()
    : await supabase.from('distribution_lists').insert({workspace_id:list.workspaceId,name:list.name,description:list.description}).select('*').single()
  if(error)throw error
  await supabase.from('distribution_list_members').delete().eq('list_id',data.id)
  if(list.recipients.length){
    const {error:memberError}=await supabase.from('distribution_list_members').insert(list.recipients.map(item=>({
      workspace_id:list.workspaceId,list_id:data.id,name:item.name,email:item.email,role:item.role||null,external:Boolean(item.external)
    })))
    if(memberError)throw memberError
  }
  return data
}

export async function listReportSchedules(workspaceId:string){
  const {data,error}=await supabase.from('report_schedules').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false})
  if(error)throw error
  return (data||[]).map((row:any):ReportSchedule=>({
    id:row.id,workspaceId:row.workspace_id,name:row.name,templateId:row.template_id,
    reportType:row.report_type,scopeType:row.scope_type,scopeId:row.scope_id,
    frequency:row.frequency,cronExpression:row.cron_expression,timezone:row.timezone,
    runTime:row.run_time,recipients:row.recipients||[],channel:row.channel,format:row.format,
    approvalRequired:Boolean(row.approval_required),isActive:Boolean(row.is_active),nextRunAt:row.next_run_at
  }))
}

export async function saveReportSchedule(schedule:ReportSchedule){
  const payload={
    workspace_id:schedule.workspaceId,name:schedule.name,template_id:schedule.templateId,
    report_type:schedule.reportType,scope_type:schedule.scopeType,scope_id:schedule.scopeId,
    frequency:schedule.frequency,cron_expression:schedule.cronExpression,timezone:schedule.timezone,
    run_time:schedule.runTime,recipients:schedule.recipients,channel:schedule.channel,format:schedule.format,
    approval_required:schedule.approvalRequired,is_active:schedule.isActive,
    next_run_at:schedule.nextRunAt,updated_at:new Date().toISOString()
  }
  const {data,error}=schedule.id
    ? await supabase.from('report_schedules').update(payload).eq('id',schedule.id).select('*').single()
    : await supabase.from('report_schedules').insert(payload).select('*').single()
  if(error)throw error
  return data
}

export async function createSecureShareLink(input:{
  workspaceId:string;reportId:string;expiresAt?:string|null;password?:string|null;
  downloadLimit?:number|null;viewOnly:boolean;watermark?:string|null
}){
  const {data,error}=await supabase.rpc('create_report_share_link',{
    p_workspace_id:input.workspaceId,p_report_id:input.reportId,p_expires_at:input.expiresAt||null,
    p_password:input.password||null,p_download_limit:input.downloadLimit||null,
    p_view_only:input.viewOnly,p_watermark:input.watermark||null
  })
  if(error)throw error
  return data
}

export async function listShareLinks(workspaceId:string){
  const {data,error}=await supabase.from('report_share_links').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false})
  if(error)throw error
  return (data||[]).map((row:any):ShareLink=>({
    id:row.id,token:row.token,reportId:row.report_id,expiresAt:row.expires_at,
    viewOnly:Boolean(row.view_only),downloadLimit:row.download_limit,downloadCount:Number(row.download_count||0),
    watermark:row.watermark,revokedAt:row.revoked_at,createdAt:row.created_at
  }))
}

export async function revokeShareLink(id:string){
  const {error}=await supabase.from('report_share_links').update({revoked_at:new Date().toISOString()}).eq('id',id)
  if(error)throw error
}

export async function loadDistributionAnalytics(workspaceId:string):Promise<DistributionAnalytics>{
  const [{data:distributions,error},{data:links},{data:schedules}]=await Promise.all([
    supabase.from('report_distributions').select('status').eq('workspace_id',workspaceId),
    supabase.from('report_share_links').select('download_count').eq('workspace_id',workspaceId),
    supabase.from('report_schedules').select('id').eq('workspace_id',workspaceId).eq('is_active',true)
  ])
  if(error)throw error
  return {
    totalDistributions:distributions?.length||0,
    successful:(distributions||[]).filter((d:any)=>d.status==='sent').length,
    failed:(distributions||[]).filter((d:any)=>d.status==='failed').length,
    scheduled:schedules?.length||0,
    downloads:(links||[]).reduce((sum:number,item:any)=>sum+Number(item.download_count||0),0),
    secureLinks:links?.length||0
  }
}
