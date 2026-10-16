import { Link } from 'react-router-dom'
import { ArrowUpRight, FolderOpen } from 'lucide-react'
import { useProjectStore } from '@/store/project'

type Folder = { title: string; description: string; to: string }
const design: Folder[] = [
  { title: 'Design Reports', description: 'Weekly design reporting and submitted report history.', to: '/app/design-reports?section=report' },
  { title: 'Drawing Register', description: 'Project drawings, revisions and approval status from Document Control.', to: '/app/design-reports?section=drawings' },
  { title: 'Consultant Management', description: 'Consultant updates, responsibilities and outstanding deliverables.', to: '/app/design-reports?section=consultants' },
  { title: 'Design Reviews', description: 'Drawing analysis and technical design review intelligence.', to: '/app/design-intelligence' },
  { title: 'Design Issues', description: 'Track open design constraints, blockers and required decisions.', to: '/app/design-reports?section=issues' },
  { title: 'Design Intelligence', description: 'Design risk analysis and drawing quality intelligence.', to: '/app/design-intelligence' },
]
const costing: Folder[] = [
  { title: 'Costing Reports', description: 'Weekly cost reporting and submission history.', to: '/app/costing/reports' },
  { title: 'Cost Overview', description: 'Project cost position and summary.', to: '/app/costing/overview' },
  { title: 'Contracts & Commitments', description: 'Contracts, commitments and commercial records.', to: '/app/costing/contracts' },
  { title: 'Payment Tracker', description: 'Payment requests, statuses and outstanding actions.', to: '/app/costing/payments' },
  { title: 'Variations', description: 'Commercial changes and variation status.', to: '/app/costing/variations' },
  { title: 'Procurement', description: 'Procurement commitments and delivery status.', to: '/app/costing/procurement' },
  { title: 'Financial Register', description: 'Project financial entries and records.', to: '/app/costing/financial-register' },
]
export default function DepartmentHubPage({ department }: { department: 'design' | 'costing' }) {
  const { projectName } = useProjectStore()
  const folders = department === 'design' ? design : costing
  const title = department === 'design' ? 'Design Management' : 'Costing Management'
  return <div className="min-h-screen -m-4 bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 text-[#102943]">
    <div className="max-w-6xl mx-auto space-y-7">
      <div><div className="text-[11px] uppercase tracking-[0.22em] text-[#df5f41] font-semibold">Department Workspace</div>
        <h1 className="mt-2 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-[#65717c]">{projectName || 'Current project'} · Open a folder to manage work or prepare a report.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{folders.map(folder => <Link key={folder.title} to={folder.to} className="group rounded-2xl border border-[#dfe5ea] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#ffb7a5] hover:shadow-md">
        <div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0ec] text-[#df5f41]"><FolderOpen size={22}/></div><ArrowUpRight size={19} className="text-[#9aa6b2] group-hover:text-[#df5f41]"/></div>
        <h2 className="mt-5 text-lg font-bold">{folder.title}</h2><p className="mt-2 text-sm leading-6 text-[#65717c]">{folder.description}</p>
      </Link>)}</div>
    </div>
  </div>
}
