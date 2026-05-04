import { create } from 'zustand'

interface ProjectState {
  projectId: number | null
  projectName: string
  setProject: (id: number, name: string) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectState>(set => ({
  projectId: localStorage.getItem('projectId')
    ? Number(localStorage.getItem('projectId'))
    : null,

  projectName: localStorage.getItem('projectName') || '',

  setProject: (id, name) => {
    localStorage.setItem('projectId', String(id))
    localStorage.setItem('projectName', name)

    set({
      projectId: id,
      projectName: name
    })
  },

  clearProject: () => {
    localStorage.removeItem('projectId')
    localStorage.removeItem('projectName')

    set({
      projectId: null,
      projectName: ''
    })
  }
}))
