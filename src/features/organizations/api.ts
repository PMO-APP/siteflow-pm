import { supabase } from '@/lib/supabase'
import type { Organization, OrganizationType } from './types'

export interface CreateOrganizationInput {
  name: string
  organization_type: OrganizationType
  email?: string
  phone?: string
  registration_number?: string
  address?: string
}

export async function listOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('name')

  if (error) throw error
  return (data || []) as Organization[]
}

export async function createOrganization(input: CreateOrganizationInput) {
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      ...input,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      registration_number: input.registration_number?.trim() || null,
      address: input.address?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as Organization
}

export async function updateOrganizationStatus(
  id: number,
  status: Organization['status']
) {
  const { data, error } = await supabase
    .from('organizations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as Organization
}

export async function listOrganizationEngagements(organizationId: number) {
  const { data, error } = await supabase
    .from('organization_engagements')
    .select('*, projects(id, name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function listOrganizationUsers(organizationId: number) {
  const { data, error } = await supabase
    .from('organization_users')
    .select('*')
    .eq('organization_id', organizationId)
    .order('full_name')

  if (error) throw error
  return data || []
}
