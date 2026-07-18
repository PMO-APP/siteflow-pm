import { create } from 'zustand'

export type AccessScope = 'workspace' | 'portfolio' | 'project' | null

interface MembershipState {
  role: string | null
  accessScope: AccessScope
  portfolioId: number | null
  projectId: number | null
  projectIds: number[]
  setMembership: (membership:{
    role:string|null
    accessScope:AccessScope
    portfolioId?:number|null
    projectId?:number|null
    projectIds?:number[]
  })=>void
  clearMembership:()=>void
}

export const useMembershipStore=create<MembershipState>(set=>({
 role:null,
 accessScope:null,
 portfolioId:null,
 projectId:null,
 projectIds:[],
 setMembership:(m)=>set({
   role:m.role,
   accessScope:m.accessScope,
   portfolioId:m.portfolioId??null,
   projectId:m.projectId??null,
   projectIds:m.projectIds??[],
 }),
 clearMembership:()=>set({
   role:null,
   accessScope:null,
   portfolioId:null,
   projectId:null,
   projectIds:[],
 })
}))
