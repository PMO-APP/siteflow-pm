import { supabase } from '../../../lib/supabase';
import type {
  Organization,
  OrganizationEngagement,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationProjectMembership,
} from '../types/organization.types';

export interface OrganizationInput {
  name: string;
  code?: string | null;
  organization_type: Organization['organization_type'];
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status?: Organization['status'];
}

export async function listOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function getOrganization(id: string): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createOrganization(input: OrganizationInput): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      ...input,
      status: input.status ?? 'active',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrganization(
  id: string,
  input: Partial<OrganizationInput>,
): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMember[]> {
  const { data, error } = await supabase
    .from('organization_users')
    .select(`
      *,
      profile:profiles(full_name, email)
    `)
    .eq('organization_id', organizationId)
    .order('created_at');

  if (error) throw error;
  return data ?? [];
}

export async function listOrganizationProjects(
  organizationId: string,
): Promise<OrganizationProjectMembership[]> {
  const { data, error } = await supabase
    .from('organization_project_memberships')
    .select(`
      *,
      project:projects(id, name)
    `)
    .eq('organization_id', organizationId)
    .order('created_at');

  if (error) throw error;
  return data ?? [];
}

export async function listOrganizationEngagements(
  organizationId: string,
): Promise<OrganizationEngagement[]> {
  const { data, error } = await supabase
    .from('organization_engagements')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listOrganizationInvitations(
  organizationId: string,
): Promise<OrganizationInvitation[]> {
  const { data, error } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
