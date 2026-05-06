import { useProjectStore } from '@/store/project'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types'
import { computeRAG } from '@/lib/utils'

export const useTasks = () => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['tasks', projectId],
    enabled: !!projectId,

    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('task_number', { ascending: true })

      if (error) throw error

      return (data as Task[]).map(t => ({
        ...t,
        rag:
          t.status === 'Completed'
            ? ''
            : t.rag || computeRAG(t),
      }))
    },
  })
}

export const useUpdateTask = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Task> & { id: string }) => {
      if (!projectId) throw new Error('No project selected')

      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          project_id: projectId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('project_id', projectId)
        .select()
        .single()

      if (error) {
        console.error('Update task error:', error)
        alert(error.message)
        throw error
      }

      return data
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })
}

export const useCreateTask = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (
      task: Omit<
        Task,
        'id' | 'created_at' | 'updated_at' | 'duration_days'
      >
    ) => {
      if (!projectId) throw new Error('No project selected')

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          project_id: projectId,
        })
        .select()
        .single()

      if (error) {
        console.error('Create task error:', error)
        alert(error.message)
        throw error
      }

      return data
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })
}

export const useDeleteTask = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!projectId) throw new Error('No project selected')

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('project_id', projectId)

      if (error) {
        console.error('Delete task error:', error)
        alert(error.message)
        throw error
      }
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })
}
