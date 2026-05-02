import { create } from 'zustand'

interface ProjectState {
  projectId: number | null
  projectName: string
  setProject: (
    id: number,
    name: string
  ) => void
}

export const useProjectStore =
create<ProjectState>(set => ({
  projectId: Number(
    localStorage.getItem(
      'projectId'
    )
  ) || 1,

  projectName:
    localStorage.getItem(
      'projectName'
    ) || 'Lakowe Spa',

  setProject: (
    id,
    name
  ) => {
    localStorage.setItem(
      'projectId',
      String(id)
    )

    localStorage.setItem(
      'projectName',
      name
    )

    set({
      projectId: id,
      projectName: name
    })
  }
}))
