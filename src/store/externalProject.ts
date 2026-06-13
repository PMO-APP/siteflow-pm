import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ExternalProjectState = {
  externalProjectId: number | null
  externalProjectName: string | null
  setExternalProject: (id: number, name: string) => void
  clearExternalProject: () => void
}

export const useExternalProjectStore = create<ExternalProjectState>()(
  persist(
    set => ({
      externalProjectId: null,
      externalProjectName: null,

      setExternalProject: (id, name) =>
        set({
          externalProjectId: id,
          externalProjectName: name,
        }),

      clearExternalProject: () =>
        set({
          externalProjectId: null,
          externalProjectName: null,
        }),
    }),
    {
      name: 'pmocorex-external-project',
    }
  )
)
