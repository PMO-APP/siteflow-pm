
import { supabase } from '@/lib/supabase'
import { uploadWorkspaceBrandAsset } from '@/workspace/workspaceService'

export type WorkspaceSetupInput={
  organizationId:string
  name:string
  code:string
  description:string
  portfolioPrefix:string
  projectPrefix:string
  language:string
  dateFormat:string
  numberFormat:string
  timezone:string
  workingHoursStart:string
  workingHoursEnd:string
  weekStart:string
  financialYearStart:string
}

export type BrandingSetupInput={
  workspaceId:string
  logoUrl:string|null
  darkLogoUrl:string|null
  lightLogoUrl:string|null
  primaryColor:string
  accentColor:string
  defaultTheme:'light'|'dark'|'system'
  emailFooter:string
  companyAddress:string
  supportEmail:string
  supportPhone:string
}

export async function saveSetupWorkspace(input:WorkspaceSetupInput){
  const {data,error}=await supabase.rpc('save_workspace_setup_workspace',{
    p_organization_id:input.organizationId,
    p_name:input.name.trim(),
    p_code:input.code.trim().toUpperCase(),
    p_description:input.description.trim()||null,
    p_portfolio_prefix:input.portfolioPrefix.trim().toUpperCase()||null,
    p_project_prefix:input.projectPrefix.trim().toUpperCase()||null,
    p_language:input.language,
    p_date_format:input.dateFormat,
    p_number_format:input.numberFormat,
    p_timezone:input.timezone,
    p_working_hours_start:input.workingHoursStart,
    p_working_hours_end:input.workingHoursEnd,
    p_week_start:input.weekStart,
    p_financial_year_start:Number(input.financialYearStart)
  })
  if(error)throw error
  return data as {workspaceId:string;created:boolean;slug:string}
}

export async function loadSetupWorkspace(workspaceId:string){
  const {data,error}=await supabase.from('workspaces').select(`
    *,
    workspace_settings(*),
    workspace_branding(*)
  `).eq('id',workspaceId).maybeSingle()
  if(error)throw error
  return data
}

export async function saveSetupBranding(input:BrandingSetupInput){
  const {error}=await supabase.from('workspace_branding').upsert({
    workspace_id:input.workspaceId,
    logo_url:input.logoUrl,
    dark_logo_url:input.darkLogoUrl,
    light_logo_url:input.lightLogoUrl,
    primary_color:input.primaryColor,
    secondary_color:input.accentColor,
    default_theme:input.defaultTheme,
    email_footer:input.emailFooter||null,
    company_address:input.companyAddress||null,
    support_email:input.supportEmail||null,
    support_phone:input.supportPhone||null,
    product_name:'PMOCorex',
    product_tagline:'Portfolio Control Centre',
    updated_at:new Date().toISOString()
  },{onConflict:'workspace_id'})
  if(error)throw error
}

export async function uploadSetupBrandAsset(
  workspaceId:string,
  kind:'logo'|'dark-logo'|'light-logo',
  file:File
){
  const mapped=kind==='logo'?'logo':'email-header'
  if(kind==='logo')return uploadWorkspaceBrandAsset(workspaceId,mapped,file)
  const extension=file.name.split('.').pop()?.toLowerCase()||'png'
  const path=`${workspaceId}/${kind}-${Date.now()}.${extension}`
  const {error}=await supabase.storage.from('workspace-branding').upload(path,file,{upsert:true,cacheControl:'3600'})
  if(error)throw error
  return supabase.storage.from('workspace-branding').getPublicUrl(path).data.publicUrl
}
