import { create } from 'zustand'

interface ProjectState {
  projectId: number | null
  projectName: string
  organizationId: number | null
  portfolioId: number | null

  setProject: (
    id: number,
    name: string,
    organizationId?: number | null,
    portfolioId?: number | null
  ) => void

  clearProject: () => void
}

export const useProjectStore = create<ProjectState>(set => ({
  projectId:
    Number(localStorage.getItem('projectId')) || null,

  projectName:
    localStorage.getItem('projectName') || '',

  organizationId:
    Number(localStorage.getItem('organizationId')) || null,

  portfolioId:
    Number(localStorage.getItem('portfolioId')) || null,

  setProject: (
    id,
    name,
    organizationId = null,
    portfolioId = null
  ) => {
    localStorage.setItem('projectId', String(id))
    localStorage.setItem('projectName', name)

    if (organizationId) {
      localStorage.setItem('organizationId', String(organizationId))
    } else {
      localStorage.removeItem('organizationId')
    }

    if (portfolioId) {
      localStorage.setItem('portfolioId', String(portfolioId))
    } else {
      localStorage.removeItem('portfolioId')
    }

    set({
      projectId: id,
      projectName: name,
      organizationId,
      portfolioId,
    })
  },

  clearProject: () => {
    localStorage.removeItem('projectId')
    localStorage.removeItem('projectName')
    localStorage.removeItem('organizationId')
    localStorage.removeItem('portfolioId')

    set({
      projectId: null,
      projectName: '',
      organizationId: null,
      portfolioId: null,
    })
  },
}))
