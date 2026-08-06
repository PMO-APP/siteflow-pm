
import { supabase } from '@/lib/supabase'
import type {
  ExperienceAnalytics, ExperienceAudience, ExperienceEvent,
  ExperienceKind, ExperienceProgress, ExperienceState
} from './experienceTypes'

const audienceFromRole=(role:string|null):ExperienceAudience=>{
  const clean=String(role||'').toLowerCase()
  if(clean==='workspace_admin'||clean==='admin')return 'workspace_admin'
  if(clean==='pmo'||clean==='portfolio_manager'||clean==='project_manager'||clean==='project_owner')return 'pmo'
  if(clean==='design')return 'design'
  if(clean==='costing')return 'costing'
  if(clean==='housebuild')return 'housebuild'
  if(clean==='infrastructure')return 'infrastructure'
  if(clean==='mep')return 'mep'
  if(clean.startsWith('hse'))return 'hse'
  if(clean==='contractor'||clean==='subcontractor')return 'contractor'
  if(clean==='consultant')return 'consultant'
  if(clean==='vendor')return 'vendor'
  if(clean==='viewer'||clean==='guest')return 'viewer'
  return 'member'
}

async function safeCount(table:string,filter?:{column:string;value:any}){
  let query=supabase.from(table).select('*',{count:'exact',head:true})
  if(filter&&filter.value!==null&&filter.value!==undefined)query=query.eq(filter.column,filter.value)
  const {count,error}=await query
  return {count:count||0,error}
}

export async function detectExperienceState(input:{
  userId:string|null;workspaceId:string|null;role:string|null
}):Promise<ExperienceState>{
  const base:ExperienceState={
    userId:input.userId,workspaceId:input.workspaceId,role:input.role,
    audience:audienceFromRole(input.role),isFirstLogin:false,isWorkspaceCreator:false,
    hasOrganization:false,hasWorkspace:Boolean(input.workspaceId),hasPortfolio:false,
    hasProject:false,hasSchedule:false,setupCompleted:false,productTourCompleted:false,
    recommendedExperience:'product_tour',recommendedReason:'Learn the main PMOCorex workflows.',
    loading:false,error:null
  }
  if(!input.userId)return {...base,error:'No authenticated user.'}

  try{
    const [{data:profile},{data:members},{data:progress}]=await Promise.all([
      supabase.from('experience_profiles').select('*').eq('user_id',input.userId).maybeSingle(),
      supabase.from('workspace_members')
        .select('role,permission_profile_key,legacy_organization_id,workspace_id,is_default,joined_at')
        .eq('user_id',input.userId)
        .eq('status','active')
        .order('is_default',{ascending:false})
        .order('joined_at',{ascending:true}),
      supabase.from('user_experience_progress').select('*').eq('user_id',input.userId),
    ])

    const selectedMember=(members||[]).find((member:any)=>member.workspace_id===input.workspaceId)
      ||(members||[]).find((member:any)=>member.is_default)
      ||(members||[])[0]
    const workspaceId=input.workspaceId||selectedMember?.workspace_id||null
    const organizationId=selectedMember?.legacy_organization_id||null

    const [organizationCount,workspaceCount,portfolioCount,projectCount,scheduleCount]=await Promise.all([
      organizationId?safeCount('organizations',{column:'id',value:organizationId}):safeCount('organizations',{column:'created_by',value:input.userId}),
      workspaceId?safeCount('workspaces',{column:'id',value:workspaceId}):safeCount('workspaces',{column:'created_by',value:input.userId}),
      workspaceId?safeCount('portfolios',{column:'workspace_id',value:workspaceId}):Promise.resolve({count:0,error:null}),
      workspaceId?safeCount('projects',{column:'workspace_id',value:workspaceId}):Promise.resolve({count:0,error:null}),
      workspaceId?safeCount('tasks',{column:'workspace_id',value:workspaceId}):Promise.resolve({count:0,error:null}),
    ])

    const productTour=(progress||[]).find((item:any)=>item.experience_key==='core-product-tour')
    const setup=(progress||[]).find((item:any)=>item.experience_key==='workspace-setup')
    const hasOrganization=organizationCount.count>0
    const hasWorkspace=workspaceCount.count>0
    const hasPortfolio=portfolioCount.count>0
    const hasProject=projectCount.count>0
    const hasSchedule=scheduleCount.count>0
    const isWorkspaceCreator=Boolean(profile?.is_workspace_creator)||Boolean(
      (members||[]).some((member:any)=>
        ['workspace_admin'].includes(String(member.permission_profile_key||''))
        ||['workspace_admin','admin'].includes(String(member.role||''))
      )
    )
    const isFirstLogin=!profile?.first_login_completed_at
    let recommendedExperience:ExperienceKind='product_tour'
    let recommendedReason='Learn the main PMOCorex workflows.'

    if(isWorkspaceCreator&&(!hasOrganization||!hasWorkspace||!hasPortfolio||!hasProject)){
      recommendedExperience='workspace_setup'
      recommendedReason='Complete the organization and workspace setup before project delivery begins.'
    }else if(productTour?.status!=='completed'){
      recommendedExperience='product_tour'
      recommendedReason='Take the interactive product tour to learn how to navigate PMOCorex.'
    }else{
      recommendedExperience='role_tour'
      recommendedReason='Continue with learning tailored to your role and permissions.'
    }

    return {
      ...base,workspaceId,audience:isWorkspaceCreator&&isFirstLogin?'workspace_creator':audienceFromRole(input.role),
      isFirstLogin,isWorkspaceCreator,hasOrganization,hasWorkspace,hasPortfolio,hasProject,hasSchedule,
      setupCompleted:setup?.status==='completed',productTourCompleted:productTour?.status==='completed',
      recommendedExperience,recommendedReason
    }
  }catch(error){
    return {...base,error:error instanceof Error?error.message:'Unable to detect experience state.'}
  }
}

