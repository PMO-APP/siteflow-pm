
import { supabase } from '@/lib/supabase'

export type OrganizationSetupInput={
  name:string
  industry:string
  country:string
  website:string
  email:string
  phone:string
  address:string
  timezone:string
  currency:string
  workingWeek:'monday_friday'|'monday_saturday'|'custom'
  customWorkingDays:string[]
}

export type ExistingOrganization={
  id:string
  name:string
  industry:string|null
  country:string|null
  website:string|null
  email:string|null
  phone:string|null
  address:string|null
  timezone:string|null
  currency:string|null
  working_week:string|null
  working_days:string[]|null
}

export async function findUserOrganization(userId:string){
  const {data:membership,error:membershipError}=await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id',userId)
    .not('organization_id','is',null)
    .limit(1)
    .maybeSingle()
  if(membershipError)throw membershipError

  if(membership?.organization_id){
    const {data,error}=await supabase.from('organizations').select('*').eq('id',membership.organization_id).maybeSingle()
    if(error)throw error
    return data as ExistingOrganization|null
  }

  const {data,error}=await supabase.from('organizations').select('*').eq('created_by',userId).limit(1).maybeSingle()
  if(error)throw error
  return data as ExistingOrganization|null
}

export async function saveSetupOrganization(input:OrganizationSetupInput){
  const {data,error}=await supabase.rpc('save_workspace_setup_organization',{
    p_name:input.name.trim(),
    p_industry:input.industry,
    p_country:input.country,
    p_website:input.website.trim()||null,
    p_email:input.email.trim().toLowerCase()||null,
    p_phone:input.phone.trim()||null,
    p_address:input.address.trim()||null,
    p_timezone:input.timezone,
    p_currency:input.currency,
    p_working_week:input.workingWeek,
    p_working_days:input.customWorkingDays
  })
  if(error)throw error
  return data as {organizationId:string;created:boolean;slug:string}
}
