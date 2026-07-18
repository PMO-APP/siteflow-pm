import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOrganization,
  getOrganization,
  listOrganizationEngagements,
  listOrganizationInvitations,
  listOrganizationMembers,
  listOrganizationProjects,
  listOrganizations,
  updateOrganization,
} from '../services/organization.service';

export const organizationKeys = {
  all: ['organizations'] as const,
  detail: (id: string) => ['organizations', id] as const,
  members: (id: string) => ['organizations', id, 'members'] as const,
  projects: (id: string) => ['organizations', id, 'projects'] as const,
  engagements: (id: string) => ['organizations', id, 'engagements'] as const,
  invitations: (id: string) => ['organizations', id, 'invitations'] as const,
};

export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.all,
    queryFn: listOrganizations,
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: organizationKeys.detail(id),
    queryFn: () => getOrganization(id),
    enabled: Boolean(id),
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}

export function useUpdateOrganization(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof updateOrganization>[1]) =>
      updateOrganization(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(id) });
    },
  });
}

export function useOrganizationMembers(id: string) {
  return useQuery({
    queryKey: organizationKeys.members(id),
    queryFn: () => listOrganizationMembers(id),
    enabled: Boolean(id),
  });
}

export function useOrganizationProjects(id: string) {
  return useQuery({
    queryKey: organizationKeys.projects(id),
    queryFn: () => listOrganizationProjects(id),
    enabled: Boolean(id),
  });
}

export function useOrganizationEngagements(id: string) {
  return useQuery({
    queryKey: organizationKeys.engagements(id),
    queryFn: () => listOrganizationEngagements(id),
    enabled: Boolean(id),
  });
}

export function useOrganizationInvitations(id: string) {
  return useQuery({
    queryKey: organizationKeys.invitations(id),
    queryFn: () => listOrganizationInvitations(id),
    enabled: Boolean(id),
  });
}
