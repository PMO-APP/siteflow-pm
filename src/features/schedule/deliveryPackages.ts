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
  created_at?: string
  updated_at?: string
}

export interface CreateDeliveryPackageInput {
  name: string
  code?: string
  discipline: DeliveryPackageDiscipline
  package_type: DeliveryPackageType
  contractor_name?: string
  weight_pct?: number
  planned_start?: string
  planned_finish?: string
  is_shared?: boolean
}

export const deliveryPackageKeys = {
  project: (projectId: number | string | null | undefined) => ['delivery-packages', projectId] as const,
}

export function useDeliveryPackages() {
  const { projectId } = useProjectStore()
  return useQuery({
    queryKey: deliveryPackageKeys.project(projectId),
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from('delivery_packages')
        .select('*')
        .eq('project_id', projectId)
        .order('discipline')
        .order('name')
      if (error) throw error
      return (data || []) as DeliveryPackage[]
    },
  })
}

export function useCreateDeliveryPackage() {
  const { projectId } = useProjectStore()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateDeliveryPackageInput) => {
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
          status: 'Active',
        })
        .select('*')
        .single()
      if (error) throw error
      return data as DeliveryPackage
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryPackageKeys.project(projectId) }),
  })
}
