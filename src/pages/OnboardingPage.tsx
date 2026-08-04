import { ArrowLeft, PlayCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePMOCorexTour } from '@/components/tour/PMOCorexTourProvider'

export default function OnboardingPage(){
  const navigate=useNavigate(); const {startTour}=usePMOCorexTour()
  return <div className="min-h-screen bg-[#f6f5f1] p-6"><div className="mx-auto max-w-4xl">
    <button onClick={()=>navigate('/projects')} className="btn btn-ghost"><ArrowLeft size={15}/>Back to Workspace Hub</button>
    <section className="mt-5 rounded-[28px] border bg-white p-8 text-center">
      <div className="text-xs font-bold uppercase tracking-[.18em] text-[#df5f41]">Interactive onboarding</div>
      <h1 className="mt-3 text-4xl font-semibold text-[#102943]">Learn PMOCorex by using it</h1>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#6f7d89]">The guided tour will take you through the Workspace Hub, portfolios, projects, schedule, dashboard, reports, Help and Feedback. The app will highlight the exact item to click and continue automatically.</p>
      <button onClick={startTour} className="btn btn-gold mt-7"><PlayCircle size={16}/>Start interactive tour</button>
    </section>
  </div></div>
}
