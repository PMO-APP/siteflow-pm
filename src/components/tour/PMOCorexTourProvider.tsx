import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'

const TOUR_VERSION = 'v2'
const ONBOARDING_META_KEY = 'pmocorex_onboarding_v2'
const tourKey = (userId?: string) => `pmocorex-guided-tour-${TOUR_VERSION}-${userId || 'user'}`
type OnboardingState = 'pending' | 'started' | 'completed' | 'skipped'

type TourStep = {
  id: string
  title: string
  body: string
  target?: string
  route?: string
  interaction?: boolean
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const STEPS: TourStep[] = [
  { id:'welcome', title:'Welcome to PMOCorex', body:'This guide will take you from the Workspace Hub into a live project so you can learn where the important controls are without needing someone beside you.', route:'/projects', placement:'center' },
  { id:'command', title:'All Project Command Center', body:'Use this workspace-level control room for cross-project health, delivery pressure, risks and executive intervention.', target:'[data-tour="all-project-command-center"]', route:'/projects', placement:'bottom' },
  { id:'portfolios', title:'Your portfolios', body:'Projects are grouped into delivery environments here. Use portfolios to organise and filter the workspace.', target:'[data-tour="portfolio-overview"]', route:'/projects', placement:'top' },
  { id:'focus', title:'Your work today', body:'This shows projects assigned, delegated or under your authority, plus active work and projects needing attention.', target:'[data-tour="my-work-today"]', route:'/projects', placement:'top' },
  { id:'open-project', title:'Enter a project', body:'Click Open on a project in the Project Register. The guide will continue inside that project automatically.', target:'[data-tour="project-open"]', route:'/projects', interaction:true, placement:'top' },

  { id:'project-command', title:'Project Command', body:'This is the project command/dashboard. Start here to understand the project position, progress, pressure and key control signals.', target:'[data-tour="nav-dashboard"]', route:'/app', placement:'right' },
  { id:'my-assignments', title:'My Assignments', body:'Click My Assignments now. This is where you see the specific actions, responsibilities and work items that belong to you in this project.', target:'[data-tour="nav-my-assignments"]', route:'/app', interaction:true, placement:'right' },
  { id:'communication', title:'Communication Command', body:'You are now inside My Assignments. Click the notification bell to see where alerts and messages are received. The full Notifications & Announcements centre is available from this communication area.', target:'[data-tour="communication-command"]', route:'/app/my-assignments', interaction:true, placement:'bottom' },
  { id:'schedule', title:'Schedule', body:'Click Schedule. It shows activities, programme status, dependencies and delivery pressure so you can see whether the project is tracking to plan.', target:'[data-tour="nav-schedule"]', route:'/app/my-assignments', interaction:true, placement:'right' },
  { id:'controls', title:'Project Controls', body:'Click Project Controls. This brings together the high-level controls used to manage delivery performance and exceptions.', target:'[data-tour="nav-project-controls"]', route:'/app/schedule', interaction:true, placement:'right' },
  { id:'journey', title:'Project Journey', body:'Click Project Journey. It tracks whether major lifecycle and handover gates have actually been satisfied, not just physical progress.', target:'[data-tour="nav-project-journey"]', route:'/app/project-controls', interaction:true, placement:'right' },
  { id:'documents', title:'Documents', body:'Click Documents. This is where project files, drawings and controlled records are kept. Your permissions determine what you can upload or change.', target:'[data-tour="nav-documents"]', route:'/app/project-journey', interaction:true, placement:'right' },
  { id:'risk', title:'Risk Register', body:'Click Risk Register. This is where project risks are recorded, scored, assigned and monitored.', target:'[data-tour="nav-risk"]', route:'/app/documents', interaction:true, placement:'right' },
  { id:'reports', title:'Reports', body:'Click Reports. PMOCorex uses this area for structured weekly, discipline and management reporting instead of disconnected spreadsheets and emails.', target:'[data-tour="nav-reports"]', route:'/app/risk', interaction:true, placement:'right' },
  { id:'profile', title:'Profile and replay guide', body:'Click your profile area. Your Profile contains account controls and the option to replay this guide whenever you need it.', target:'[data-tour="profile-menu"]', route:'/app/reports', interaction:true, placement:'right' },
  { id:'complete', title:'You are ready', body:'You now know how to move from the Workspace Hub into a project and find the main PMOCorex controls. Start with My Assignments, then use each project module as your work requires.', route:'/profile', placement:'center' },
]

type TourContextValue = { startTour: () => void; active: boolean }
const TourContext = createContext<TourContextValue>({ startTour: () => undefined, active:false })
export const usePMOCorexTour = () => useContext(TourContext)

export default function PMOCorexTourProvider({children}:{children:React.ReactNode}){
  const location=useLocation(); const navigate=useNavigate(); const user=useAuthStore(state=>state.user)
  const [active,setActive]=useState(false); const [index,setIndex]=useState(0)
  const [rect,setRect]=useState<DOMRect|null>(null); const step=STEPS[index]

  const startTour=useCallback(()=>{setIndex(0);setActive(true);navigate('/projects')},[navigate])

  const persistOnboardingState=useCallback(async(state:OnboardingState)=>{
    if(!user?.id)return
    localStorage.setItem(tourKey(user.id),state)
    try{
      await supabase.auth.updateUser({
        data:{
          [ONBOARDING_META_KEY]:state,
          pmocorex_onboarding_required: state === 'pending',
        },
      })
    }catch(error){
      console.warn('[PMOCorex onboarding] Could not persist account onboarding state:',error)
    }
  },[user?.id])

  useEffect(()=>{
    if(location.pathname!=='/projects'||!user?.id||active)return

    let cancelled=false
    let timer:number|undefined

    async function maybeStartInvitationOnboarding(){
      try{
        // Read the authenticated user directly rather than relying only on the
        // auth store. updateUser() during invitation acceptance may complete
        // before the store has received its USER_UPDATED event.
        const {data:{user:authUser},error}=await supabase.auth.getUser()
        if(error||!authUser||cancelled)return

        const accountState=String(authUser.user_metadata?.[ONBOARDING_META_KEY]||'')
        const required=authUser.user_metadata?.pmocorex_onboarding_required===true
        const localState=localStorage.getItem(tourKey(authUser.id))

        // Only an accepted invitation explicitly marked as pending can trigger
        // automatic onboarding. Login, refresh and future tour-version changes
        // therefore cannot restart the guide.
        if(accountState!=='pending'&&!required)return
        if(localState&&localState!=='pending')return

        timer=window.setTimeout(async()=>{
          if(cancelled)return
          // Mark started BEFORE opening the tour. A refresh halfway through
          // the guide must never auto-launch it again.
          localStorage.setItem(tourKey(authUser.id),'started')
          try{
            await supabase.auth.updateUser({
              data:{
                [ONBOARDING_META_KEY]:'started',
                pmocorex_onboarding_required:false,
              },
            })
          }catch(persistError){
            console.warn('[PMOCorex onboarding] Could not mark onboarding as started:',persistError)
          }
          if(!cancelled){setIndex(0);setActive(true)}
        },250)
      }catch(error){
        console.warn('[PMOCorex onboarding] Could not determine invitation onboarding state:',error)
      }
    }

    void maybeStartInvitationOnboarding()
    return()=>{
      cancelled=true
      if(timer)window.clearTimeout(timer)
    }
  },[location.pathname,user?.id,active])

  useEffect(()=>{
    if(!active||!step)return
    if(step.route && location.pathname!==step.route){ navigate(step.route); return }
    const update=()=>{
      const el=step.target?document.querySelector(step.target):null
      if(el){ el.scrollIntoView({behavior:'smooth',block:'center',inline:'center'}); setTimeout(()=>setRect(el.getBoundingClientRect()),250) }
      else setRect(null)
    }
    const timer=setTimeout(update,220)
    const observer=new MutationObserver(update); observer.observe(document.body,{subtree:true,childList:true,attributes:true})
    window.addEventListener('resize',update); window.addEventListener('scroll',update,true)
    return()=>{clearTimeout(timer);observer.disconnect();window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true)}
  },[active,index,location.pathname,navigate,step])

  useEffect(()=>{
    if(!active||!step?.target||!step?.interaction)return
    if(step.route && location.pathname!==step.route)return
    const timer=window.setTimeout(()=>{
      // If a role does not have this module in its navigation, do not trap the
      // user on a tour step they cannot complete.
      if(!document.querySelector(step.target!)){
        setIndex(i=>Math.min(i+1,STEPS.length-1))
      }
    },1400)
    return()=>window.clearTimeout(timer)
  },[active,index,location.pathname,step])

  useEffect(()=>{
    if(!active||!step?.interaction||!step.target)return
    const handler=(event:MouseEvent)=>{
      const target=(event.target as HTMLElement)?.closest(step.target!)
      if(target){
        setIndex(i=>Math.min(i+1,STEPS.length-1))
      }
    }
    document.addEventListener('click',handler,true); return()=>document.removeEventListener('click',handler,true)
  },[active,step])

  const finish=()=>{void persistOnboardingState('completed');setActive(false);setIndex(0);navigate('/projects')}
  const skip=()=>{void persistOnboardingState('skipped');setActive(false)}
  const next=()=>{ if(index===STEPS.length-1)finish(); else setIndex(index+1) }
  const previous=()=>setIndex(Math.max(0,index-1))

  const cardStyle=useMemo(()=>{
    if(!rect||step?.placement==='center')return {left:'50%',top:'50%',transform:'translate(-50%,-50%)'}
    const width=360,gap=18,estimatedCardHeight=330
    let left=Math.min(window.innerWidth-width-18,Math.max(18,rect.left))
    let top=rect.bottom+gap
    if(step.placement==='top')top=Math.max(18,rect.top-estimatedCardHeight-gap)
    if(step.placement==='right'){left=Math.min(window.innerWidth-width-18,rect.right+gap);top=Math.max(18,rect.top)}
    if(step.placement==='left'){left=Math.max(18,rect.left-width-gap);top=Math.max(18,rect.top)}
    if(top>window.innerHeight-estimatedCardHeight-18){
      top=Math.max(18,rect.top-estimatedCardHeight-gap)
    }
    return {left,top}
  },[rect,step])

  return <TourContext.Provider value={{startTour,active}}>{children}{active&&step&&<>
    {!rect ? (
      <div className="fixed inset-0 z-[200] bg-[#071726]/70" />
    ) : (
      <>
        <div className="fixed left-0 right-0 top-0 z-[200] bg-[#071726]/70" style={{height:Math.max(0,rect.top-8)}} />
        <div className="fixed bottom-0 left-0 right-0 z-[200] bg-[#071726]/70" style={{top:Math.min(window.innerHeight,rect.bottom+8)}} />
        <div className="fixed left-0 z-[200] bg-[#071726]/70" style={{top:Math.max(0,rect.top-8),height:rect.height+16,width:Math.max(0,rect.left-8)}} />
        <div className="fixed right-0 z-[200] bg-[#071726]/70" style={{top:Math.max(0,rect.top-8),height:rect.height+16,left:Math.min(window.innerWidth,rect.right+8)}} />
      </>
    )}
    {rect&&<div className="pointer-events-none fixed z-[201] rounded-2xl border-4 border-[#08B5A6] shadow-[0_0_0_8px_rgba(239,131,84,.22),0_0_40px_rgba(239,131,84,.8)] transition-all duration-300" style={{left:rect.left-8,top:rect.top-8,width:rect.width+16,height:rect.height+16}}/>}
    <div className="fixed z-[202] w-[min(360px,calc(100vw-32px))] rounded-[22px] border border-white/20 bg-white p-5 shadow-2xl" style={cardStyle as any}>
      <div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#05969B]">Getting started · {index+1}/{STEPS.length}</div><h2 className="mt-2 text-xl font-extrabold text-[#0B2A3C]">{step.title}</h2></div><button onClick={skip} className="rounded-lg p-1 text-[#87929b] hover:bg-[#eef3f4]" aria-label="Skip tour"><X size={17}/></button></div>
      <p className="mt-3 text-sm leading-6 text-[#607580]">{step.body}</p>
      {step.interaction&&<div className="mt-4 rounded-xl bg-[#E8F6F4] px-3 py-2 text-xs font-semibold text-[#05969B]">Click the highlighted item to continue.</div>}
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#e7edf0]"><div className="h-full bg-[#08B5A6] transition-all" style={{width:`${((index+1)/STEPS.length)*100}%`}}/></div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <button onClick={previous} disabled={index===0} className="btn btn-ghost disabled:opacity-30"><ArrowLeft size={14}/>Back</button>
        <div className="flex items-center gap-2">
          <button onClick={skip} className="btn btn-ghost">Skip</button>
          <button onClick={next} className="btn btn-gold">{index===STEPS.length-1?<><CheckCircle2 size={15}/>Start PMOCorex</>:<>Next<ArrowRight size={14}/></>}</button>
        </div>
      </div>
    </div>
  </>}</TourContext.Provider>
}
