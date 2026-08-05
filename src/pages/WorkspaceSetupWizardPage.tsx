
import { ArrowLeft,ArrowRight,Check,Clock,Save,SkipForward } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import WorkspaceSetupProvider,{useWorkspaceSetup} from '@/experience/WorkspaceSetupProvider'
import OrganizationSetupStep from '@/experience/OrganizationSetupStep'
import WorkspaceCreationStep from '@/experience/WorkspaceCreationStep'
import BrandingSetupStep from '@/experience/BrandingSetupStep'

export default function WorkspaceSetupWizardPage(){
  return <WorkspaceSetupProvider><WorkspaceSetupWizard/></WorkspaceSetupProvider>
}

function WorkspaceSetupWizard(){
  const navigate=useNavigate()
  const {loading,saving,draft,steps,currentIndex,currentStep,progress,error,updateStepData,next,previous,skip,finish}=useWorkspaceSetup()
  if(loading)return <div className="grid min-h-screen place-items-center bg-[#f6f5f1]">Loading workspace setup…</div>
  if(!draft)return <div className="grid min-h-screen place-items-center bg-[#f6f5f1]">Workspace setup is unavailable.</div>

  const stepData=(draft.data[currentStep.key]||{}) as Record<string,unknown>
  const isLast=currentStep.key==='finish'

  return <div className="min-h-screen bg-[#f6f5f1] p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header className="rounded-[28px] border border-[#dfe3e7] bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[.18em] text-[#df5f41]">PMOCorex Workspace Setup</div>
            <h1 className="mt-2 text-3xl font-semibold text-[#102943]">Prepare your organization for project delivery</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f7d89]">Your progress saves automatically. You can leave and resume from this exact step later.</p>
          </div>
          <button onClick={()=>navigate('/product-centre')} className="btn btn-ghost">Exit setup</button>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6f7d89]"><span>Step {currentIndex+1} of {steps.length}</span><span>{progress}% complete</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e7edf0]"><div className="h-full rounded-full bg-[#173f5f] transition-all" style={{width:`${progress}%`}}/></div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[24px] border border-[#dfe3e7] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-[#80909a]">Setup journey</div>
          <div className="mt-4 space-y-2">{steps.map((step,index)=><button key={step.key} disabled={index>currentIndex&&!['completed','skipped'].includes(step.status)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${step.status==='current'?'border-[#173f5f] bg-[#eef5f8]':step.status==='completed'?'border-emerald-200 bg-emerald-50':step.status==='skipped'?'border-amber-200 bg-amber-50':'border-[#e3e8eb]'}`}>
            <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${step.status==='completed'?'bg-emerald-600 text-white':step.status==='current'?'bg-[#173f5f] text-white':'bg-[#edf2f4] text-[#71808c]'}`}>{step.status==='completed'?<Check size={15}/>:index+1}</span>
            <span><span className="block text-sm font-semibold text-[#26384a]">{step.shortTitle}</span><span className="text-[11px] capitalize text-[#87929b]">{step.status}</span></span>
          </button>)}</div>
          <div className="mt-5 rounded-xl bg-[#f6f8f9] p-3 text-xs text-[#6f7d89]"><Clock size={14} className="mr-2 inline"/>Last saved {new Date(draft.lastSavedAt).toLocaleTimeString()}</div>
        </aside>

        <main className="rounded-[24px] border border-[#dfe3e7] bg-white p-6 sm:p-8">
          <div className="text-xs font-bold uppercase tracking-[.16em] text-[#df5f41]">{currentStep.optional?'Optional step':'Required step'}</div>
          <h2 className="mt-2 text-3xl font-semibold text-[#102943]">{currentStep.title}</h2>
          <p className="mt-3 text-sm leading-6 text-[#6f7d89]">{currentStep.description}</p>

          <div className="mt-7">
            {isLast?<FinishPanel/>
              :currentStep.key==='organization'
                ?<OrganizationSetupStep data={stepData} onChange={updateStepData} onCreated={async organizationId=>{await updateStepData({organizationId})}}/>
              :currentStep.key==='workspace'
                ?<WorkspaceCreationStep
                    data={stepData}
                    organizationId={String((draft.data.organization as any)?.organizationId||'')}
                    onChange={updateStepData}
                    onCreated={async workspaceId=>{await updateStepData({workspaceId})}}
                  />
              :currentStep.key==='branding'
                ?<BrandingSetupStep
                    data={stepData}
                    workspaceId={String((draft.data.workspace as any)?.workspaceId||draft.workspaceId||'')}
                    onChange={updateStepData}
                    onSaved={async()=>{await updateStepData({brandingSaved:true})}}
                  />
              :<FrameworkStep stepKey={currentStep.key} data={stepData} onChange={updateStepData}/>}
          </div>

          {error&&<div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <button disabled={currentIndex===0||saving} onClick={()=>void previous()} className="btn btn-ghost"><ArrowLeft size={15}/>Back</button>
            <div className="flex flex-wrap gap-2">
              {currentStep.optional&&!isLast&&<button disabled={saving} onClick={()=>void skip()} className="btn btn-ghost"><SkipForward size={15}/>Skip for now</button>}
              {!isLast?<button disabled={saving} onClick={()=>void next(
                currentStep.key==='organization'
                  ?{valid:Boolean(stepData.organizationId),message:'Create or update the organization before continuing.'}
                :currentStep.key==='workspace'
                  ?{valid:Boolean(stepData.workspaceId),message:'Create or update the workspace before continuing.'}
                :currentStep.key==='branding'
                  ?{valid:Boolean(stepData.brandingSaved),message:'Save the workspace branding before continuing, or use Skip for now.'}
                  :{valid:true}
              )} className="btn btn-gold">{saving?<><Save size={15}/>Saving…</>:<>Save and continue<ArrowRight size={15}/></>}</button>:<button disabled={saving} onClick={async()=>{await finish();window.dispatchEvent(new CustomEvent('pmocorex:start-tour'));navigate('/projects')}} className="btn btn-gold">Continue to Product Tour<ArrowRight size={15}/></button>}
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
}

function FrameworkStep({stepKey,data,onChange}:{stepKey:string;data:Record<string,unknown>;onChange:(data:Record<string,unknown>)=>Promise<void>}){
  const labels:Record<string,string>={
    organization:'Organization details form will be connected in Milestone 2.',
    workspace:'Workspace creation form will be connected in Milestone 3.',
    branding:'Branding controls will be connected in Milestone 3.',
    team:'Team invitation flow will be connected in Milestone 4.',
    portfolio:'Portfolio creation will be connected in Milestone 5.',
    project:'Project creation will be connected in Milestone 6.',
    schedule:'Schedule import will be connected in Milestone 7.',
  }
  return <div className="rounded-2xl border border-dashed border-[#b9cbd5] bg-[#f8fafb] p-7">
    <div className="text-sm font-semibold text-[#26384a]">{labels[stepKey]}</div>
    <p className="mt-2 text-sm leading-6 text-[#6f7d89]">This Sprint 2 Milestone 1 delivers the complete wizard framework, autosave, resume, navigation, branching-ready state and progress tracking.</p>
    <label className="mt-5 block text-xs font-semibold text-[#52616d]">Setup note<div className="mt-2"><textarea className="form-control min-h-28" value={String(data.note||'')} onChange={e=>void onChange({note:e.target.value})} placeholder="Add a note to confirm autosave and resume behaviour."/></div></label>
  </div>
}

function FinishPanel(){
  return <div className="rounded-2xl bg-[#173f5f] p-8 text-white">
    <div className="text-sm uppercase tracking-[.18em] text-white/50">Workspace ready</div>
    <h3 className="mt-3 text-3xl font-semibold">Setup framework completed</h3>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Continue into the interactive PMOCorex product tour. The remaining setup forms will be connected milestone by milestone without changing this wizard structure.</p>
  </div>
}
