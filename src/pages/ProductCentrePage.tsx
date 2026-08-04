
import { useEffect,useMemo,useState } from 'react'
import { BookOpen,Search,MessageSquarePlus,Rocket,Sparkles,PlayCircle,Keyboard,LifeBuoy } from 'lucide-react'
import { useNavigate,useSearchParams } from 'react-router-dom'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { listHelpArticles,listReleaseNotes,recordHelpSearch } from '@/services/productExperienceService'
import type { HelpArticle,ReleaseNote } from '@/services/productExperienceTypes'

type Tab='home'|'help'|'updates'|'onboarding'|'shortcuts'

export default function ProductCentrePage(){
  const {activeWorkspace}=useWorkspace()
  const navigate=useNavigate()
  const [params,setParams]=useSearchParams()
  const [articles,setArticles]=useState<HelpArticle[]>([])
  const [updates,setUpdates]=useState<ReleaseNote[]>([])
  const [q,setQ]=useState('')
  const [selected,setSelected]=useState<HelpArticle|null>(null)
  const tab=(params.get('tab') as Tab)||'home'

  useEffect(()=>{
    if(!activeWorkspace)return
    Promise.all([listHelpArticles(activeWorkspace.id),listReleaseNotes(activeWorkspace.id)]).then(([a,u])=>{setArticles(a);setUpdates(u)})
  },[activeWorkspace?.id])

  const filtered=useMemo(()=>articles.filter(a=>`${a.title} ${a.summary} ${a.body} ${a.category}`.toLowerCase().includes(q.toLowerCase())),[articles,q])
  useEffect(()=>{if(activeWorkspace&&q.trim().length>2){const t=setTimeout(()=>void recordHelpSearch(activeWorkspace.id,q,filtered.length),600);return()=>clearTimeout(t)}},[q,filtered.length,activeWorkspace?.id])

  function openTab(next:Tab){setParams(next==='home'?{}:{tab:next})}

  return <div className="-m-4 min-h-screen bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 lg:p-8"><div className="mx-auto max-w-[1500px] space-y-5">
    <section className="rounded-[28px] border border-[#dfe3e7] bg-[#173f5f] p-8 text-white">
      <div className="text-xs uppercase tracking-[.2em] text-white/50">Product Centre</div>
      <h1 className="mt-3 text-4xl font-semibold">Learn, get help and shape SiteFlow PM.</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">Everything related to onboarding, documentation, product updates and support is available here.</p>
      <div className="relative mt-6 max-w-3xl"><Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18}/><input className="w-full rounded-2xl bg-white px-12 py-4 text-[#173f5f]" placeholder="How do I upload a schedule?" value={q} onChange={e=>{setQ(e.target.value);openTab('help')}}/></div>
    </section>

    <div className="flex flex-wrap gap-2 rounded-2xl border border-[#dfe3e7] bg-white p-2">
      {([['home','Home'],['help','Help'],['updates',"What's New"],['onboarding','Onboarding'],['shortcuts','Shortcuts']] as Array<[Tab,string]>).map(([value,label])=><button key={value} onClick={()=>openTab(value)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${tab===value?'bg-[#173f5f] text-white':'text-[#536170] hover:bg-[#eef3f4]'}`}>{label}</button>)}
    </div>

    {tab==='home'&&<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card icon={BookOpen} title="Help Centre" text="Search documentation and troubleshooting guides." action="Search Help" onClick={()=>openTab('help')}/>
      <Card icon={MessageSquarePlus} title="Feedback" text="Report an issue, ask a question or suggest an improvement." action="Submit Feedback" onClick={()=>navigate('/app/feedback?new=1')}/>
      <Card icon={Rocket} title="Complete Onboarding" text="Set up your workspace, portfolio, project, schedule and team." action="Continue Setup" onClick={()=>navigate('/app/onboarding')}/>
      <Card icon={Sparkles} title="What's New" text="See recent features, improvements and fixes." action="View Updates" onClick={()=>openTab('updates')}/>
      <Card icon={PlayCircle} title="Training & Tutorials" text="Follow practical guides for SiteFlow PM workflows." action="Browse Guides" onClick={()=>openTab('help')}/>
      <Card icon={Keyboard} title="Keyboard Shortcuts" text="Use Ctrl/Cmd + K to search and move around faster." action="View Shortcuts" onClick={()=>openTab('shortcuts')}/>
    </section>}

    {tab==='help'&&<section className="grid gap-5 lg:grid-cols-[340px_1fr]"><div className="rounded-[24px] border bg-white p-5"><h2 className="font-semibold text-[#102943]">Knowledge Base</h2><div className="mt-4 space-y-2">{filtered.map(a=><button key={a.id} onClick={()=>setSelected(a)} className="w-full rounded-xl border p-3 text-left hover:bg-[#f7f9fa]"><div className="text-[10px] uppercase tracking-wider text-[#87929b]">{a.category}</div><div className="mt-1 font-semibold">{a.title}</div><div className="mt-1 text-xs text-[#6f7d89]">{a.summary}</div></button>)}</div></div><article className="rounded-[24px] border bg-white p-7">{selected?<><div className="text-xs uppercase tracking-wider text-[#df5f41]">{selected.category}</div><h2 className="mt-2 text-3xl font-semibold text-[#102943]">{selected.title}</h2><div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-[#536170]">{selected.body}</div><button onClick={()=>navigate('/app/feedback?new=1')} className="btn btn-ghost mt-6"><MessageSquarePlus size={15}/>Still need help?</button></>:<div className="grid min-h-80 place-items-center text-center"><div><LifeBuoy className="mx-auto text-[#8aa0ad]"/><h2 className="mt-3 text-xl font-semibold">Select an article</h2><p className="mt-2 text-sm text-[#87929b]">Choose a guide or search for a workflow.</p></div></div>}</article></section>}

    {tab==='updates'&&<div className="space-y-4">{updates.map(i=><article key={i.id} className="rounded-[24px] border bg-white p-6"><div className="text-xs uppercase tracking-wider text-[#df5f41]">Version {i.version}</div><h2 className="mt-2 text-2xl font-semibold">{i.title}</h2><p className="mt-2 text-sm text-[#6f7d89]">{i.summary}</p><div className="mt-4 space-y-2">{i.items.map(x=><div key={x} className="flex gap-2 text-sm"><span>✓</span><span>{x}</span></div>)}</div></article>)}</div>}

    {tab==='onboarding'&&<section className="rounded-[24px] border bg-white p-7"><Rocket className="text-[#1f668f]"/><h2 className="mt-4 text-2xl font-semibold text-[#102943]">Complete your setup</h2><p className="mt-2 text-sm text-[#6f7d89]">Finish the guided workspace, portfolio, project, schedule and team setup.</p><button onClick={()=>navigate('/app/onboarding')} className="btn btn-gold mt-5">Open Onboarding</button></section>}

    {tab==='shortcuts'&&<section className="rounded-[24px] border bg-white p-7"><h2 className="text-2xl font-semibold text-[#102943]">Keyboard Shortcuts</h2><div className="mt-5 grid gap-3 md:grid-cols-2">{[['Ctrl/Cmd + K','Open command palette'],['Esc','Close dialogs and overlays'],['Arrow keys','Navigate Boardroom slides'],['Enter','Open selected command']].map(([key,text])=><div key={key} className="flex items-center justify-between rounded-xl border p-4"><kbd className="rounded-lg bg-[#eef3f4] px-3 py-2 text-xs font-bold">{key}</kbd><span className="text-sm text-[#536170]">{text}</span></div>)}</div></section>}
  </div></div>
}
function Card({icon:Icon,title,text,action,onClick}:{icon:any;title:string;text:string;action:string;onClick:()=>void}){return <button onClick={onClick} className="rounded-[22px] border bg-white p-6 text-left transition hover:-translate-y-1 hover:shadow-lg"><Icon className="text-[#1f668f]"/><h3 className="mt-4 text-lg font-semibold text-[#102943]">{title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-[#6f7d89]">{text}</p><div className="mt-4 text-sm font-semibold text-[#1f668f]">{action} →</div></button>}