export async function upsertExperienceProfile(input:{
  userId:string;workspaceId:string|null;role:string|null;isWorkspaceCreator:boolean
}){
  const {error}=await supabase.from('experience_profiles').upsert({
    user_id:input.userId,workspace_id:input.workspaceId,role_snapshot:input.role,
    is_workspace_creator:input.isWorkspaceCreator,last_seen_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  },{onConflict:'user_id'})
  if(error)throw error
}

export async function markFirstLoginComplete(userId:string){
  const {error}=await supabase.from('experience_profiles').upsert({
    user_id:userId,first_login_completed_at:new Date().toISOString(),
    last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()
  },{onConflict:'user_id'})
  if(error)throw error
}

export async function loadExperienceProgress(userId:string,experienceKey:string){
  const {data,error}=await supabase.from('user_experience_progress').select('*')
    .eq('user_id',userId).eq('experience_key',experienceKey).maybeSingle()
  if(error)throw error
  return data
}

export async function saveExperienceProgress(progress:ExperienceProgress){
  const payload={
    workspace_id:progress.workspaceId,user_id:progress.userId,experience_key:progress.experienceKey,
    status:progress.status,current_step_key:progress.currentStepKey,
    completed_step_keys:progress.completedStepKeys,started_at:progress.startedAt,
    completed_at:progress.completedAt,skipped_at:progress.skippedAt,
    last_seen_at:progress.lastSeenAt,metadata:progress.metadata,updated_at:new Date().toISOString()
  }
  const {data,error}=await supabase.from('user_experience_progress').upsert(payload,{
    onConflict:'user_id,workspace_id,experience_key'
  }).select('*').single()
  if(error)throw error
  return data
}

export async function startExperienceSession(input:{
  workspaceId:string|null;userId:string;experienceKey:string;kind:ExperienceKind;route:string
}){
  const {data,error}=await supabase.from('experience_sessions').insert({
    workspace_id:input.workspaceId,user_id:input.userId,experience_key:input.experienceKey,
    kind:input.kind,status:'active',started_at:new Date().toISOString(),start_route:input.route
  }).select('id').single()
  if(error)throw error
  return String(data.id)
}

export async function closeExperienceSession(sessionId:string,status:'completed'|'skipped'|'abandoned'){
  const {error}=await supabase.from('experience_sessions').update({
    status,ended_at:new Date().toISOString()
  }).eq('id',sessionId)
  if(error)throw error
}

export async function recordExperienceEvent(event:ExperienceEvent){
  const {error}=await supabase.from('experience_events').insert({
    workspace_id:event.workspaceId,user_id:event.userId,experience_key:event.experienceKey,
    session_id:event.sessionId,event_name:event.eventName,step_key:event.stepKey||null,
    route:event.route||window.location.pathname,metadata:event.metadata||{}
  })
  if(error)console.warn('Experience event could not be recorded:',error.message)
}

export async function loadExperienceAnalytics(workspaceId:string):Promise<ExperienceAnalytics>{
  const {data,error}=await supabase.from('user_experience_progress').select('*').eq('workspace_id',workspaceId)
  if(error)throw error
  const rows=data||[]
  const completed=rows.filter((r:any)=>r.status==='completed')
  const skipped=rows.filter((r:any)=>r.status==='skipped')
  const durations=completed.map((r:any)=>{
    if(!r.started_at||!r.completed_at)return 0
    return Math.max(0,(new Date(r.completed_at).getTime()-new Date(r.started_at).getTime())/60000)
  }).filter(Boolean)
  const abandoned=new Map<string,number>()
  rows.filter((r:any)=>r.status==='in_progress'&&r.current_step_key).forEach((r:any)=>{
    abandoned.set(r.current_step_key,(abandoned.get(r.current_step_key)||0)+1)
  })
  const mostAbandonedStep=[...abandoned.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||null
  return {
    totalUsers:new Set(rows.map((r:any)=>r.user_id)).size,
    started:rows.filter((r:any)=>r.status!=='not_started').length,
    completed:completed.length,skipped:skipped.length,
    completionRate:rows.length?Math.round((completed.length/rows.length)*100):0,
    averageCompletionMinutes:durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length):0,
    mostAbandonedStep
  }
}
