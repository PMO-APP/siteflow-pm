
import { HelpCircle,MessageSquarePlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
export default function ProductSupportDock(){const nav=useNavigate();return <div className="fixed bottom-5 right-5 z-40 flex gap-2"><button onClick={()=>nav('/app/help')} className="rounded-full border bg-white p-3 text-[#173f5f] shadow-lg" title="Help Centre"><HelpCircle size={20}/></button><button onClick={()=>nav('/app/feedback?new=1')} className="rounded-full bg-[#173f5f] p-3 text-white shadow-lg" title="Report an issue or suggest an improvement"><MessageSquarePlus size={20}/></button></div>}
