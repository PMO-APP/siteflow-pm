import { Link } from 'react-router-dom'
import { ArrowRight, LayoutGrid } from 'lucide-react'
import { useManagementAccess } from './data'

export default function ManagementIntelligenceCard() {
  const access = useManagementAccess()
  if (!access.permitted) return null
  return <Link data-tour="management-intelligence" to="/management-intelligence" className="group grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 rounded-[24px] border border-[#10334d] bg-[#10334d] p-5 text-white shadow-sm transition hover:bg-[#174662] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 sm:grid-cols-[auto_1fr_auto] sm:px-7">
    <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-[#a9e0d8]"><LayoutGrid size={23} aria-hidden /></span>
    <span><strong className="block text-lg">Management Intelligence</strong><span className="mt-0.5 block text-sm text-[#dce8ef]">{access.includeFinance ? 'See delivery, costs, site photos and management actions across projects.' : 'See delivery, site photos and management actions across projects.'}</span></span>
    <span className="col-start-2 inline-flex items-center gap-2 text-sm font-semibold text-[#a9e0d8] sm:col-start-3">Open dashboard <ArrowRight size={17} aria-hidden /></span>
  </Link>
}
