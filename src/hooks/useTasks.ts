import { useProjectStore } from '@/store/project'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types'
import { computeRAG } from '@/lib/utils'

export const useTasks = () => {
  const { projectId } =
    useProjectStore()

  return useQuery({
    queryKey: [
      'tasks',
      projectId
    ],

    enabled:
      !!projectId,

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from('tasks')
          .select('*')
          .eq(
            'project_id',
            projectId
          )
          .order(
            'task_number',
            {
              ascending: true
            }
          )

      if (error)
        throw error

      return (
        data as Task[]
      ).map(t => ({
        ...t,
        rag:
          t.status ===
          'Completed'
            ? ''
            : (
                t.rag ||
                computeRAG(
                  t
                )
              )
      }))
    },
  })
}

export const useUpdateTask = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({
  queryKey: ['tasks']
}),
  })
}

export const useCreateTask = () => {
  const qc = useQueryClient()
  const { projectId } =
    useProjectStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'duration_days'>) => {
      const { data, error } = await supabase.from('tasks').insert({
  ...task,
  project_id: projectId
}).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export const useDeleteTask = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
