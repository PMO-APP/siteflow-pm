/**
 * Compatibility export.
 *
 * Schedule ownership now lives in `src/features/schedule`.
 * Existing pages can keep importing from `@/hooks/useTasks` during migration.
 */
export {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from '@/features/schedule'
