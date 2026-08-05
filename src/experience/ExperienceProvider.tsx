
import { createContext,useContext,useEffect,useMemo,useState } from 'react'
import { useLocation,useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useMembershipStore } from '@/store/membership'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { detectExperienceState,markFirstLoginComplete,recordExperienceEvent,upsertExperienceProfile } from './experienceService'
import type { ExperienceKind,ExperienceState } from './experienceTypes'

type ExperienceContextValue={
  state:ExperienceState
  refresh:()=>Promise<void>
  launch:(kind?:ExperienceKind)=>void
  dismissRecommendation:()=>void
}

const initial:ExperienceState={
  userId:null,workspaceId:null,role:null,audience:'member',isFirstLogin:false,isWorkspaceCreator:false,
  hasOrganization:false,hasWorkspace:false,hasPortfolio:false,hasProject:false,hasSchedule:false,
  setupCompleted:false,productTourCompleted:false,recommendedExperience:'product_tour',
  recommendedReason:'',loading:true,error:null
}

const ExperienceContext=createContext<ExperienceContextValue|null>(null)

export function useExperience(){
  const value=useContext(ExperienceContext)
  if(!value)throw new Error('useExperience must be used inside ExperienceProvider')
  return value
}

export default function ExperienceProvider({children}:{children:React.ReactNode}){
  const user=useAuthStore(s=>s.user)
  const role=useMembershipStore(s=>s.role)
  const {activeWorkspace}=useWorkspace()
  const location=useLocation()
  const navigate=useNavigate()
  const [state,setState]=useState<ExperienceState>(initial)
  const [dismissed,setDismissed]=useState(false)

  async function refresh(){
    if(!user?.id){setState({...initial,loading:false});return}
    setState(current=>({...current,loading:true,error:null}))
    const next=await detectExperienceState({userId:user.id,workspaceId:activeWorkspace?.id||null,role})
    setState({...next,loading:false})
    await upsertExperienceProfile({userId:user.id,workspaceId:next.workspaceId,role,isWorkspaceCreator:next.isWorkspaceCreator})
  }

  useEffect(()=>{void refresh()},[user?.id,activeWorkspace?.id,role])

  function launch(kind=state.recommendedExperience){
    if(!user?.id)return
    void recordExperienceEvent({workspaceId:state.workspaceId,userId:user.id,experienceKey:kind,eventName:'launched',route:location.pathname})
    if(kind==='workspace_setup')navigate('/workspace-setup')
    else if(kind==='product_tour')window.dispatchEvent(new CustomEvent('pmocorex:start-tour'))
    else navigate('/product-centre?tab=experience')
    void markFirstLoginComplete(user.id)
    setDismissed(true)
  }

  function dismissRecommendation(){
    if(user?.id){
      void recordExperienceEvent({workspaceId:state.workspaceId,userId:user.id,experienceKey:state.recommendedExperience,eventName:'dismissed',route:location.pathname})
      void markFirstLoginComplete(user.id)
    }
    setDismissed(true)
  }

  const value=useMemo(()=>({state,refresh,launch,dismissRecommendation}),[state])
  const showPrompt=!dismissed&&!state.loading&&state.isFirstLogin&&['/projects','/product-centre'].includes(location.pathname)

  return <ExperienceContext.Provider value={value}>
    {children}
    {showPrompt&&<div className="fixed inset-0 z-[120] grid place-items-center bg-[#102943]/50 p-5">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-7 shadow-2xl">
        <div className="text-xs font-bold uppercase tracking-[.18em] text-[#df5f41]">PMOCorex Experience Engine</div>
        <h2 className="mt-3 text-3xl font-semibold text-[#102943]">{state.recommendedExperience==='workspace_setup'?'Set up your organization':'Welcome to PMOCorex'}</h2>
        <p className="mt-3 text-sm leading-6 text-[#637683]">{state.recommendedReason}</p>
        <div className="mt-5 rounded-2xl bg-[#f5f8fa] p-4 text-sm text-[#536170]">
          {state.recommendedExperience==='workspace_setup'
            ? `Current readiness: ${[state.hasOrganization,state.hasWorkspace,state.hasPortfolio,state.hasProject,state.hasSchedule].filter(Boolean).length} of 5 setup conditions completed.`
            : 'The interactive tour will guide you through the Workspace Hub, portfolios, projects and project controls.'}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={dismissRecommendation} className="btn btn-ghost">Not now</button>
          <button onClick={()=>launch()} className="btn btn-gold">{state.recommendedExperience==='workspace_setup'?'Continue setup':'Start tour'}</button>
        </div>
      </div>
    </div>}
  </ExperienceContext.Provider>
}
