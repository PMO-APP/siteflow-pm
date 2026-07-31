import { Clock3, History, Sparkles, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWorkspacePersonalization } from '@/hooks/useWorkspacePersonalization'
import type { PersonalItem } from '@/services/personalization'

export default function PersonalWorkspacePanel() {
  const navigate = useNavigate()
  const { recentItems, favorites, toggleFavorite, isLoading } = useWorkspacePersonalization()
  const continueItem = recentItems[0]
  const open = (item: PersonalItem) => navigate(item.route)
  if (isLoading || (!continueItem && favorites.length === 0)) return null
  return <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
    <div className="hub-panel p-6 sm:p-7">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#6d8396]"><Sparkles size={14}/> Continue working</div>
      {continueItem ? <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-[#dbe5ee] bg-[#f8fbfc] p-4">
        <button className="min-w-0 flex-1 text-left" onClick={() => open(continueItem)}><div className="truncate font-extrabold text-[#173f5f]">{continueItem.title}</div><div className="mt-1 truncate text-sm text-[#6d7f8b]">{continueItem.subtitle || continueItem.projectName || 'Resume your latest workspace item'}</div></button>
        <button onClick={() => toggleFavorite(continueItem)} className="rounded-xl p-2 text-[#d86335] hover:bg-white" title="Add to favorites"><Star size={18}/></button>
      </div> : <p className="mt-4 text-sm text-[#6d7f8b]">Open a project or record and it will appear here.</p>}
      {recentItems.length > 1 && <div className="mt-5"><div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#173f5f]"><History size={15}/> Recently viewed</div><div className="grid gap-2 sm:grid-cols-2">{recentItems.slice(1,5).map(item => <button key={item.id} onClick={() => open(item)} className="rounded-xl border border-[#e1e9ee] px-3 py-3 text-left hover:bg-[#f8fbfc]"><div className="truncate text-sm font-bold text-[#173f5f]">{item.title}</div><div className="mt-1 truncate text-xs text-[#78909b]">{item.projectName || item.itemType}</div></button>)}</div></div>}
    </div>
    <div className="hub-panel p-6 sm:p-7"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#6d8396]"><Star size={14}/> Favorites</div>{favorites.length ? <div className="mt-4 space-y-2">{favorites.slice(0,6).map(item => <button key={item.id} onClick={() => open(item)} className="flex w-full items-center gap-3 rounded-xl border border-[#e1e9ee] px-3 py-3 text-left hover:bg-[#f8fbfc]"><Clock3 size={15} className="text-[#2f6f91]"/><span className="min-w-0 flex-1 truncate text-sm font-bold text-[#173f5f]">{item.title}</span></button>)}</div> : <p className="mt-4 text-sm leading-6 text-[#6d7f8b]">Pin frequently used projects, pages, and records from the command palette.</p>}</div>
  </section>
}
