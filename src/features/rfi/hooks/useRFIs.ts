import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRFI, getRFI, listRFIs, transitionRFI, updateRFI } from '../services/rfi.service'
import type { CreateRFIInput, RFI, RFIFilters, RFIStatus, UpdateRFIInput } from '../types'

export const rfiKeys = {
  all: ['rfis'] as const,
  lists: () => [...rfiKeys.all, 'list'] as const,
  list: (projectId: number, filters: RFIFilters = {}) => [...rfiKeys.lists(), projectId, filters] as const,
  details: () => [...rfiKeys.all, 'detail'] as const,
  detail: (id: string) => [...rfiKeys.details(), id] as const,
}

export function useRFIs(projectId: number | null, filters: RFIFilters = {}) {
  return useQuery({
    queryKey: rfiKeys.list(projectId ?? 0, filters),
    queryFn: () => listRFIs(projectId as number, filters),
    enabled: Boolean(projectId),
  })
}

export function useRFI(id?: string) {
  return useQuery({
    queryKey: rfiKeys.detail(id ?? ''),
    queryFn: () => getRFI(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateRFI() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CreateRFIInput) => createRFI(values),
    onSuccess: (rfi) => {
      queryClient.invalidateQueries({ queryKey: rfiKeys.lists() })
      queryClient.setQueryData(rfiKeys.detail(rfi.id), rfi)
    },
  })
}

export function useUpdateRFI() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateRFIInput | Partial<RFI> }) => updateRFI(id, values),
    onSuccess: (rfi) => {
      queryClient.invalidateQueries({ queryKey: rfiKeys.lists() })
      queryClient.setQueryData(rfiKeys.detail(rfi.id), rfi)
    },
  })
}

export function useTransitionRFI() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, response }: { id: string; status: RFIStatus; response?: string }) =>
      transitionRFI(id, status, response),
    onSuccess: (rfi) => {
      queryClient.invalidateQueries({ queryKey: rfiKeys.lists() })
      queryClient.setQueryData(rfiKeys.detail(rfi.id), rfi)
    },
  })
}
