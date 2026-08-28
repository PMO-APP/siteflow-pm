import { Link } from 'react-router-dom'
import { FileText, FileSpreadsheet, Brain, Send, LayoutTemplate, ChevronRight } from 'lucide-react'
import { useProjectStore } from '@/store/project'
const tools=[
 {title:'Executive Weekly Report',description:'Project-wide PMO weekly management report.',to:'/app/pmo-weekly-report',icon:FileText},
 {title:'Reporting Centre',description:'Executive reporting and consolidated project reporting.',to:'/app/executive-reporting',icon:FileSpreadsheet},
 {title:'Executive Narrative',description:'Management narrative and project intelligence.',to:'/app/executive-narrative',icon:Brain},
 {title:'Report Designer',description:'Configure report presentation and layouts.',to:'/app/report-designer',icon:LayoutTemplate},
 {title:'Report Distribution',description:'Manage report distribution and circulation.',to:'/app/report-distribution',icon:Send},
]
export default function PMOReportsHubPage(){const {projectName}=useProjectStore();return <div className="min-h-screen -m-4 bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 text-[#102943]"><div className="max-w-6xl mx-auto space-y-7"><div><Link to="/app/reports" className="text-sm text-[#df5f41] hover:underline">← Reports</Link><div className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[#df5f41] font-semibold">PMO & Executive</div><h1 className="mt-2 text-3xl font-bold">PMO / Executive Reports</h1><p className="mt-2 text-sm text-[#65717c]">{projectName || 'Current project'} · Management reporting tools in one place.</p></div><div className="grid gap-4 md:grid-cols-2">{tools.map(({title,description,to,icon:Icon})=><Link key={title} to={to} className="group rounded-2xl border border-[#dfe5ea] bg-white p-5 shadow-sm transition hover:border-[#ffb7a5] hover:shadow-md"><div className="flex items-center gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0ec] text-[#df5f41]"><Icon size={21}/></div><div className="min-w-0 flex-1"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-[#65717c]">{description}</p></div><ChevronRight size={19} className="text-[#9aa6b2] group-hover:text-[#df5f41]"/></div></Link>)}</div></div></div>}
