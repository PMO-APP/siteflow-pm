import { supabase } from '@/lib/supabase'
import type { CreateRFIInput, RFI, RFIFilters, RFIStatus, UpdateRFIInput } from '../types'
import { getAllowedRFITransitions } from '../utils/rfi.utils'

export async function listRFIs(projectId: number, filters: RFIFilters = {}): Promise<RFI[]> {
  let query = supabase
    .from('rfis')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (filters.status && filters.status !== 'All') query = query.eq('status', filters.status)
  if (filters.priority && filters.priority !== 'All') query = query.eq('priority', filters.priority)
  if (filters.discipline && filters.discipline !== 'All') query = query.eq('discipline', filters.discipline)

  const { data, error } = await query
  if (error) throw error

  const rows = (data || []) as RFI[]
  const search = filters.search?.trim().toLowerCase()
  if (!search) return rows

  return rows.filter(rfi =>
    [rfi.reference_no, rfi.title, rfi.question, rfi.discipline]
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(search))
  )
}

export async function getRFI(id: string): Promise<RFI> {
  const { data, error } = await supabase.from('rfis').select('*').eq('id', id).single()
  if (error) throw error
  return data as RFI
}

export async function createRFI(input: CreateRFIInput): Promise<RFI> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('You must be signed in.')

  const payload = {
    ...input,
    title: input.title.trim(),
    question: input.question.trim(),
    created_by: auth.user.id,
  }

  const { data, error } = await supabase.from('rfis').insert(payload).select('*').single()
  if (error) throw error
  return data as RFI
}

export async function updateRFI(id: string, values: UpdateRFIInput): Promise<RFI> {
  const payload = {
    ...values,
    ...(values.title !== undefined ? { title: values.title.trim() } : {}),
    ...(values.question !== undefined ? { question: values.question.trim() } : {}),
  }

  const { data, error } = await supabase.from('rfis').update(payload).eq('id', id).select('*').single()
  if (error) throw error
  return data as RFI
}

export async function transitionRFI(id: string, status: RFIStatus, response?: string): Promise<RFI> {
  const current = await getRFI(id)
  const allowed = getAllowedRFITransitions(current.status)
  if (!allowed.includes(status)) {
    throw new Error(`An RFI cannot move from ${current.status} to ${status}.`)
  }

  if (status === 'Answered' && !response?.trim()) {
    throw new Error('Enter the formal response before answering the RFI.')
  }

  const now = new Date().toISOString()
  const patch: Record<string, string | null> = { status }
  if (status === 'Submitted') patch.submitted_at = now
  if (status === 'Answered') {
    patch.answered_at = now
    patch.response = response!.trim()
  }
  if (status === 'Closed') patch.closed_at = now

  const { data, error } = await supabase.from('rfis').update(patch).eq('id', id).select('*').single()
  if (error) throw error
  return data as RFI
}
