import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'

export function useDecisionQueue() {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['decision-queue', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decision_queue')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['open', 'in_review'])
        .order('priority_rank', { ascending: false })
        .order('due_date', { ascending: true })

      if (error) throw error
      return data || []
    },
  })
}

export function useUpdateDecisionStatus() {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string
      status:
        | 'open'
        | 'in_review'
        | 'approved'
        | 'rejected'
        | 'closed'
    }) => {
      const { data, error } = await supabase
        .from('decision_queue')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['decision-queue', projectId],
      })
    },
  })
}
