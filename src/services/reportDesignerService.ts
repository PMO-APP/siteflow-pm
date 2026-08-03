
import { supabase } from '@/lib/supabase'
import type { DesignerTemplate, ReportWidget, ReportWidgetType } from './reportDesignerTypes'

export const WIDGET_LIBRARY: Array<{type:ReportWidgetType;title:string;dataSource:string|null}> = [
  {type:'cover',title:'Cover Page',dataSource:null},
  {type:'executive_summary',title:'Executive Summary',dataSource:'executive_narratives'},
  {type:'kpi_cards',title:'KPI Cards',dataSource:'executive_dashboard'},
  {type:'project_health',title:'Project Health Table',dataSource:'projects'},
  {type:'rag_heatmap',title:'RAG Heatmap',dataSource:'projects'},
  {type:'schedule',title:'Schedule Performance',dataSource:'tasks'},
  {type:'risk_table',title:'Risk Register',dataSource:'risks'},
  {type:'procurement_table',title:'Procurement Status',dataSource:'procurement_items'},
  {type:'approvals_table',title:'Approvals',dataSource:'approvals'},
  {type:'cost_summary',title:'Cost Summary',dataSource:'financial_items'},
  {type:'quality_hse',title:'Quality & HSE',dataSource:'quality_gates'},
  {type:'image_gallery',title:'Progress Photographs',dataSource:'photos'},
  {type:'timeline',title:'Executive Timeline',dataSource:'project_milestones'},
  {type:'decision_list',title:'Decision Register',dataSource:'executive_decisions'},
  {type:'heading',title:'Heading',dataSource:null},
  {type:'text',title:'Management Commentary',dataSource:null},
  {type:'page_break',title:'Page Break',dataSource:null},
]

export function makeWidget(type:ReportWidgetType):ReportWidget{
  const meta=WIDGET_LIBRARY.find(item=>item.type===type)!
  return {
    id:crypto.randomUUID(),type,title:meta.title,description:'',dataSource:meta.dataSource,
    chartType:'none',maxRecords:10,hidden:false,pageBreakBefore:false,commentary:'',filters:{}
  }
}

function mapTemplate(row:any):DesignerTemplate{
  const settings=row.designer_settings||{}
  return {
    id:row.id,workspaceId:row.workspace_id,name:row.name,reportType:row.report_type,
    description:row.description||'',defaultScope:settings.defaultScope||'workspace',
    orientation:settings.orientation||'portrait',confidentialityLabel:settings.confidentialityLabel||'',
    signatory:settings.signatory||'',approvalRole:settings.approvalRole||'pmo',
    defaultRecipients:settings.defaultRecipients||[],widgets:row.widgets||[],
    isDefault:Boolean(row.is_default),isActive:row.is_active!==false
  }
}

export async function listDesignerTemplates(workspaceId:string){
  const {data,error}=await supabase.from('report_templates').select('*').eq('workspace_id',workspaceId).order('updated_at',{ascending:false})
  if(error)throw error
  return (data||[]).map(mapTemplate)
}

export async function saveDesignerTemplate(template:DesignerTemplate){
  const {data:auth}=await supabase.auth.getUser()
  const payload={
    workspace_id:template.workspaceId,name:template.name,report_type:template.reportType,
    description:template.description,sections:template.widgets.map(item=>item.type),
    widgets:template.widgets,
    designer_settings:{
      defaultScope:template.defaultScope,orientation:template.orientation,
      confidentialityLabel:template.confidentialityLabel,signatory:template.signatory,
      approvalRole:template.approvalRole,defaultRecipients:template.defaultRecipients
    },
    is_default:template.isDefault,is_active:template.isActive,
    updated_at:new Date().toISOString(),created_by:auth.user?.id||null
  }
  const query=template.id
    ? supabase.from('report_templates').update(payload).eq('id',template.id).select('*').single()
    : supabase.from('report_templates').insert(payload).select('*').single()
  const {data,error}=await query
  if(error)throw error
  return mapTemplate(data)
}

export async function duplicateDesignerTemplate(template:DesignerTemplate){
  return saveDesignerTemplate({...template,id:undefined,name:`${template.name} Copy`,isDefault:false})
}

export async function archiveDesignerTemplate(id:string){
  const {error}=await supabase.from('report_templates').update({is_active:false,updated_at:new Date().toISOString()}).eq('id',id)
  if(error)throw error
}

export async function restoreDesignerTemplate(id:string){
  const {error}=await supabase.from('report_templates').update({is_active:true,updated_at:new Date().toISOString()}).eq('id',id)
  if(error)throw error
}

export async function setDefaultDesignerTemplate(workspaceId:string,id:string,reportType:string){
  await supabase.from('report_templates').update({is_default:false}).eq('workspace_id',workspaceId).eq('report_type',reportType)
  const {error}=await supabase.from('report_templates').update({is_default:true,updated_at:new Date().toISOString()}).eq('id',id)
  if(error)throw error
}
