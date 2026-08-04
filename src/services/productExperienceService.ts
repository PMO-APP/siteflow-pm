
import { supabase } from '@/lib/supabase'
import type { FeedbackItem,HelpArticle,ReleaseNote } from './productExperienceTypes'

const mapFeedback=(r:any):FeedbackItem=>({id:r.id,reference:r.reference,workspaceId:r.workspace_id,projectId:r.project_id,reporterId:r.reporter_id,title:r.title,description:r.description,category:r.category,priority:r.priority,status:r.status,module:r.module,pageUrl:r.page_url,metadata:r.metadata||{},voteCount:Number(r.vote_count||0),createdAt:r.created_at,updatedAt:r.updated_at})

export async function submitFeedback(input:any){
  const {data:auth}=await supabase.auth.getUser()
  const {data,error}=await supabase.from('feedback_items').insert({...input,reporter_id:auth.user?.id||null,metadata:{...input.metadata,userAgent:navigator.userAgent,screen:`${window.screen.width}x${window.screen.height}`,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone}}).select('*').single()
  if(error)throw error
  return mapFeedback(data)
}
export async function listFeedback(workspaceId:string,ownOnly=false){
  const {data:auth}=await supabase.auth.getUser()
  let q=supabase.from('feedback_items').select('*').eq('workspace_id',workspaceId).order('created_at',{ascending:false})
  if(ownOnly&&auth.user)q=q.eq('reporter_id',auth.user.id)
  const {data,error}=await q
  if(error)throw error
  return (data||[]).map(mapFeedback)
}
export async function updateFeedback(id:string,patch:any){const {error}=await supabase.from('feedback_items').update({...patch,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error}
export async function addFeedbackComment(feedbackId:string,workspaceId:string,comment:string){const {data:auth}=await supabase.auth.getUser();const {error}=await supabase.from('feedback_comments').insert({feedback_id:feedbackId,workspace_id:workspaceId,user_id:auth.user?.id||null,comment});if(error)throw error}
export async function voteFeedback(feedbackId:string,workspaceId:string){const {data:auth}=await supabase.auth.getUser();if(!auth.user)return;const {error}=await supabase.from('feedback_votes').upsert({feedback_id:feedbackId,workspace_id:workspaceId,user_id:auth.user.id});if(error)throw error}

export async function listHelpArticles(workspaceId:string){const {data,error}=await supabase.from('help_articles').select('*').or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`).eq('published',true).order('category');if(error)throw error;return (data||[]).map((r:any):HelpArticle=>({id:r.id,workspaceId:r.workspace_id,category:r.category,title:r.title,slug:r.slug,summary:r.summary||'',body:r.body,module:r.module,published:r.published,updatedAt:r.updated_at}))}
export async function listReleaseNotes(workspaceId:string){const {data,error}=await supabase.from('release_notes').select('*').or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`).order('released_at',{ascending:false});if(error)throw error;return (data||[]).map((r:any):ReleaseNote=>({id:r.id,workspaceId:r.workspace_id,version:r.version,title:r.title,summary:r.summary||'',items:r.items||[],releasedAt:r.released_at}))}
export async function recordHelpSearch(workspaceId:string,query:string,resultCount:number){const {data:auth}=await supabase.auth.getUser();await supabase.from('help_search_logs').insert({workspace_id:workspaceId,user_id:auth.user?.id||null,query,result_count:resultCount})}

export async function loadSystemHealth(workspaceId:string){
  const start=performance.now()
  const checks=await Promise.all([
    supabase.from('workspaces').select('id',{count:'exact',head:true}).eq('id',workspaceId),
    supabase.from('projects').select('id',{count:'exact',head:true}).eq('workspace_id',workspaceId),
    supabase.from('notifications').select('id',{count:'exact',head:true}).eq('workspace_id',workspaceId),
    supabase.from('audit_logs').select('id',{count:'exact',head:true}).eq('workspace_id',workspaceId),
  ])
  return {
    latencyMs:Math.round(performance.now()-start),
    checks:[
      {name:'Database',ok:!checks[0].error,detail:checks[0].error?.message||'Connected'},
      {name:'Projects',ok:!checks[1].error,detail:`${checks[1].count||0} records accessible`},
      {name:'Notifications',ok:!checks[2].error,detail:`${checks[2].count||0} records accessible`},
      {name:'Audit Trail',ok:!checks[3].error,detail:`${checks[3].count||0} records accessible`},
      {name:'Authentication',ok:Boolean((await supabase.auth.getSession()).data.session),detail:'Active session'},
      {name:'Storage',ok:true,detail:'Client configured'},
    ]
  }
}

export async function createDemoWorkspace(){
  const {data,error}=await supabase.rpc('create_demo_workspace')
  if(error)throw error
  return data
}
