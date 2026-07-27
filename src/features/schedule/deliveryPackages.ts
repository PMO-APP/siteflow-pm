import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'

export type DeliveryPackageDiscipline = 'Housebuild' | 'MEP' | 'Infrastructure'
export type DeliveryPackageType = 'Block' | 'Shared' | 'Other'

export interface DeliveryPackage {
  id: string
  project_id: number
  name: string
  code?: string | null
  discipline: DeliveryPackageDiscipline
  package_type: DeliveryPackageType
  contractor_name?: string | null
  weight_pct: number
  planned_start?: string | null
  planned_finish?: string | null
  status: 'Active' | 'On Hold' | 'Completed'
  is_shared: boolean
  archived_at?: string | null
  archived_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface DeliveryPackageInput {
  name: string
  code?: string
  discipline: DeliveryPackageDiscipline
  package_type: DeliveryPackageType
  contractor_name?: string
  weight_pct?: number
  planned_start?: string
  planned_finish?: string
  status?: DeliveryPackage['status']
  is_shared?: boolean
}

export const deliveryPackageKeys = {
  project: (projectId: number | string | null | undefined, includeArchived = false) => ['delivery-packages', projectId, includeArchived] as const,
}

export function useDeliveryPackages(includeArchived = false) {
  const { projectId } = useProjectStore()
  return useQuery({
    queryKey: deliveryPackageKeys.project(projectId, includeArchived),
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) return []
      let query = supabase
        .from('delivery_packages')
        .select('*')
        .eq('project_id', projectId)
        .order('discipline')
        .order('name')
      if (!includeArchived) query = query.is('archived_at', null)
      const { data, error } = await query
      if (error) throw error
      return (data || []) as DeliveryPackage[]
    },
  })
}

function invalidatePackages(queryClient: ReturnType<typeof useQueryClient>, projectId: number | string | null | undefined) {
  return queryClient.invalidateQueries({ queryKey: ['delivery-packages', projectId] })
}

export function useCreateDeliveryPackage() {
  const { projectId } = useProjectStore()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DeliveryPackageInput) => {
      if (!projectId) throw new Error('No project selected.')
      const { data, error } = await supabase
        .from('delivery_packages')
        .insert({
          project_id: projectId,
          name: input.name.trim(),
          code: input.code?.trim() || null,
          discipline: input.discipline,
          package_type: input.package_type,
          contractor_name: input.contractor_name?.trim() || null,
          weight_pct: Number(input.weight_pct || 0),
          planned_start: input.planned_start || null,
          planned_finish: input.planned_finish || null,
          is_shared: input.is_shared ?? input.discipline !== 'Housebuild',
          status: input.status || 'Active',
        })
        .select('*')
        .single()
      if (error) throw error
      return data as DeliveryPackage
    },
    onSuccess: () => invalidatePackages(queryClient, projectId),
  })
}

export function useUpdateDeliveryPackage() {
  const { projectId } = useProjectStore()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: DeliveryPackageInput }) => {
      const { data, error } = await supabase
        .from('delivery_packages')
        .update({
          name: input.name.trim(),
          code: input.code?.trim() || null,
          discipline: input.discipline,
          package_type: input.package_type,
          contractor_name: input.contractor_name?.trim() || null,
          weight_pct: Number(input.weight_pct || 0),
          planned_start: input.planned_start || null,
          planned_finish: input.planned_finish || null,
          status: input.status || 'Active',
          is_shared: input.is_shared ?? input.discipline !== 'Housebuild',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data as DeliveryPackage
    },
    onSuccess: () => invalidatePackages(queryClient, projectId),
  })
}

export function useArchiveDeliveryPackage() {
  const { projectId } = useProjectStore()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, restore = false }: { id: string; restore?: boolean }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('delivery_packages')
        .update({
          archived_at: restore ? null : new Date().toISOString(),
          archived_by: restore ? null : userData.user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidatePackages(queryClient, projectId),
  })
}

export function useDeleteDeliveryPackage() {
  const { projectId } = useProjectStore()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('admin_delete_delivery_package', { package_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      invalidatePackages(queryClient, projectId)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['schedule-versions'] })
    },
  })
}
