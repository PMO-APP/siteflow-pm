
import { supabase } from '@/lib/supabase'

export async function loadCanonicalInvitation(token:string){
  const {data,error}=await supabase.rpc('get_canonical_invitation_by_token',{
    p_token:token.trim(),
  })
  if(error)throw error
  return data
}

export async function completeCanonicalInvitation(input:{
  token:string
  fullName:string
}){
  const {data,error}=await supabase.rpc('accept_canonical_invitation',{
    p_token:input.token.trim(),
    p_full_name:input.fullName.trim(),
  })
  if(error)throw error
  return data as {
    workspaceId:string
    role:string
    scope:string
    accepted:boolean
  }
}
