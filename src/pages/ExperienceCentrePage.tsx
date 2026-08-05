
import { useEffect,useState } from 'react'
import { Activity,CheckCircle2,Compass,Play,Rocket,Users } from 'lucide-react'
import { useExperience } from '@/experience/ExperienceProvider'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { loadExperienceAnalytics } from '@/experience/experienceService'
export default function ExperienceCentrePage(){
  const {state,refresh,launch}=useExperience()
  const {activeWorkspace}=useWorkspace()
  const [analytics,setAnalytics]=useState<any>(null)
  useEffect(()=>{if(activeWorkspace)loadExperienceAnalytics(activeWorkspace.id).then(setAnalytics).catch(()=>setAnalytics(null))},[activeWorkspace?.id])
  const readiness=[
    ['Organization',state.hasOrganization],['Workspace',state.hasWorkspace],['Portfolio',state.hasPortfolio],
    ['Project',state.hasProject],['Schedule',state.hasSchedule]
  ]
  return <div className="space-y-5">
    <section className="rounded-[24px] border bg-white p-6">
      <div className="text-xs font-bold uppercase tracking-[.18em] text-[#df5f41]">PMOCorex Experience Engine</div>
      <h2 className="mt-2 text-3xl font-semibold text-[#102943]">Experience Centre</h2>
      <p className="mt-2 text-sm text-[#6f7d89]">Central onboarding, guided tours, contextual learning and adoption analytics.</p>
    </section>
    <section className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-[24px] border bg-white p-6">
        <div className="flex items-center gap-2"><Rocket className="text-[#1f668f]"/><h3 className="text-xl font-semibold">Recommended next experience</h3></div>
        <div className="mt-5 rounded-2xl bg-[#f4f8fa] p-5">
          <div className="text-xs uppercase tracking-wider text-[#71808c]">{state.recommendedExperience.replace(/_/g,' ')}</div>
          <div className="mt-2 text-lg font-semibold text-[#102943]">{state.recommendedReason}</div>
          <button onClick={()=>launch()} className="btn btn-gold mt-5"><Play size={15}/>Launch</button>
        </div>
      </div>
      <div className="rounded-[24px] border bg-white p-6">
        <div className="flex items-center gap-2"><CheckCircle2 className="text-[#1f668f]"/><h3 className="text-xl font-semibold">Workspace readiness</h3></div>
        <div className="mt-5 space-y-3">{readiness.map(([label,done]:any)=><div key={label} className="flex items-center justify-between rounded-xl border p-3"><span>{label}</span><span className={`badge ${done?'badge-green':'badge-muted'}`}>{done?'Ready':'Pending'}</span></div>)}</div>
      </div>
    </section>
    <section className="grid gap-4 md:grid-cols-4">
      <Metric icon={Users} label="Users tracked" value={analytics?.totalUsers||0}/>
      <Metric icon={Compass} label="Experiences started" value={analytics?.started||0}/>
      <Metric icon={CheckCircle2} label="Completed" value={analytics?.completed||0}/>
      <Metric icon={Activity} label="Completion rate" value={`${analytics?.completionRate||0}%`}/>
    </section>
    <button onClick={()=>void refresh()} className="btn btn-ghost">Refresh experience state</button>
  </div>
}
function Metric({icon:Icon,label,value}:{icon:any;label:string;value:any}){return <div className="rounded-2xl border bg-white p-5"><Icon size={18} className="text-[#1f668f]"/><div className="mt-4 text-3xl font-semibold text-[#102943]">{value}</div><div className="mt-1 text-xs font-semibold text-[#6f7d89]">{label}</div></div>}
