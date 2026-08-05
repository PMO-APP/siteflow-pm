
import { create } from 'zustand'
import type { CanonicalAccessAssignment,CanonicalAccessSession } from '@/access/accessTypes'
import { projectIdsFromAssignments } from '@/access/accessService'

export type AccessScope = 'workspace' | 'portfolio' | 'project' | null

interface MembershipState {
  role: string | null
  permissionProfileKey: string | null
  discipline: string | null
  accessScope: AccessScope
  portfolioId: number | null
  projectId: number | null
  projectIds: number[]
  workspaceId: string | null
  assignments: CanonicalAccessAssignment[]
  loading: boolean
  setMembership: (membership:{
    role:string|null
    accessScope:AccessScope
    portfolioId?:number|null
    projectId?:number|null
    projectIds?:number[]
  })=>void
  setCanonicalMembership:(session:CanonicalAccessSession)=>void
  clearMembership:()=>void
}

export const useMembershipStore=create<MembershipState>(set=>({
  role:null,
  permissionProfileKey:null,
  discipline:null,
  accessScope:null,
  portfolioId:null,
  projectId:null,
  projectIds:[],
  workspaceId:null,
  assignments:[],
  loading:true,

  // Compatibility setter retained while older pages are migrated.
  setMembership:(membership)=>set({
    role:membership.role,
    accessScope:membership.accessScope,
    portfolioId:membership.portfolioId??null,
    projectId:membership.projectId??null,
    projectIds:membership.projectIds??[],
    loading:false,
  }),

  setCanonicalMembership:(session)=>{
    const projects=projectIdsFromAssignments(session.assignments)
    const firstProject=projects[0]??null
    const portfolioAssignment=session.assignments.find(item=>item.scopeType==='portfolio')
    const hasWorkspace=session.assignments.some(item=>item.scopeType==='workspace')

    set({
      role:session.role,
      permissionProfileKey:session.permissionProfileKey,
      discipline:session.discipline,
      accessScope:hasWorkspace?'workspace':portfolioAssignment?'portfolio':firstProject!==null?'project':null,
      portfolioId:portfolioAssignment?.scopeId?Number(portfolioAssignment.scopeId):null,
      projectId:firstProject,
      projectIds:projects,
      workspaceId:session.workspaceId,
      assignments:session.assignments,
      loading:session.loading,
    })
  },

  clearMembership:()=>set({
    role:null,
    permissionProfileKey:null,
    discipline:null,
    accessScope:null,
    portfolioId:null,
    projectId:null,
    projectIds:[],
    workspaceId:null,
    assignments:[],
    loading:false,
  }),
}))
