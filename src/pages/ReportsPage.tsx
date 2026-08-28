import { Link } from 'react-router-dom'
import { Building2, Calculator, HardHat, PenTool, FileBarChart, ChevronRight } from 'lucide-react'
import { useProjectStore } from '@/store/project'

const areas = [
  { title: 'IPD Reports', description: 'Housebuild, Infrastructure, Mechanical and Electrical weekly reports.', to: '/app/reports/ipd', icon: Building2 },
  { title: 'Design Reports', description: 'Design coordination, drawings, consultants, issues and weekly design reporting.', to: '/app/design-reports', icon: PenTool },
  { title: 'Costing Reports', description: 'Commercial, cost and financial reporting for this project.', to: '/app/costing', icon: Calculator },
  { title: 'HSE Reports', description: 'Health, safety and environment reporting for this project.', to: '/app/hse', icon: HardHat },
  { title: 'PMO / Executive Reports', description: 'Project-wide management and executive reporting.', to: '/app/reports/pmo', icon: FileBarChart },
]

export default function ReportsHubPage() {
  const { projectName } = useProjectStore()
  return <div className="min-h-screen -m-4 bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 text-[#102943]">
    <div className="max-w-6xl mx-auto space-y-7">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#df5f41] font-semibold">Project Reporting</div>
        <h1 className="mt-2 text-3xl font-bold">Reports</h1>
        <p className="mt-2 text-sm text-[#65717c]">{projectName || 'Current project'} · One place for every project report. All project teams can read reports; write access remains with the responsible department.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {areas.map(({title,description,to,icon:Icon}) => <Link key={title} to={to} className="group rounded-2xl border border-[#dfe5ea] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#ffb7a5] hover:shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0ec] text-[#df5f41]"><Icon size={21}/></div>
            <ChevronRight size={19} className="mt-2 text-[#9aa6b2] transition group-hover:translate-x-1 group-hover:text-[#df5f41]"/>
          </div>
          <h2 className="mt-5 text-lg font-bold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[#65717c]">{description}</p>
        </Link>)}
      </div>
      <div className="rounded-2xl border border-[#f2d4ca] bg-[#fff8f5] p-4 text-sm text-[#7d4a3c]">Reports are automatically scoped to the project you are currently inside. You do not need to select the project again.</div>
    </div>
  </div>
}
