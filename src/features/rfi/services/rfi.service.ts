import { supabase } from '@/lib/supabase'
import type { CreateRFIInput, RFI, RFIFilters, RFIStatus, UpdateRFIInput } from '../types'

export async function listRFIs(projectId: number, filters: RFIFilters = {}): Promise<RFI[]> {
  let query = supabase
    .from('rfis')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.priority && filters.priority !== 'all') query = query.eq('priority', filters.priority)
  if (filters.discipline && filters.discipline !== 'all') query = query.eq('discipline', filters.discipline)

  if (filters.search?.trim()) {
    const term = filters.search.trim().replace(/[%(),]/g, ' ')
    query = query.or(`reference_no.ilike.%${term}%,title.ilike.%${term}%,question.ilike.%${term}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as RFI[]
}

export async function getRFI(id: string): Promise<RFI> {
  const { data, error } = await supabase.from('rfis').select('*').eq('id', id).single()
  if (error) throw error
  return data as RFI
}

export async function createRFI(input: CreateRFIInput): Promise<RFI> {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!auth.user) throw new Error('You must be signed in to create an RFI.')

  const { data, error } = await supabase
    .from('rfis')
    .insert({ ...input, created_by: auth.user.id })
    .select('*')
    .single()

  if (error) throw error
  return data as RFI
}

export async function updateRFI(id: string, values: UpdateRFIInput | Partial<RFI>): Promise<RFI> {
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
    if (!response?.trim()) throw new Error('A response is required before the RFI can be answered.')
    patch.answered_at = now
    patch.response = response.trim()
  }
  if (status === 'Closed') patch.closed_at = now

  return updateRFI(id, patch)
}
