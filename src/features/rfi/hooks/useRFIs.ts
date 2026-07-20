import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addRFIComment,
  createRFI,
  getRFI,
  listRFIComments,
  listRFIHistory,
  listRFIs,
  transitionRFI,
  updateRFI,
} from '../services/rfi.service'
import type { CreateRFIInput, RFI, RFIStatus } from '../types'

export const rfiKeys = {
  all: ['rfis'] as const,
  list: (projectId: number) => ['rfis', 'list', projectId] as const,
  detail: (id: string) => ['rfis', 'detail', id] as const,
  comments: (id: string) => ['rfis', 'comments', id] as const,
  history: (id: string) => ['rfis', 'history', id] as const,
}

export const useRFIs = (projectId: number | null) =>
  useQuery({
    queryKey: rfiKeys.list(projectId || 0),
    queryFn: () => listRFIs(projectId as number),
    enabled: !!projectId,
  })

export const useRFI = (id?: string) =>
  useQuery({
    queryKey: rfiKeys.detail(id || ''),
    queryFn: () => getRFI(id as string),
    enabled: !!id,
  })

export const useRFIComments = (id?: string) =>
  useQuery({
    queryKey: rfiKeys.comments(id || ''),
    queryFn: () => listRFIComments(id as string),
    enabled: !!id,
  })

export const useRFIHistory = (id?: string) =>
  useQuery({
    queryKey: rfiKeys.history(id || ''),
    queryFn: () => listRFIHistory(id as string),
    enabled: !!id,
  })

export function useCreateRFI() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: CreateRFIInput) => createRFI(values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rfiKeys.all }),
  })
}

export function useUpdateRFI() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<RFI> }) => updateRFI(id, values),
    onSuccess: rfi => {
      queryClient.invalidateQueries({ queryKey: rfiKeys.all })
      queryClient.setQueryData(rfiKeys.detail(rfi.id), rfi)
      queryClient.invalidateQueries({ queryKey: rfiKeys.history(rfi.id) })
    },
  })
}

export function useTransitionRFI() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, response }: { id: string; status: RFIStatus; response?: string }) =>
      transitionRFI(id, status, response),
    onSuccess: rfi => {
      queryClient.invalidateQueries({ queryKey: rfiKeys.all })
      queryClient.setQueryData(rfiKeys.detail(rfi.id), rfi)
      queryClient.invalidateQueries({ queryKey: rfiKeys.history(rfi.id) })
    },
  })
}

export function useAddRFIComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ rfiId, body }: { rfiId: string; body: string }) => addRFIComment(rfiId, body),
    onSuccess: comment => {
      queryClient.invalidateQueries({ queryKey: rfiKeys.comments(comment.rfi_id) })
      queryClient.invalidateQueries({ queryKey: rfiKeys.history(comment.rfi_id) })
    },
  })
}
