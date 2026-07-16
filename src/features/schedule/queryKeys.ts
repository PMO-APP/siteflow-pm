export const scheduleQueryKeys = {
  all: ['tasks'] as const,
  project: (projectId: number | string | null | undefined) =>
    ['tasks', projectId] as const,
}
