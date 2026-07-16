import type { Task } from '@/types'
import { computeRAG } from '@/lib/utils'

export function enrichScheduleTask(task: Task): Task {
  return {
    ...task,
    rag:
      task.status === 'Completed'
        ? ''
        : task.rag || computeRAG(task),
  }
}

export function sortTasksByNumber(tasks: Task[]) {
  return [...tasks].sort(
    (a, b) => Number(a.task_number || 0) - Number(b.task_number || 0)
  )
}
