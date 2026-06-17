import { create } from 'zustand'

interface ProjectState {
  projectId: number | null
  projectName: string

  organizationId: number | null

  portfolioId: number | null

  projectOwnerEmail: string | null

  housebuildOwnerEmail: string | null

  mepOwnerEmail: string | null

  infrastructureOwnerEmail: string | null

  setProject: (
    id: number,
    name: string,
    organizationId?: number | null,
    portfolioId?: number | null,

    projectOwnerEmail?: string | null,

    housebuildOwnerEmail?: string | null,

    mepOwnerEmail?: string | null,

    infrastructureOwnerEmail?: string | null
  ) => void

  clearProject: () => void
}

export const useProjectStore = create<ProjectState>(set => ({
  projectId: localStorage.getItem('projectId')
    ? Number(localStorage.getItem('projectId'))
    : null,

  projectName:
    localStorage.getItem('projectName') || '',

  organizationId: localStorage.getItem('organizationId')
    ? Number(localStorage.getItem('organizationId'))
    : null,

  portfolioId: localStorage.getItem('portfolioId')
    ? Number(localStorage.getItem('portfolioId'))
    : null,

  projectOwnerEmail:
    localStorage.getItem('projectOwnerEmail') || null,

  housebuildOwnerEmail:
    localStorage.getItem('housebuildOwnerEmail') || null,

  mepOwnerEmail:
    localStorage.getItem('mepOwnerEmail') || null,

  infrastructureOwnerEmail:
    localStorage.getItem('infrastructureOwnerEmail') || null,

  setProject: (
    id,
    name,
    organizationId = null,
    portfolioId = null,

    projectOwnerEmail = null,

    housebuildOwnerEmail = null,

    mepOwnerEmail = null,

    infrastructureOwnerEmail = null
  ) => {
    localStorage.setItem('projectId', String(id))
    localStorage.setItem('projectName', name)

    if (organizationId) {
      localStorage.setItem(
        'organizationId',
        String(organizationId)
      )
    } else {
      localStorage.removeItem('organizationId')
    }

    if (portfolioId) {
      localStorage.setItem(
        'portfolioId',
        String(portfolioId)
      )
    } else {
      localStorage.removeItem('portfolioId')
    }

    if (projectOwnerEmail) {
      localStorage.setItem(
        'projectOwnerEmail',
        projectOwnerEmail
      )
    } else {
      localStorage.removeItem('projectOwnerEmail')
    }

    if (housebuildOwnerEmail) {
      localStorage.setItem(
        'housebuildOwnerEmail',
        housebuildOwnerEmail
      )
    } else {
      localStorage.removeItem(
        'housebuildOwnerEmail'
      )
    }

    if (mepOwnerEmail) {
      localStorage.setItem(
        'mepOwnerEmail',
        mepOwnerEmail
      )
    } else {
      localStorage.removeItem(
        'mepOwnerEmail'
      )
    }

    if (infrastructureOwnerEmail) {
      localStorage.setItem(
        'infrastructureOwnerEmail',
        infrastructureOwnerEmail
      )
    } else {
      localStorage.removeItem(
        'infrastructureOwnerEmail'
      )
    }

    set({
      projectId: id,
      projectName: name,

      organizationId,

      portfolioId,

      projectOwnerEmail,

      housebuildOwnerEmail,

      mepOwnerEmail,

      infrastructureOwnerEmail,
    })
  },

  clearProject: () => {
    localStorage.removeItem('projectId')
    localStorage.removeItem('projectName')

    localStorage.removeItem('organizationId')

    localStorage.removeItem('portfolioId')

    localStorage.removeItem('projectOwnerEmail')

    localStorage.removeItem(
      'housebuildOwnerEmail'
    )

    localStorage.removeItem(
      'mepOwnerEmail'
    )

    localStorage.removeItem(
      'infrastructureOwnerEmail'
    )

    set({
      projectId: null,

      projectName: '',

      organizationId: null,

      portfolioId: null,

      projectOwnerEmail: null,

      housebuildOwnerEmail: null,

      mepOwnerEmail: null,

      infrastructureOwnerEmail: null,
    })
  },
}))
