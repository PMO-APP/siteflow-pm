import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { useMembershipStore } from '@/store/membership'
import { useAuthStore } from '@/store/auth'
import type { Task } from '@/types'
import { activityBuilders } from '@/core/activity/activityBuilders'
import { recordActivitySafely } from '@/core/activity/activityService'
import {
  createProjectTask,
  deleteProjectTask,
  fetchProjectTask,
  fetchProjectTasks,
  updateProjectTask,
} from './api'
import { scheduleQueryKeys } from './queryKeys'
import { enrichScheduleTask } from './selectors'

export const useTasks = () => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: scheduleQueryKeys.project(projectId),
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) throw new Error('No project selected')
      const tasks = await fetchProjectTasks(projectId)
      return tasks.map(enrichScheduleTask)
    },
  })
}

export const useCreateTask = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      if (!projectId) throw new Error('No project selected')
      return createProjectTask(projectId, task)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleQueryKeys.project(projectId) })
    },
  })
}

export const useUpdateTask = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()
  const role = useMembershipStore(state => state.role)
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      if (!projectId) throw new Error('No project selected')

      const existingTask = await fetchProjectTask(projectId, id)
      const previousProgress = Number(existingTask?.progress_pct || 0)
      const newProgress =
        updates.progress_pct !== undefined
          ? Number(updates.progress_pct || 0)
          : previousProgress

      const data = await updateProjectTask(projectId, id, updates)

      if (newProgress !== previousProgress) {
        const { error: progressLogError } = await supabase
          .from('task_progress_logs')
          .insert({
            project_id: projectId,
            task_id: id,
            schedule_revision_id:
              (existingTask as any)?.schedule_revision_id || null,
            block_id: (existingTask as any)?.block_id || null,
            delivery_package_id: (existingTask as any)?.delivery_package_id || null,
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
          console.error('Unable to save task progress log:', progressLogError)
        }

        await recordActivitySafely(
          activityBuilders.taskProgressUpdated(
            {
              projectId,
              actorId: user?.id || null,
              actorName:
                user?.user_metadata?.full_name || user?.email || null,
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
      qc.invalidateQueries({ queryKey: scheduleQueryKeys.project(projectId) })
      qc.invalidateQueries({ queryKey: ['weekly_reports', projectId] })
      qc.invalidateQueries({ queryKey: ['activity-feed', projectId] })
      qc.invalidateQueries({ queryKey: ['project-health-history', projectId] })
    },
  })
}

export const useDeleteTask = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!projectId) throw new Error('No project selected')
      await deleteProjectTask(projectId, id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleQueryKeys.project(projectId) })
    },
  })
}
