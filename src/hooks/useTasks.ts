import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import { useAuthStore } from '@/store/auth'
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/types'
import { computeRAG } from '@/lib/utils'
import { activityBuilders } from '@/core/activity/activityBuilders'
import { recordActivitySafely } from '@/core/activity/activityService'

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

      return ((data || []) as Task[]).map((task: Task) => ({
        ...task,
        rag:
          task.status === 'Completed'
            ? ''
            : task.rag || computeRAG(task),
      }))
    },
  })
}

export const useCreateTask = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      if (!projectId) {
        throw new Error('No project selected')
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          project_id: projectId,
        })
        .select()
        .single()

      if (error) throw error

      return data
    },

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['tasks', projectId],
      })
    },
  })
}

export const useUpdateTask = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()
  const role = useMembershipStore(state => state.role)
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Task> & { id: string }) => {
      if (!projectId) {
        throw new Error('No project selected')
      }

      const { data: existingTask, error: fetchError } =
        await supabase
          .from('tasks')
          .select('*')
          .eq('id', id)
          .eq('project_id', projectId)
          .single()

      if (fetchError) throw fetchError

      const previousProgress = Number(
        existingTask?.progress_pct || 0
      )

      const newProgress =
        updates.progress_pct !== undefined
          ? Number(updates.progress_pct || 0)
          : previousProgress

      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('project_id', projectId)
        .select()
        .single()

      if (error) throw error

      if (newProgress !== previousProgress) {
        const { error: progressLogError } = await supabase
          .from('task_progress_logs')
          .insert({
            project_id: projectId,
            task_id: id,
            schedule_revision_id:
              (existingTask as any)
                ?.schedule_revision_id || null,
            block_id:
              (existingTask as any)?.block_id || null,
            previous_progress: previousProgress,
            new_progress: newProgress,
            delay_reason: null,
            recovery_action: null,
            comments:
              (updates as any).notes ||
              `Progress updated from ${previousProgress}% to ${newProgress}%`,
            updated_by: user?.id || null,
            updated_by_role: role || null,
          })

        if (progressLogError) {
          console.error(
            'Unable to save task progress log:',
            progressLogError
          )
        }

        await recordActivitySafely(
          activityBuilders.taskProgressUpdated(
            {
              projectId,
              actorId: user?.id || null,
              actorName:
                user?.user_metadata?.full_name ||
                user?.email ||
                null,
              actorRole: role || null,
            },
            {
              id,
              name: existingTask?.name || null,
              previousProgress,
              newProgress,
            }
          )
        )
      }

      return data
    },

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['tasks', projectId],
      })

      qc.invalidateQueries({
        queryKey: ['weekly_reports', projectId],
      })

      qc.invalidateQueries({
        queryKey: ['activity-feed', projectId],
      })

      qc.invalidateQueries({
        queryKey: [
          'project-health-history',
          projectId,
        ],
      })
    },
  })
}

export const useDeleteTask = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!projectId) {
        throw new Error('No project selected')
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('project_id', projectId)

      if (error) throw error
    },

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['tasks', projectId],
      })
    },
  })
}
