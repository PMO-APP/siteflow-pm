
import { createContext,useContext,useEffect,useMemo,useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { loadWorkspaceSetupDraft,saveWorkspaceSetupDraft } from './workspaceSetupService'
import type { WorkspaceSetupDraft,WorkspaceSetupStep,WorkspaceSetupStepKey,WizardValidationResult } from './workspaceSetupTypes'

const STEP_DEFINITIONS:Array<Omit<WorkspaceSetupStep,'status'>>=[
  {key:'organization',title:'Organization',shortTitle:'Organization',description:'Create the company account and operating profile.',optional:false},
  {key:'workspace',title:'Workspace',shortTitle:'Workspace',description:'Create the environment where portfolios and projects live.',optional:false},
  {key:'branding',title:'Branding',shortTitle:'Branding',description:'Configure the company identity used across PMOCorex.',optional:true},
  {key:'team',title:'Team',shortTitle:'Team',description:'Invite team members and assign roles.',optional:true},
  {key:'portfolio',title:'Portfolio',shortTitle:'Portfolio',description:'Create the first project portfolio.',optional:false},
  {key:'project',title:'Project',shortTitle:'Project',description:'Create the first project and assign ownership.',optional:false},
  {key:'schedule',title:'Schedule',shortTitle:'Schedule',description:'Upload or defer the baseline programme.',optional:true},
  {key:'finish',title:'Finish',shortTitle:'Finish',description:'Review setup and continue to the product tour.',optional:false},
]

type WorkspaceSetupContextValue={
  loading:boolean
  saving:boolean
  draft:WorkspaceSetupDraft|null
  steps:WorkspaceSetupStep[]
  currentIndex:number
  currentStep:WorkspaceSetupStep
  progress:number
  error:string|null
  updateStepData:(data:Record<string,unknown>)=>Promise<void>
  next:(validation?:WizardValidationResult)=>Promise<void>
  previous:()=>Promise<void>
  skip:()=>Promise<void>
  goTo:(step:WorkspaceSetupStepKey)=>Promise<void>
  finish:()=>Promise<void>
  reset:()=>Promise<void>
}

const Context=createContext<WorkspaceSetupContextValue|null>(null)
export const useWorkspaceSetup=()=>{
  const value=useContext(Context)
  if(!value)throw new Error('useWorkspaceSetup must be used within WorkspaceSetupProvider')
  return value
}

function createDraft(userId:string,workspaceId:string|null):WorkspaceSetupDraft{
  const now=new Date().toISOString()
  return {userId,workspaceId,currentStep:'organization',completedSteps:[],skippedSteps:[],data:{},startedAt:now,lastSavedAt:now,completedAt:null}
}

export default function WorkspaceSetupProvider({children}:{children:React.ReactNode}){
  const user=useAuthStore(s=>s.user)
  const {activeWorkspace}=useWorkspace()
  const [draft,setDraft]=useState<WorkspaceSetupDraft|null>(null)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState<string|null>(null)

  useEffect(()=>{
    let active=true
    async function load(){
      if(!user?.id){setLoading(false);return}
      try{
        setLoading(true)
        const saved=await loadWorkspaceSetupDraft(user.id,activeWorkspace?.id||null)
        if(active)setDraft(saved||createDraft(user.id,activeWorkspace?.id||null))
      }catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load setup progress.')}
      finally{if(active)setLoading(false)}
    }
    void load()
    return()=>{active=false}
  },[user?.id,activeWorkspace?.id])

  const currentIndex=Math.max(0,STEP_DEFINITIONS.findIndex(s=>s.key===draft?.currentStep))
  const steps=useMemo(()=>STEP_DEFINITIONS.map((step,index)=>({
    ...step,
    status: draft?.completedSteps.includes(step.key)?'completed':
      draft?.skippedSteps.includes(step.key)?'skipped':
      index===currentIndex?'current':index<currentIndex?'completed':'pending'
  } as WorkspaceSetupStep)),[draft,currentIndex])
  const currentStep=steps[currentIndex]||steps[0]
  const progress=Math.round(((draft?.completedSteps.length||0)+(draft?.skippedSteps.length||0))/STEP_DEFINITIONS.length*100)

  async function persist(nextDraft:WorkspaceSetupDraft){
    setSaving(true);setError(null)
    try{await saveWorkspaceSetupDraft(nextDraft);setDraft({...nextDraft,lastSavedAt:new Date().toISOString()})}
    catch(e){setError(e instanceof Error?e.message:'Unable to save setup progress.')}
    finally{setSaving(false)}
  }

  async function updateStepData(data:Record<string,unknown>){
    if(!draft)return
    await persist({...draft,data:{...draft.data,[draft.currentStep]:{...(draft.data[draft.currentStep] as Record<string,unknown>||{}),...data}}})
  }

  async function goTo(step:WorkspaceSetupStepKey){
    if(!draft)return
    await persist({...draft,currentStep:step})
  }

  async function next(validation:WizardValidationResult={valid:true}){
    if(!draft||!validation.valid){if(validation.message)setError(validation.message);return}
    const nextIndex=Math.min(currentIndex+1,STEP_DEFINITIONS.length-1)
    await persist({...draft,currentStep:STEP_DEFINITIONS[nextIndex].key,completedSteps:Array.from(new Set([...draft.completedSteps,draft.currentStep])),skippedSteps:draft.skippedSteps.filter(s=>s!==draft.currentStep)})
  }

  async function previous(){
    if(!draft)return
    const index=Math.max(0,currentIndex-1)
    await persist({...draft,currentStep:STEP_DEFINITIONS[index].key})
  }

  async function skip(){
    if(!draft||!currentStep.optional)return
    const nextIndex=Math.min(currentIndex+1,STEP_DEFINITIONS.length-1)
    await persist({...draft,currentStep:STEP_DEFINITIONS[nextIndex].key,skippedSteps:Array.from(new Set([...draft.skippedSteps,draft.currentStep]))})
  }

  async function finish(){
    if(!draft)return
    await persist({...draft,currentStep:'finish',completedSteps:Array.from(new Set([...draft.completedSteps,'finish'])),completedAt:new Date().toISOString()})
  }

  async function reset(){
    if(!user?.id)return
    await persist(createDraft(user.id,activeWorkspace?.id||null))
  }

  return <Context.Provider value={{loading,saving,draft,steps,currentIndex,currentStep,progress,error,updateStepData,next,previous,skip,goTo,finish,reset}}>{children}</Context.Provider>
}
