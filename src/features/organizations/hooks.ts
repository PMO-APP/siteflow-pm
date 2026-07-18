import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOrganization,
  listOrganizationEngagements,
  listOrganizations,
  listOrganizationUsers,
  updateOrganizationStatus,
} from './api'

export const organizationKeys = {
  all: ['organizations'] as const,
  list: () => [...organizationKeys.all, 'list'] as const,
  users: (organizationId: number) =>
    [...organizationKeys.all, organizationId, 'users'] as const,
  engagements: (organizationId: number) =>
    [...organizationKeys.all, organizationId, 'engagements'] as const,
}

export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: listOrganizations,
  })
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createOrganization,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  })
}

export function useUpdateOrganizationStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'suspended' | 'inactive' }) =>
      updateOrganizationStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organizationKeys.all }),
  })
}

export function useOrganizationUsers(organizationId: number | null) {
  return useQuery({
    queryKey: organizationKeys.users(organizationId || 0),
    queryFn: () => listOrganizationUsers(organizationId as number),
    enabled: Boolean(organizationId),
  })
}

export function useOrganizationEngagements(organizationId: number | null) {
  return useQuery({
    queryKey: organizationKeys.engagements(organizationId || 0),
    queryFn: () => listOrganizationEngagements(organizationId as number),
    enabled: Boolean(organizationId),
  })
}
