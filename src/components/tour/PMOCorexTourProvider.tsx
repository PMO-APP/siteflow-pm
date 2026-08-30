import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

const TOUR_VERSION = 'v2'
const tourKey = (userId?: string) => `pmocorex-guided-tour-${TOUR_VERSION}-${userId || 'user'}`

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
  { id:'welcome', title:'Welcome to PMOCorex', body:'This short guide shows you where work starts, how to enter a project, and where to find the controls relevant to your responsibilities.', route:'/projects', placement:'center' },
  { id:'command', title:'All Project Command Center', body:'This workspace-level view brings together cross-project health, delivery pressure, risk and executive intervention signals.', target:'[data-tour="all-project-command-center"]', route:'/projects', placement:'bottom' },
  { id:'portfolios', title:'Your portfolios', body:'Projects are organised into delivery environments here. Portfolio cards resize automatically as your workspace grows.', target:'[data-tour="portfolio-overview"]', route:'/projects', placement:'top' },
  { id:'focus', title:'Your work today', body:'See projects assigned or temporarily delegated to you, active work and projects that need attention.', target:'[data-tour="my-work-today"]', route:'/projects', placement:'top' },
  { id:'projects', title:'Open a project', body:'Use the Project Register to enter a project and work with its live schedule, controls, documents, risks and reports.', target:'[data-tour="project-register"]', route:'/projects', placement:'top' },
  { id:'permissions', title:'Controls follow your responsibility', body:'PMOCorex shows the information you need while editing rights follow your role, project assignment and temporary delegations.', route:'/projects', placement:'center' },
  { id:'complete', title:'You are ready', body:'Start with one of your assigned projects. You can replay this guide at any time from your Profile page.', route:'/projects', placement:'center' },
]

type TourContextValue = { startTour: () => void; active: boolean }
const TourContext = createContext<TourContextValue>({ startTour: () => undefined, active:false })
export const usePMOCorexTour = () => useContext(TourContext)

export default function PMOCorexTourProvider({children}:{children:React.ReactNode}){
  const location=useLocation(); const navigate=useNavigate(); const user=useAuthStore(state=>state.user)
  const [active,setActive]=useState(false); const [index,setIndex]=useState(0)
  const [rect,setRect]=useState<DOMRect|null>(null); const step=STEPS[index]

  const startTour=useCallback(()=>{setIndex(0);setActive(true);navigate('/projects')},[navigate])

  useEffect(()=>{
    if(location.pathname==='/projects' && !localStorage.getItem(tourKey(user?.id))){
      const timer=setTimeout(()=>setActive(true),700); return()=>clearTimeout(timer)
    }
  },[location.pathname])

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
    if(!active||!step?.interaction||!step.target)return
    const handler=(event:MouseEvent)=>{
      const target=(event.target as HTMLElement)?.closest(step.target!)
      if(target){
        setIndex(i=>Math.min(i+1,STEPS.length-1))
      }
    }
    document.addEventListener('click',handler,true); return()=>document.removeEventListener('click',handler,true)
  },[active,step])

  const finish=()=>{localStorage.setItem(tourKey(user?.id),'completed');setActive(false);setIndex(0);navigate('/projects')}
  const skip=()=>{localStorage.setItem(tourKey(user?.id),'skipped');setActive(false)}
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
