import { supabase } from '@/lib/supabase'
import type {
  CreateRFIInput,
  RFI,
  RFIComment,
  RFIHistoryEvent,
  RFIStatus,
} from '../types'

async function currentActor() {
  const { data } = await supabase.auth.getUser()
  const user = data.user
  return {
    id: user?.id ?? null,
    name:
      user?.user_metadata?.full_name ??
      user?.user_metadata?.name ??
      user?.email ??
      null,
  }
}

export async function listRFIs(projectId: number): Promise<RFI[]> {
  const { data, error } = await supabase
    .from('rfis')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as RFI[]
}

export async function getRFI(id: string): Promise<RFI> {
  const { data, error } = await supabase.from('rfis').select('*').eq('id', id).single()
  if (error) throw error
  return data as RFI
}

export async function createRFI(input: CreateRFIInput): Promise<RFI> {
  const actor = await currentActor()
  if (!actor.id) throw new Error('You must be signed in.')
  const { data, error } = await supabase
    .from('rfis')
    .insert({ ...input, created_by: actor.id })
    .select('*')
    .single()
  if (error) throw error
  return data as RFI
}

export async function updateRFI(id: string, values: Partial<RFI>): Promise<RFI> {
  const { data, error } = await supabase
    .from('rfis')
    .update(values)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as RFI
}

export async function transitionRFI(id: string, status: RFIStatus, response?: string): Promise<RFI> {
  const now = new Date().toISOString()
  const patch: Partial<RFI> = { status }
  if (status === 'Submitted') patch.submitted_at = now
  if (status === 'Answered') {
    patch.answered_at = now
    patch.response = response?.trim() || null
  }
  if (status === 'Closed') patch.closed_at = now
  return updateRFI(id, patch)
}

export async function listRFIComments(rfiId: string): Promise<RFIComment[]> {
  const { data, error } = await supabase
    .from('rfi_comments')
    .select('*')
    .eq('rfi_id', rfiId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as RFIComment[]
}

export async function addRFIComment(rfiId: string, body: string): Promise<RFIComment> {
  const actor = await currentActor()
  if (!actor.id) throw new Error('You must be signed in.')
  const cleanBody = body.trim()
  if (!cleanBody) throw new Error('Comment cannot be empty.')

  const { data, error } = await supabase
    .from('rfi_comments')
    .insert({
      rfi_id: rfiId,
      body: cleanBody,
      author_id: actor.id,
      author_name: actor.name,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as RFIComment
}

export async function listRFIHistory(rfiId: string): Promise<RFIHistoryEvent[]> {
  const { data, error } = await supabase
    .from('rfi_history')
    .select('*')
    .eq('rfi_id', rfiId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as RFIHistoryEvent[]
}
