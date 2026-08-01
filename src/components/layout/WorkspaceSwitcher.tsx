import { Building2, ChevronDown } from 'lucide-react'
import { useWorkspace } from '@/workspace/WorkspaceProvider'

export default function WorkspaceSwitcher() {
  const { activeWorkspace, workspaces, switchWorkspace, loading } = useWorkspace()

  if (loading) return <div className="h-10 animate-pulse rounded-xl bg-white/10" />
  if (!activeWorkspace) return null

  return (
    <label className="relative block">
      <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/65" size={15} />
      <select
        aria-label="Active workspace"
        value={activeWorkspace.id}
        onChange={event => switchWorkspace(event.target.value)}
        className="w-full appearance-none rounded-xl border border-white/15 bg-white/10 py-2.5 pl-9 pr-8 text-xs font-semibold text-white outline-none focus:border-white/35"
      >
        {workspaces.map(workspace => <option className="text-[#173f5f]" key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60" size={14} />
    </label>
  )
}
