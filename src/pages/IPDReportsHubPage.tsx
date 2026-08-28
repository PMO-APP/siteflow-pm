import { Link } from 'react-router-dom'
import { Home, Route, Wrench, Zap, ChevronRight, FileBarChart } from 'lucide-react'
import { useProjectStore } from '@/store/project'

const disciplines = [
  { key: 'housebuild', title: 'Housebuild', description: 'Building delivery and housebuild weekly reporting.', icon: Home },
  { key: 'infrastructure', title: 'Infrastructure', description: 'Roads, drainage, utilities and infrastructure reporting.', icon: Route },
  { key: 'mechanical', title: 'Mechanical', description: 'Mechanical services and installation reporting.', icon: Wrench },
  { key: 'electrical', title: 'Electrical', description: 'Electrical services and installation reporting.', icon: Zap },
  { key: 'combined', title: 'Combined IPD Report', description: 'Read and print the consolidated IPD reporting set across all four departments.', icon: FileBarChart },
]
export default function IPDReportsHubPage(){
 const {projectName}=useProjectStore()
 return <div className="min-h-screen -m-4 bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 text-[#102943]"><div className="max-w-6xl mx-auto space-y-7">
  <div><Link to="/app/reports" className="text-sm text-[#df5f41] hover:underline">← Reports</Link><div className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[#df5f41] font-semibold">Internal Project Delivery</div><h1 className="mt-2 text-3xl font-bold">IPD Reports</h1><p className="mt-2 text-sm text-[#65717c]">{projectName || 'Current project'} · Choose a discipline report.</p></div>
  <div className="grid gap-4 md:grid-cols-2">{disciplines.map(({key,title,description,icon:Icon})=><Link key={key} to={`/app/reports/ipd/${key}`} className="group rounded-2xl border border-[#dfe5ea] bg-white p-5 shadow-sm transition hover:border-[#ffb7a5] hover:shadow-md"><div className="flex items-center gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0ec] text-[#df5f41]"><Icon size={21}/></div><div className="min-w-0 flex-1"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-[#65717c]">{description}</p></div><ChevronRight size={19} className="text-[#9aa6b2] group-hover:text-[#df5f41]"/></div></Link>)}</div>
 </div></div>
}
