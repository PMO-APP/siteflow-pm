import { supabase } from '@/lib/supabase'
import type { CreateRFIInput, RFI, RFIStatus } from '../types'

export async function listRFIs(projectId: number): Promise<RFI[]> {
  const { data, error } = await supabase.from('rfis').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as RFI[]
}
export async function getRFI(id: string): Promise<RFI> {
  const { data, error } = await supabase.from('rfis').select('*').eq('id', id).single()
  if (error) throw error
  return data as RFI
}
export async function createRFI(input: CreateRFIInput): Promise<RFI> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('You must be signed in.')
  const { data, error } = await supabase.from('rfis').insert({ ...input, created_by: auth.user.id }).select('*').single()
  if (error) throw error
  return data as RFI
}
export async function updateRFI(id: string, values: Partial<RFI>): Promise<RFI> {
  const { data, error } = await supabase.from('rfis').update(values).eq('id', id).select('*').single()
  if (error) throw error
  return data as RFI
}
export async function transitionRFI(id: string, status: RFIStatus, response?: string): Promise<RFI> {
  const now = new Date().toISOString()
  const patch: Partial<RFI> = { status }
  if (status === 'Submitted') patch.submitted_at = now
  if (status === 'Answered') { patch.answered_at = now; patch.response = response || null }
  if (status === 'Closed') patch.closed_at = now
  return updateRFI(id, patch)
}
