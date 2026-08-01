import { FormEvent, useEffect, useState } from 'react'
import { Building2, Palette, Save, ShieldCheck } from 'lucide-react'
import { useWorkspace } from '@/workspace/WorkspaceProvider'
import { updateWorkspaceBranding, updateWorkspaceProfile } from '@/workspace/workspaceService'

export default function WorkspaceSettingsPage() {
  const { activeWorkspace, refresh } = useWorkspace()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ name: '', industry: '', timezone: 'Africa/Lagos', currency: 'NGN', primaryColor: '#173f5f', secondaryColor: '#ef8354', reportFooter: '' })

  useEffect(() => {
    if (!activeWorkspace) return
    setForm({
      name: activeWorkspace.name,
      industry: activeWorkspace.settings.industry || '',
      timezone: activeWorkspace.settings.timezone,
      currency: activeWorkspace.settings.currency,
      primaryColor: activeWorkspace.branding.primaryColor,
      secondaryColor: activeWorkspace.branding.secondaryColor,
      reportFooter: activeWorkspace.branding.reportFooter || '',
    })
  }, [activeWorkspace])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!activeWorkspace) return
    setSaving(true); setMessage('')
    try {
      await Promise.all([
        updateWorkspaceProfile(activeWorkspace.id, form),
        updateWorkspaceBranding(activeWorkspace.id, form),
      ])
      await refresh()
      setMessage('Workspace settings saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save workspace settings.')
    } finally { setSaving(false) }
  }

  if (!activeWorkspace) return <div className="rounded-2xl border bg-white p-8">No workspace is available for this account.</div>

  const field = 'mt-2 w-full rounded-xl border border-[#d7e0e6] bg-white px-3.5 py-3 text-sm text-[#173f5f] outline-none focus:border-[#4d86a8]'
  return <div className="-m-4 min-h-screen bg-[#f6f5f1] p-4 sm:-m-6 sm:p-6 lg:p-8"><div className="mx-auto max-w-5xl space-y-5">
    <section className="rounded-[26px] border border-[#dfe3e7] bg-white p-7"><div className="flex items-start gap-4"><div className="rounded-2xl bg-[#eaf1f7] p-3 text-[#1f668f]"><Building2/></div><div><div className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#df5f41]">Tenant administration</div><h1 className="mt-2 text-3xl font-semibold text-[#102943]">Workspace settings</h1><p className="mt-2 text-sm text-[#6f7d89]">Manage the identity, regional defaults and brand layer for {activeWorkspace.name}.</p></div></div></section>
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-6"><div className="flex items-center gap-2 text-[#102943]"><ShieldCheck size={19}/><h2 className="font-semibold">Workspace profile</h2></div>
        <label className="mt-5 block text-xs font-semibold text-[#52616d]">Workspace name<input className={field} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label className="mt-4 block text-xs font-semibold text-[#52616d]">Industry<input className={field} value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})}/></label>
        <div className="mt-4 grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-[#52616d]">Timezone<input className={field} value={form.timezone} onChange={e=>setForm({...form,timezone:e.target.value})}/></label><label className="text-xs font-semibold text-[#52616d]">Currency<input className={field} value={form.currency} onChange={e=>setForm({...form,currency:e.target.value.toUpperCase()})}/></label></div>
      </section>
      <section className="rounded-[24px] border border-[#dfe3e7] bg-white p-6"><div className="flex items-center gap-2 text-[#102943]"><Palette size={19}/><h2 className="font-semibold">Workspace branding</h2></div>
        <div className="mt-5 grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-[#52616d]">Primary colour<input type="color" className={`${field} h-12 p-1`} value={form.primaryColor} onChange={e=>setForm({...form,primaryColor:e.target.value})}/></label><label className="text-xs font-semibold text-[#52616d]">Accent colour<input type="color" className={`${field} h-12 p-1`} value={form.secondaryColor} onChange={e=>setForm({...form,secondaryColor:e.target.value})}/></label></div>
        <label className="mt-4 block text-xs font-semibold text-[#52616d]">Report footer<textarea className={`${field} min-h-28`} value={form.reportFooter} onChange={e=>setForm({...form,reportFooter:e.target.value})}/></label>
      </section>
      <div className="lg:col-span-2 flex items-center justify-between rounded-2xl border border-[#dfe3e7] bg-white p-4"><span className="text-sm text-[#65717c]">{message}</span><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#173f5f] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"><Save size={16}/>{saving?'Saving…':'Save workspace'}</button></div>
    </form>
  </div></div>
}
